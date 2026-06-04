---
id: A-009
title: "services/blockchain_client.py — base con web3.py + ABIs"
owner: "Sandro"
backup: "junior"
effort: "2 h"
priority: P0
status: pending
depends_on: [A-002, B-015]
sprint: 1
layer: agents
---

# A-009 · `blockchain_client.py` — fundamento

## Por qué importa
Toda la API y Hermes pasan por este cliente para hablar con la blockchain. Si arrancamos con buen fundamento (carga de ABIs, signer custodial, reintentos, manejo de errores), las tareas A-010 a A-013 son agregar métodos. Si arrancamos mal, refactorizamos todo el sprint.

## Conceptos clave
- **`web3.py`**: el equivalente a ethers en Python. La v6+ trae soporte async y mejor typing.
- **ABI loading**: el cliente lee `shared/abis/*.json` para construir contratos. Esa es la fuente de verdad versionada.
- **Signer custodial**: en Sprint 1, la API firma con una sola clave (`SIGNER_PRIVATE_KEY`). Sprint 2+ pasa a wallet del ciudadano.
- **Async**: `AsyncWeb3` (con `AsyncHTTPProvider`) evita bloquear el event loop de FastAPI.
- **Reintentos**: `tenacity` o equivalente. zkTanenbaum puede flaquear → 3 intentos con backoff exponencial.

## Pre-requisitos
- [ ] [A-002](./A-002-config-pydantic-settings.md) cerrada.
- [ ] [B-015](../../blockchain/docs/B-015-script-deploy-copy-abis.md) cerrada (ABIs en `shared/abis/`).
- [ ] `agents/.env` con `CITIZEN_REGISTRY_ADDRESS`, `VOTE_CONTRACT_ADDRESS`, `SIGNER_PRIVATE_KEY`.

## Paso a paso

### 1. Agregar `tenacity` a deps
```toml
# en pyproject.toml [project.dependencies]
"tenacity>=8.0",
```

```bash
pip install tenacity
```

### 2. Crear `api/services/blockchain_client.py`
```python
"""Cliente blockchain async — lee ABIs y wraps llamadas a CitizenRegistry + Vote.

Diseño:
- AsyncWeb3 con HTTP provider. SSE/WebSocket en Sprint 2+.
- ABIs leídos desde shared/abis/.
- Signer custodial cargado desde SIGNER_PRIVATE_KEY.
- Reintentos: 3 intentos backoff exp, solo para errores transient (timeout, 5xx).
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from eth_account import Account
from eth_account.signers.local import LocalAccount
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential
from web3 import AsyncHTTPProvider, AsyncWeb3
from web3.contract import AsyncContract
from web3.exceptions import (
    BlockNotFound,
    ContractLogicError,
    TimeExhausted,
    TransactionNotFound,
)

from api.config import get_settings

logger = logging.getLogger(__name__)

SHARED_ABIS_DIR = Path(__file__).resolve().parents[3] / "shared" / "abis"


class BlockchainError(RuntimeError):
    """Error genérico de la capa blockchain (no expuesto a clientes con detalles internos)."""


class CitizenAlreadyRegistered(BlockchainError):
    pass


class AlreadyVoted(BlockchainError):
    pass


class CitizenNotInRegistry(BlockchainError):
    pass


class ProposalNotActive(BlockchainError):
    pass


class ProposalExpired(BlockchainError):
    pass


def _load_abi(name: str) -> list[dict[str, Any]]:
    path = SHARED_ABIS_DIR / f"{name}.json"
    if not path.exists():
        raise BlockchainError(
            f"ABI no encontrado: {path}. Correr blockchain/scripts/deploy.ts (B-019)."
        )
    return json.loads(path.read_text())["abi"]


# Excepciones que SI reintentamos (transient)
_TRANSIENT_ERRORS = (TimeExhausted, BlockNotFound, TransactionNotFound, ConnectionError)


def _retry_transient():
    return retry(
        retry=retry_if_exception_type(_TRANSIENT_ERRORS),
        wait=wait_exponential(multiplier=1, min=1, max=15),
        stop=stop_after_attempt(3),
        reraise=True,
    )


class BlockchainClient:
    def __init__(self) -> None:
        self._settings = get_settings()
        self._w3: AsyncWeb3 | None = None
        self._signer: LocalAccount | None = None
        self._registry: AsyncContract | None = None
        self._vote: AsyncContract | None = None

    async def initialize(self) -> None:
        """Conexión, validación de chain y carga de contratos. Llamar al startup
        del API (hook lifespan en FastAPI)."""
        s = self._settings
        self._w3 = AsyncWeb3(AsyncHTTPProvider(s.rpc_url, request_kwargs={"timeout": 30}))
        if not await self._w3.is_connected():
            raise BlockchainError(f"RPC no responde: {s.rpc_url}")

        on_chain_id = await self._w3.eth.chain_id
        if on_chain_id != s.chain_id:
            raise BlockchainError(
                f"chain_id mismatch: esperado {s.chain_id}, RPC dice {on_chain_id}"
            )

        if s.signer_private_key is None:
            raise BlockchainError("SIGNER_PRIVATE_KEY no configurado")
        self._signer = Account.from_key(s.signer_private_key.get_secret_value())

        if not s.citizen_registry_address or not s.vote_contract_address:
            raise BlockchainError(
                "CITIZEN_REGISTRY_ADDRESS o VOTE_CONTRACT_ADDRESS no configurado"
            )

        reg_abi = _load_abi("CitizenRegistry")
        vote_abi = _load_abi("Vote")
        self._registry = self._w3.eth.contract(
            address=AsyncWeb3.to_checksum_address(s.citizen_registry_address),
            abi=reg_abi,
        )
        self._vote = self._w3.eth.contract(
            address=AsyncWeb3.to_checksum_address(s.vote_contract_address),
            abi=vote_abi,
        )

        logger.info(
            "blockchain_client initialized",
            extra={
                "chain_id": on_chain_id,
                "signer": self._signer.address,
                "registry": self._registry.address,
                "vote": self._vote.address,
            },
        )

    # ---------- helpers ----------
    @property
    def w3(self) -> AsyncWeb3:
        if self._w3 is None:
            raise BlockchainError("initialize() no llamado")
        return self._w3

    @property
    def signer(self) -> LocalAccount:
        if self._signer is None:
            raise BlockchainError("initialize() no llamado")
        return self._signer

    @property
    def registry(self) -> AsyncContract:
        if self._registry is None:
            raise BlockchainError("initialize() no llamado")
        return self._registry

    @property
    def vote(self) -> AsyncContract:
        if self._vote is None:
            raise BlockchainError("initialize() no llamado")
        return self._vote

    def explorer_tx(self, tx_hash: str) -> str:
        # zkTanenbaum explorer URL pattern
        base = "https://explorer-zk.tanenbaum.io"
        return f"{base}/tx/{tx_hash}"

    @_retry_transient()
    async def send_signed(
        self,
        fn,
        gas: int = 500_000,
    ) -> dict[str, Any]:
        """Helper para mandar una tx firmada con el signer custodial.

        fn: una función de contrato ya con args, ej. self.registry.functions.register(id, name)
        """
        nonce = await self.w3.eth.get_transaction_count(self.signer.address)
        gas_price = await self.w3.eth.gas_price
        tx = await fn.build_transaction({
            "from": self.signer.address,
            "nonce": nonce,
            "gas": gas,
            "gasPrice": gas_price,
        })
        signed = self.signer.sign_transaction(tx)
        tx_hash = await self.w3.eth.send_raw_transaction(signed.rawTransaction)
        rcpt = await self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        if rcpt["status"] != 1:
            raise BlockchainError(f"tx reverted: {tx_hash.hex()}")
        return {
            "tx_hash": tx_hash.hex(),
            "block_number": rcpt["blockNumber"],
            "gas_used": rcpt["gasUsed"],
        }


# Singleton (inicializado en lifespan)
_client: BlockchainClient | None = None


async def get_blockchain_client() -> BlockchainClient:
    global _client
    if _client is None:
        _client = BlockchainClient()
        await _client.initialize()
    return _client


async def reset_blockchain_client() -> None:
    """Solo para tests."""
    global _client
    _client = None
```

### 3. Pruebito manual
```bash
cd agents
python -c "
import asyncio
from api.services.blockchain_client import get_blockchain_client

async def main():
    c = await get_blockchain_client()
    print('signer:', c.signer.address)
    print('total citizens:', await c.registry.functions.totalCitizens().call())

asyncio.run(main())
"
```

Esperado:
```
signer: 0x...
total citizens: 0   (o N si ya hubo registros)
```

### 4. Commit
```bash
git add agents/api/services/blockchain_client.py agents/pyproject.toml
git commit -m "feat(agents): blockchain_client base (web3.py async + tenacity) (A-009)"
```

## Verificación / Definition of Done

- ✅ `initialize()` falla rápido si falta env vars (no crashea más tarde).
- ✅ `chain_id` se valida contra el RPC.
- ✅ ABIs se cargan desde `shared/abis/`.
- ✅ Excepciones custom (`CitizenAlreadyRegistered`, etc.) declaradas para que las rutas las puedan capturar.

## Errores comunes

- **`AsyncHTTPProvider` connect timeout**
  Subir `request_kwargs={"timeout": 30}` o más. zkTanenbaum puede ser lento.

- **`AttributeError: 'AsyncContract' object has no attribute 'functions'`**
  Probable: ABI mal cargado o web3 < 6.15. Confirmá la versión.

- **`ValueError: not a checksum address`**
  Las direcciones en el `.env` deben estar en checksum (ej. `0xAbCd…`). Aplicar `to_checksum_address` antes de usarlas.

- **Tx revierte sin razón clara**
  Probable revert de Solidity con custom error. web3.py 6.x devuelve el ABI decode si tenés el ABI del contrato cargado.

## Lecturas
- [web3.py async docs](https://web3py.readthedocs.io/en/stable/web3.eth.account.html)
- [tenacity retry patterns](https://tenacity.readthedocs.io/)
- [`blockchain/docs/B-015`](../../blockchain/docs/B-015-script-deploy-copy-abis.md)

## Notas para revisor
- ⚠️ `signer_private_key` se accede via `.get_secret_value()`. NUNCA `repr(self._signer.key)`.
- Confirmar que `send_signed` espera ≥2 confirmaciones implícitamente (vía `wait_for_transaction_receipt`). zkTanenbaum suele responder en 1-2 bloques.
- Reutilizar `_TRANSIENT_ERRORS` en otros lugares: no expandir la lista sin discutirlo.
