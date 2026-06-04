---
id: A-027
title: "MCP tools list_proposals + get_proposal"
owner: "junior"
backup: "Sandro"
effort: "1 h"
priority: P0
status: pending
depends_on: [A-011]
sprint: 1
layer: agents
---

# A-027 · MCP tools `list_proposals` + `get_proposal`

## Por qué importa
Estos tools son **públicos** (no manejan PII). Permiten que un LLM (Claude Code u otro) explore las propuestas activas, las lea, y decida cuál presentar al usuario.

## Conceptos clave
- **Tool sin side effects**: ambos son `view` — no firman txs.
- **Output JSON-serializable**: el MCP SDK expone JSON. Nada de `bytes` ni `datetime` sin formatear.

## Pre-requisitos
- [ ] [A-011](./A-011-blockchain-client-proposals.md) cerrada.

## Paso a paso

### 1. Crear `mcp_server/tools/list_proposals.py`
```python
"""MCP tool: list_proposals (público)."""
from __future__ import annotations

from api.models.proposal import ProposalStatus
from api.services.blockchain_client import get_blockchain_client


LIST_PROPOSALS_SCHEMA = {
    "name": "list_proposals",
    "description": "Lista las propuestas en zkTanenbaum. Filtrable por solo activas.",
    "inputSchema": {
        "type": "object",
        "properties": {
            "only_active": {"type": "boolean", "default": False},
        },
        "additionalProperties": False,
    },
}


async def handle_list_proposals(only_active: bool = False) -> dict:
    client = await get_blockchain_client()
    items = await client.list_proposals(only_active=only_active)
    out = []
    for p in items:
        t = await client.tally(p["id"])
        out.append({
            "id": p["id"],
            "title": p["title"],
            "options": p["options"],
            "deadline": p["deadline"],
            "status": ProposalStatus.from_onchain(p["status"]).value,
            "total_votes": sum(t),
        })
    return {"proposals": out, "count": len(out)}
```

### 2. Crear `mcp_server/tools/get_proposal.py`
```python
"""MCP tool: get_proposal (público)."""
from __future__ import annotations

from api.models.proposal import ProposalStatus
from api.services.blockchain_client import get_blockchain_client


GET_PROPOSAL_SCHEMA = {
    "name": "get_proposal",
    "description": "Devuelve detalle de una propuesta por ID (incluye tally).",
    "inputSchema": {
        "type": "object",
        "properties": {
            "proposal_id": {"type": "integer", "minimum": 1},
        },
        "required": ["proposal_id"],
        "additionalProperties": False,
    },
}


async def handle_get_proposal(proposal_id: int) -> dict:
    client = await get_blockchain_client()
    p = await client.get_proposal(proposal_id)
    if p is None:
        return {"error": {"code": "NOT_FOUND", "message": f"proposal {proposal_id} no existe"}}
    t = await client.tally(proposal_id)
    return {
        "id": p["id"],
        "title": p["title"],
        "description": p["description"],
        "options": p["options"],
        "deadline": p["deadline"],
        "status": ProposalStatus.from_onchain(p["status"]).value,
        "curator": p["curator"],
        "tally": t,
        "total_votes": sum(t),
        "contract_address": client.vote.address,
    }
```

### 3. Commit
```bash
git add agents/mcp_server/tools/list_proposals.py agents/mcp_server/tools/get_proposal.py
git commit -m "feat(agents): MCP tools list/get proposals (A-027)"
```

## Verificación / Definition of Done

- ✅ Schemas válidos JSON Schema.
- ✅ `get_proposal(99999)` devuelve error formal, no excepción.
- ✅ `list_proposals(only_active=true)` filtra correctamente.

## Errores comunes

- **El SDK MCP no acepta `"default"` en JSON Schema**
  Algunas versiones lo ignoran. Documentar default en la `description` también.

## Lecturas
- [JSON Schema](https://json-schema.org/)

## Notas para revisor
- ¿`status` se serializa como string ("active") y no como int? Confirmar.
- ¿`contract_address` se incluye? Útil para que el LLM cite la dirección.
