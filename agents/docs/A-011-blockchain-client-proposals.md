---
id: A-011
title: "blockchain_client — create_proposal, get_proposal, list_active"
owner: "junior"
backup: "Sandro"
effort: "1.5 h"
priority: P0
status: pending
depends_on: [A-009]
sprint: 1
layer: agents
---

# A-011 · Métodos de propuestas

## Por qué importa
Estos métodos exponen el CRUD de propuestas al API. `list_active` es especial: no podemos hacer `for i in totalProposals → getProposal(i)` directo porque costaría mucho gas en una propuesta con millones. En Sprint 1 (≤ 100 propuestas) lo hacemos así por simplicidad; Sprint 2 indexamos eventos en DB.

## Conceptos clave
- **`call()` vs `transact()`**: `call()` solo lee (gratis). `transact()` (via `send_signed`) modifica state.
- **Decode de structs**: web3.py retorna structs como tuplas. Mapeamos a dict para serializar a Pydantic.
- **Listing barato**: contar via `totalProposals()` + loop. En Sprint 2+ usamos eventos indexados.

## Pre-requisitos
- [ ] [A-009](./A-009-blockchain-client-setup.md) cerrada.

## Paso a paso

### 1. Agregar al `BlockchainClient`
```python
    async def create_proposal(
        self,
        title: str,
        description: str,
        options: list[str],
        deadline: int,
    ) -> dict[str, Any]:
        fn = self.vote.functions.createProposal(title, description, options, deadline)
        result = await self.send_signed(fn, gas=800_000)
        # Recuperar proposal_id del evento
        rcpt = await self.w3.eth.get_transaction_receipt(result["tx_hash"])
        logs = self.vote.events.ProposalCreated().process_receipt(rcpt)
        if not logs:
            raise BlockchainError("ProposalCreated no encontrado en receipt")
        proposal_id = logs[0]["args"]["id"]
        return {
            "proposal_id": int(proposal_id),
            "tx_hash": result["tx_hash"],
            "block_number": result["block_number"],
            "explorer_url": self.explorer_tx(result["tx_hash"]),
        }

    async def get_proposal(self, proposal_id: int) -> dict[str, Any] | None:
        try:
            p = await self.vote.functions.getProposal(proposal_id).call()
        except ContractLogicError:
            return None
        if p[0] == 0:  # id == 0 → no existe
            return None
        return {
            "id": int(p[0]),
            "title": p[1],
            "description": p[2],
            "options": list(p[3]),
            "created_at": int(p[4]),
            "deadline": int(p[5]),
            "status": int(p[6]),  # 0=Active,1=Closed,2=Cancelled
            "curator": p[7],
        }

    async def list_proposals(self, only_active: bool = False) -> list[dict[str, Any]]:
        total = await self.vote.functions.totalProposals().call()
        items: list[dict[str, Any]] = []
        for pid in range(1, total + 1):
            p = await self.get_proposal(pid)
            if p is None:
                continue
            if only_active and p["status"] != 0:
                continue
            items.append(p)
        return items

    async def total_proposals(self) -> int:
        return int(await self.vote.functions.totalProposals().call())
```

### 2. Test smoke
```python
# tests/test_blockchain_client_proposals_smoke.py
import pytest
from api.services.blockchain_client import get_blockchain_client, reset_blockchain_client


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_and_list():
    await reset_blockchain_client()
    c = await get_blockchain_client()
    import time
    deadline = int(time.time()) + 3600
    result = await c.create_proposal(
        "Test sprint",
        "Descripción",
        ["A favor", "En contra"],
        deadline,
    )
    pid = result["proposal_id"]
    assert pid >= 1

    p = await c.get_proposal(pid)
    assert p is not None
    assert p["title"] == "Test sprint"
    assert len(p["options"]) == 2

    actives = await c.list_proposals(only_active=True)
    assert any(x["id"] == pid for x in actives)
```

### 3. Commit
```bash
git add agents/api/services/blockchain_client.py agents/tests/test_blockchain_client_proposals_smoke.py
git commit -m "feat(agents): blockchain_client proposals CRUD (A-011)"
```

## Verificación / Definition of Done

- ✅ `create_proposal` retorna `proposal_id` válido del evento.
- ✅ `get_proposal(99999)` retorna `None` sin crash.
- ✅ `list_proposals(only_active=True)` filtra estados.

## Errores comunes

- **`process_receipt` retorna lista vacía**
  Probable: el receipt no tiene logs decodificables o la versión de web3.py es vieja. Confirmar que el ABI incluye el evento.

- **`gas: 800_000` insuficiente**
  Una propuesta con 32 opciones consume gas. Si revierte por OOG, subir a 1.5M.

- **`list_proposals` lento**
  En Sprint 2 con 1000 propuestas, esto va a ser N RPC calls. Patrón actual NO escala. Migrar a indexer.

## Lecturas
- [web3.py — Working with contracts](https://web3py.readthedocs.io/en/stable/web3.contract.html)

## Notas para revisor
- ¿`get_proposal` discrimina "no existe" vs "revert por otra razón"? Verificar.
- En Sprint 2 considerar caché de `list_proposals` (Redis 60s).
