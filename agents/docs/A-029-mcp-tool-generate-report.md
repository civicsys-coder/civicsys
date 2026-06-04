---
id: A-029
title: "MCP tool generate_report"
owner: "Sandro"
backup: "junior"
effort: "1 h"
priority: P0
status: pending
depends_on: [A-023]
sprint: 1
layer: agents
---

# A-029 · MCP tool `generate_report`

## Por qué importa
Es el endpoint MCP equivalente a `GET /reports/{id}` — pero invocable por LLMs en lugar de HTTP. Útil para demos donde un Claude Code consume el reporte y se lo presenta al usuario.

## Conceptos clave
- **Reuse del cache**: misma estrategia que la ruta HTTP. Si hay cache, retornar; si no, generar.
- **Costo LLM**: la primera invocación cuesta tokens. Documentarlo en el `description` del schema.

## Pre-requisitos
- [ ] [A-023](./A-023-hermes-reporter.md) cerrada.

## Paso a paso

### 1. Crear `mcp_server/tools/generate_report.py`
```python
"""MCP tool: generate_report."""
from __future__ import annotations

import json
from pathlib import Path

from api.config import get_settings
from api.models.proposal import ProposalStatus
from api.services.blockchain_client import get_blockchain_client


GENERATE_REPORT_SCHEMA = {
    "name": "generate_report",
    "description": (
        "Genera (o devuelve cache) el reporte Hermes para una propuesta cerrada. "
        "Costo LLM en miss; gratis en hit."
    ),
    "inputSchema": {
        "type": "object",
        "properties": {
            "proposal_id": {"type": "integer", "minimum": 1},
            "force": {"type": "boolean", "default": False},
        },
        "required": ["proposal_id"],
        "additionalProperties": False,
    },
}


def _cache_path(proposal_id: int) -> Path:
    s = get_settings()
    return s.hermes_memory_dir / "sessions" / f"proposal_{proposal_id}.json"


async def handle_generate_report(proposal_id: int, force: bool = False) -> dict:
    client = await get_blockchain_client()
    p = await client.get_proposal(proposal_id)
    if p is None:
        return {"error": {"code": "NOT_FOUND"}}
    if ProposalStatus.from_onchain(p["status"]) == ProposalStatus.ACTIVE:
        return {"error": {"code": "PROPOSAL_NOT_CLOSED", "message": "Propuesta sigue activa"}}

    path = _cache_path(proposal_id)
    if path.exists() and not force:
        return json.loads(path.read_text(encoding="utf-8"))

    from hermes.reporter import generate_report_for_proposal
    report = await generate_report_for_proposal(proposal_id, client)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(report.model_dump_json(indent=2), encoding="utf-8")
    return json.loads(report.model_dump_json())
```

### 2. Commit
```bash
git add agents/mcp_server/tools/generate_report.py
git commit -m "feat(agents): MCP tool generate_report (A-029)"
```

## Verificación / Definition of Done

- ✅ Si `force=true`, regenera aunque haya cache.
- ✅ Si propuesta activa, devuelve `PROPOSAL_NOT_CLOSED`.
- ✅ Output es JSON serializable de `Report`.

## Errores comunes

- **`Report.model_dump_json()` retorna string, pero devolvemos dict**
  Pasamos por `json.loads(...)` para garantizar dict. Si querés performance, devolver el string directo.

## Lecturas
- [`A-023`](./A-023-hermes-reporter.md)

## Notas para revisor
- ¿`force=true` no rompe el flujo principal? Es un escape hatch — está bien.
