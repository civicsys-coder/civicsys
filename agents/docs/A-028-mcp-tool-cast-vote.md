---
id: A-028
title: "MCP tool cast_vote"
owner: "junior"
backup: "Sandro"
effort: "1 h"
priority: P0
status: pending
depends_on: [A-012]
sprint: 1
layer: agents
---

# A-028 · MCP tool `cast_vote`

## Por qué importa
Permite que Claude Code u otro LLM emita un voto a través de la API. Como `cast_vote` requiere `citizen_id` (hash) ya registrado, NO recibe DNI — se evita el riesgo de PII en esta tool, y por tanto puede estar disponible también en SSE público (con auth en Sprint 2).

## Conceptos clave
- **Idempotencia**: si el cliente reintenta, el contrato rechaza con `AlreadyVoted` y la tool retorna ese código.
- **Validación previa de option**: si `option > len(options) - 1`, fallamos antes de gastar gas.

## Pre-requisitos
- [ ] [A-012](./A-012-blockchain-client-vote-tally.md) cerrada.

## Paso a paso

### 1. Crear `mcp_server/tools/cast_vote.py`
```python
"""MCP tool: cast_vote.

NO recibe DNI. Solo trabaja con el citizen_id (hash) ya registrado.
"""
from __future__ import annotations

from api.services.blockchain_client import (
    AlreadyVoted,
    BlockchainError,
    CitizenNotInRegistry,
    ProposalExpired,
    ProposalNotActive,
    get_blockchain_client,
)


CAST_VOTE_SCHEMA = {
    "name": "cast_vote",
    "description": (
        "Emite un voto en una propuesta. Requiere citizen_id (hash) ya registrado. "
        "NO opera con DNI."
    ),
    "inputSchema": {
        "type": "object",
        "properties": {
            "proposal_id": {"type": "integer", "minimum": 1},
            "citizen_id": {
                "type": "string",
                "pattern": r"^0x[0-9a-fA-F]{64}$",
            },
            "option": {"type": "integer", "minimum": 0, "maximum": 255},
        },
        "required": ["proposal_id", "citizen_id", "option"],
        "additionalProperties": False,
    },
}


async def handle_cast_vote(proposal_id: int, citizen_id: str, option: int) -> dict:
    client = await get_blockchain_client()

    # Pre-check para mejor error message
    p = await client.get_proposal(proposal_id)
    if p is None:
        return {"error": {"code": "NOT_FOUND", "message": "propuesta no existe"}}
    if option >= len(p["options"]):
        return {"error": {"code": "INVALID_OPTION", "message": f"option fuera de rango (max {len(p['options']) - 1})"}}

    try:
        result = await client.cast_vote(proposal_id, citizen_id, option)
    except CitizenNotInRegistry:
        return {"error": {"code": "CITIZEN_NOT_REGISTERED"}}
    except AlreadyVoted:
        return {"error": {"code": "ALREADY_VOTED"}}
    except ProposalNotActive:
        return {"error": {"code": "PROPOSAL_NOT_ACTIVE"}}
    except ProposalExpired:
        return {"error": {"code": "PROPOSAL_EXPIRED"}}
    except BlockchainError as e:
        return {"error": {"code": "BLOCKCHAIN_ERROR", "message": str(e)}}
    return result
```

### 2. Commit
```bash
git add agents/mcp_server/tools/cast_vote.py
git commit -m "feat(agents): MCP tool cast_vote (A-028)"
```

## Verificación / Definition of Done

- ✅ Schema valida `pattern` de citizen_id.
- ✅ Cada caso de error tiene un código.
- ✅ Happy path retorna `tx_hash`, `block_number`, `explorer_url`.

## Errores comunes

- **El LLM pasa `option` como string**
  JSON Schema valida tipo. Si igual pasa, Pydantic en el cliente coerce.

## Lecturas
- Ninguna específica.

## Notas para revisor
- ¿La tool NO recibe DNI? Confirmar.
- ¿Validación de `option` antes de tocar la blockchain? Sí.
