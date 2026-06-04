---
id: A-010
title: "blockchain_client.register_citizen()"
owner: "Sandro"
backup: "junior"
effort: "1 h"
priority: P0
status: pending
depends_on: [A-009, A-003]
sprint: 1
layer: agents
---

# A-010 · `register_citizen` en el cliente

## Por qué importa
Este método es **el único camino** para registrar a un ciudadano on-chain. Recibe `dni + full_name`, computa el hash, firma la tx y descarta el DNI inmediatamente. Si el método deja al DNI vivo demasiado tiempo o lo loguea, rompemos T2 del threat model.

## Conceptos clave
- **Idempotencia**: si el ciudadano ya está registrado, no es un error fatal — la API puede devolver el `tx_hash` del registro previo (Sprint 2) o un código `ALREADY_REGISTERED`.
- **Custom error decoding**: si el contrato revierte con `CitizenAlreadyRegistered(bytes32)`, web3.py 6+ decodifica el error si tiene el ABI.

## Pre-requisitos
- [ ] [A-009](./A-009-blockchain-client-setup.md), [A-003](./A-003-citizen-hash-helper.md) cerradas.

## Paso a paso

### 1. Agregar al `BlockchainClient` en `blockchain_client.py`

```python
from api.services.citizen_hash import citizen_id, citizen_id_hex

class BlockchainClient:
    ...

    async def register_citizen(self, dni: str, full_name: str) -> dict[str, Any]:
        """Hashea, registra, retorna metadata. El DNI se descarta.

        Returns: {
            "citizen_id": "0x...",
            "normalized_name": "JUAN PEREZ",
            "tx_hash": "0x...",
            "block_number": 12345,
            "explorer_url": "https://..."
        }
        """
        from api.services.citizen_hash import normalize_name

        # 1. Computar hash. DNI vive solo en este scope local.
        cid_bytes = citizen_id(dni, full_name, self._settings.public_salt)
        cid_hex = "0x" + cid_bytes.hex()
        normalized = normalize_name(full_name)

        # 2. Early-out: si ya está registrado, no gastamos gas
        is_reg = await self.registry.functions.isRegistered(cid_bytes).call()
        if is_reg:
            raise CitizenAlreadyRegistered(
                f"citizen_id ya registrado: {cid_hex}"
            )

        # 3. Build + firma + send
        fn = self.registry.functions.register(cid_bytes, normalized)
        try:
            result = await self.send_signed(fn, gas=200_000)
        except ContractLogicError as e:
            # decodificar custom error si es posible
            msg = str(e)
            if "CitizenAlreadyRegistered" in msg:
                raise CitizenAlreadyRegistered(cid_hex) from e
            raise BlockchainError(f"register revert: {msg}") from e

        return {
            "citizen_id": cid_hex,
            "normalized_name": normalized,
            "tx_hash": result["tx_hash"],
            "block_number": result["block_number"],
            "explorer_url": self.explorer_tx(result["tx_hash"]),
        }

    async def is_citizen_registered(self, citizen_id_hex: str) -> bool:
        cid = bytes.fromhex(citizen_id_hex[2:])
        return await self.registry.functions.isRegistered(cid).call()

    async def get_citizen(self, citizen_id_hex: str) -> dict[str, Any] | None:
        cid = bytes.fromhex(citizen_id_hex[2:])
        try:
            c = await self.registry.functions.getCitizen(cid).call()
        except ContractLogicError:
            return None
        return {
            "id": "0x" + c[0].hex(),
            "normalized_name": c[1],
            "wallet": c[2],
            "registered_at": c[3],
            "active": c[4],
        }
```

### 2. Cuidado con logs
**No loguear** `dni` ni `full_name` originales. Loggear solo:
- `citizen_id` (hash, no PII).
- `tx_hash`.
- el `normalized_name` se loguea solo si Tatiana lo aprueba (es PII débil pero PII).

### 3. Test smoke (requiere hardhat local corriendo)
```python
# tests/test_blockchain_client_register_smoke.py
import pytest
from api.services.blockchain_client import (
    CitizenAlreadyRegistered,
    get_blockchain_client,
    reset_blockchain_client,
)


@pytest.mark.integration
@pytest.mark.asyncio
async def test_register_smoke():
    await reset_blockchain_client()
    c = await get_blockchain_client()
    result = await c.register_citizen("12345678", "JUAN PEREZ")
    assert result["citizen_id"].startswith("0x")
    assert len(result["citizen_id"]) == 66
    assert result["normalized_name"] == "JUAN PEREZ"
    assert result["tx_hash"].startswith("0x")

    # registrar de nuevo → error
    with pytest.raises(CitizenAlreadyRegistered):
        await c.register_citizen("12345678", "JUAN PEREZ")
```

```bash
pytest tests/test_blockchain_client_register_smoke.py -m integration -v
```

### 4. Commit
```bash
git add agents/api/services/blockchain_client.py agents/tests/test_blockchain_client_register_smoke.py
git commit -m "feat(agents): blockchain_client.register_citizen (A-010)"
```

## Verificación / Definition of Done

- ✅ Test smoke pasa contra hardhat local con contratos desplegados.
- ✅ DNI NO aparece en logs (revisar manualmente).
- ✅ `CitizenAlreadyRegistered` se levanta correctamente cuando corresponde.

## Errores comunes

- **DNI persistiendo en variables**
  En Python, después de que la función retorna, los locales son GC. Pero **no** asignes `self._last_dni = dni` por error.

- **Hash diferente entre Python y Solidity**
  Confirmá que ambos usan `PUBLIC_SALT` idéntico y que `f"{dni}|{normalized}|{salt}"` es la forma exacta.

- **`ContractLogicError` sin texto**
  En testnets con explorer pobre, el revert reason se pierde. Por eso el `try/except` cubre `ContractLogicError` genérico.

## Lecturas
- [`A-003`](./A-003-citizen-hash-helper.md) — hash spec
- [`B-005`](../../blockchain/docs/B-005-impl-citizenregistry.md) — contrato

## Notas para revisor
- Hacer **grep** después del PR: `grep -rE "dni|DNI" agents/api/services/` — debe aparecer solo en argumentos de función, NUNCA en `logger.info`, `print`, ni `return`.
- Confirmar que el `tx_hash` retornado coincide con el visible en el explorer.
