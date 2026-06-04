---
id: A-012
title: "blockchain_client — cast_vote, tally, has_voted, close_proposal"
owner: "Sandro"
backup: "junior"
effort: "1.5 h"
priority: P0
status: pending
depends_on: [A-009]
sprint: 1
layer: agents
---

# A-012 · Métodos de voto y cierre

## Por qué importa
Esta tarea cierra el set de operaciones blockchain que la API necesita. Después de A-012, el cliente cubre el flujo completo: registrar, crear propuesta, votar, ver tally, cerrar.

## Conceptos clave
- **Mapeo de custom errors → excepciones Python**: convertimos los `error CitizenNotInRegistry(...)`, `error AlreadyVoted(...)`, etc. a excepciones tipadas que las rutas pueden traducir a códigos HTTP claros.
- **`tally` es view**: gratis, sin gas.
- **`close_proposal` desde la API**: en Sprint 1 lo permite el `apiSigner` (que tiene admin role). En Sprint 2+ podríamos restringir solo al curador o a un cron.

## Pre-requisitos
- [ ] [A-009](./A-009-blockchain-client-setup.md) cerrada.

## Paso a paso

### 1. Agregar al `BlockchainClient`
```python
    async def cast_vote(
        self,
        proposal_id: int,
        citizen_id_hex: str,
        option: int,
    ) -> dict[str, Any]:
        cid = bytes.fromhex(citizen_id_hex[2:])

        # Pre-checks baratos (sin gas) → mejor UX
        is_reg = await self.registry.functions.isRegistered(cid).call()
        if not is_reg:
            raise CitizenNotInRegistry(citizen_id_hex)

        has_voted = await self.vote.functions.hasVoted(proposal_id, cid).call()
        if has_voted:
            raise AlreadyVoted(f"proposal {proposal_id}, citizen {citizen_id_hex}")

        fn = self.vote.functions.castVote(proposal_id, cid, option)
        try:
            result = await self.send_signed(fn, gas=300_000)
        except ContractLogicError as e:
            msg = str(e)
            if "AlreadyVoted" in msg:
                raise AlreadyVoted(citizen_id_hex) from e
            if "CitizenNotInRegistry" in msg:
                raise CitizenNotInRegistry(citizen_id_hex) from e
            if "ProposalNotActive" in msg:
                raise ProposalNotActive(f"proposal {proposal_id}") from e
            if "ProposalExpired" in msg:
                raise ProposalExpired(f"proposal {proposal_id}") from e
            raise BlockchainError(f"castVote revert: {msg}") from e

        return {
            "proposal_id": proposal_id,
            "tx_hash": result["tx_hash"],
            "block_number": result["block_number"],
            "explorer_url": self.explorer_tx(result["tx_hash"]),
        }

    async def tally(self, proposal_id: int) -> list[int]:
        raw = await self.vote.functions.tally(proposal_id).call()
        return [int(x) for x in raw]

    async def has_voted(self, proposal_id: int, citizen_id_hex: str) -> bool:
        cid = bytes.fromhex(citizen_id_hex[2:])
        return await self.vote.functions.hasVoted(proposal_id, cid).call()

    async def close_proposal(self, proposal_id: int) -> dict[str, Any]:
        fn = self.vote.functions.closeProposal(proposal_id)
        result = await self.send_signed(fn, gas=200_000)
        return {
            "proposal_id": proposal_id,
            "tx_hash": result["tx_hash"],
            "block_number": result["block_number"],
            "explorer_url": self.explorer_tx(result["tx_hash"]),
        }

    async def cancel_proposal(self, proposal_id: int) -> dict[str, Any]:
        fn = self.vote.functions.cancelProposal(proposal_id)
        result = await self.send_signed(fn, gas=150_000)
        return {
            "proposal_id": proposal_id,
            "tx_hash": result["tx_hash"],
            "block_number": result["block_number"],
            "explorer_url": self.explorer_tx(result["tx_hash"]),
        }
```

### 2. Test smoke
```python
# tests/test_blockchain_client_vote_smoke.py
import time
import pytest
from api.services.blockchain_client import (
    AlreadyVoted,
    CitizenNotInRegistry,
    get_blockchain_client,
    reset_blockchain_client,
)


@pytest.mark.integration
@pytest.mark.asyncio
async def test_vote_flow():
    await reset_blockchain_client()
    c = await get_blockchain_client()
    reg = await c.register_citizen("12345678", f"JUAN {time.time_ns()}")
    prop = await c.create_proposal("X", "Y", ["A", "B"], int(time.time()) + 3600)

    v = await c.cast_vote(prop["proposal_id"], reg["citizen_id"], 0)
    assert v["tx_hash"].startswith("0x")

    t = await c.tally(prop["proposal_id"])
    assert t[0] == 1 and t[1] == 0

    with pytest.raises(AlreadyVoted):
        await c.cast_vote(prop["proposal_id"], reg["citizen_id"], 1)


@pytest.mark.integration
@pytest.mark.asyncio
async def test_vote_unregistered():
    c = await get_blockchain_client()
    prop = await c.create_proposal("X", "Y", ["A", "B"], int(time.time()) + 3600)
    fake_id = "0x" + "f" * 64
    with pytest.raises(CitizenNotInRegistry):
        await c.cast_vote(prop["proposal_id"], fake_id, 0)
```

### 3. Commit
```bash
git add agents/api/services/blockchain_client.py agents/tests/test_blockchain_client_vote_smoke.py
git commit -m "feat(agents): blockchain_client vote/tally/close (A-012)"
```

## Verificación / Definition of Done

- ✅ Test smoke pasa.
- ✅ Cada custom error de Solidity tiene su excepción Python equivalente.
- ✅ `has_voted` retorna bool sin gas.
- ✅ `close_proposal` puede llamarse desde la API y emite el evento que Hermes escucha.

## Errores comunes

- **`AlreadyVoted` se levanta cuando NO debería**
  Revisar el `hasVoted` pre-check. Quizás el `citizen_id_hex` viene en mayúscula y el contrato lo guardó en minúscula → no son la misma bytes32. Normalizar a lowercase.

- **`ContractLogicError` con args en hex difícil de leer**
  Para Sprint 1 alcanza con string matching ("AlreadyVoted" in msg). Sprint 2+: parsear el `error4byte` selector.

## Lecturas
- [Solidity custom error encoding](https://docs.soliditylang.org/en/v0.8.24/abi-spec.html#errors)

## Notas para revisor
- ¿Las excepciones tienen mensajes que ayudan al usuario final pero NO leakean detalles internos? Ej. `AlreadyVoted("proposal 1, citizen 0x...")` está bien. `AlreadyVoted("revert in slot 0x42a...")` no.
- Verificar que `cast_vote` no consume gas si los pre-checks ya rechazaron.
