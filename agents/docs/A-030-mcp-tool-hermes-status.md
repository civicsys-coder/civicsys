---
id: A-030
title: "MCP tool get_hermes_status"
owner: "junior"
backup: "Sandro"
effort: "45 min"
priority: P1
status: pending
depends_on: [A-024]
sprint: 1
layer: agents
---

# A-030 · MCP tool `get_hermes_status`

## Por qué importa
Permite que un LLM externo pregunte "¿Hermes está bien?". Sirve también como auto-doc: el LLM aprende qué archivos lo definen y a qué bloque va.

## Conceptos clave
- **Idempotente, sin side effects**: solo lee disco.
- **No expone secretos**: solo paths, contadores, model name (no key).

## Pre-requisitos
- [ ] [A-024](./A-024-hermes-runtime.md) cerrada.

## Paso a paso

### 1. Crear `mcp_server/tools/get_hermes_status.py`
```python
"""MCP tool: get_hermes_status (público, sin side effects)."""
from __future__ import annotations

import json
from pathlib import Path

from api.config import get_settings


HERMES_STATUS_SCHEMA = {
    "name": "get_hermes_status",
    "description": "Devuelve el estado de Hermes (memoria, últimos eventos procesados, modelo).",
    "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
}


async def handle_get_hermes_status() -> dict:
    s = get_settings()
    mem = s.hermes_memory_dir
    sessions = list((mem / "sessions").glob("*.json")) if (mem / "sessions").exists() else []
    cursor = mem / "event_cursor.json"

    last_block: int | None = None
    processed: int = 0
    if cursor.exists():
        d = json.loads(cursor.read_text())
        last_block = int(d.get("last_block", 0))
        processed = len(d.get("processed_tx", []))

    soul = (Path(__file__).resolve().parents[2] / "hermes" / "soul" / "SOUL.md").exists()
    instinct = (Path(__file__).resolve().parents[2] / "hermes" / "soul" / "INSTINCT.md").exists()

    return {
        "soul_loaded": soul,
        "instinct_loaded": instinct,
        "memory_dir": str(mem),
        "last_processed_block": last_block,
        "events_processed": processed,
        "reports_cached": len(sessions),
        "llm_model": s.llm_model,
        "transport": s.mcp_transport,
    }
```

### 2. Commit
```bash
git add agents/mcp_server/tools/get_hermes_status.py
git commit -m "feat(agents): MCP tool get_hermes_status (A-030)"
```

## Verificación / Definition of Done

- ✅ Devuelve un dict con todos los campos.
- ✅ No expone keys.
- ✅ Funciona aunque la memoria esté vacía.

## Errores comunes

- **`Path(__file__).parents[N]` cuenta mal**
  Confirmar con `print` en runtime cuál es el dir real.

## Lecturas
- [`A-018`](./A-018-route-health-status.md) — equivalente HTTP

## Notas para revisor
- ¿Coincide el output con `/hermes/status`? Si no, sincronizar.
