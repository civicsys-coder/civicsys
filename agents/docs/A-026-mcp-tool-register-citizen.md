---
id: A-026
title: "MCP tool register_citizen"
owner: "Sandro"
backup: "junior"
effort: "1 h"
priority: P0
status: pending
depends_on: [A-010]
sprint: 1
layer: agents
---

# A-026 · MCP tool `register_citizen`

## Por qué importa
Los MCP tools permiten que **Claude Code u otros LLM clients** ejecuten acciones contra CivicSys. Este es el más sensible: recibe DNI. Por lo tanto, NUNCA debe estar expuesto en stdio o SSE público sin autenticación. En Sprint 1 lo marcamos como **dev-only**.

## Conceptos clave
- **Tool MCP**: una función que un LLM puede invocar. Definimos schema (input/output) y handler.
- **Restricción dev-only**: revisamos `settings.mcp_transport == "stdio"` (modo local) — si pasa a SSE, deshabilitamos esta tool.

## Pre-requisitos
- [ ] [A-010](./A-010-blockchain-client-register.md) cerrada.
- [ ] MCP SDK instalado.

## Paso a paso

### 1. Crear `mcp_server/tools/register_citizen.py`
```python
"""MCP tool: register_citizen (dev-only).

SOLO debe estar disponible cuando MCP corre en stdio (local).
"""
from __future__ import annotations

import logging

from api.config import get_settings
from api.services.blockchain_client import (
    CitizenAlreadyRegistered,
    get_blockchain_client,
)

logger = logging.getLogger(__name__)


REGISTER_CITIZEN_SCHEMA = {
    "name": "register_citizen",
    "description": (
        "Registra un ciudadano on-chain. Recibe DNI peruano y nombre completo. "
        "DEV-ONLY — solo disponible en transporte stdio."
    ),
    "inputSchema": {
        "type": "object",
        "properties": {
            "dni": {
                "type": "string",
                "pattern": r"^\d{8}$",
                "description": "DNI peruano (8 dígitos). NO se persiste — solo se hashea.",
            },
            "full_name": {
                "type": "string",
                "minLength": 5,
                "maxLength": 120,
            },
        },
        "required": ["dni", "full_name"],
        "additionalProperties": False,
    },
}


async def handle_register_citizen(dni: str, full_name: str) -> dict:
    if get_settings().mcp_transport != "stdio":
        return {
            "error": {
                "code": "TOOL_DISABLED",
                "message": "register_citizen solo está disponible en transporte stdio.",
            }
        }
    client = await get_blockchain_client()
    try:
        result = await client.register_citizen(dni, full_name)
    except CitizenAlreadyRegistered:
        return {"error": {"code": "ALREADY_REGISTERED"}}
    return result
```

### 2. Test
```python
# tests/test_mcp_tool_register.py
import pytest
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
async def test_register_citizen_stdio_ok(monkeypatch):
    monkeypatch.setenv("MCP_TRANSPORT", "stdio")
    from api.config import get_settings
    get_settings.cache_clear()  # type: ignore[attr-defined]

    fake = AsyncMock()
    fake.register_citizen.return_value = {"citizen_id": "0xabc", "tx_hash": "0xdef", "block_number": 1, "explorer_url": "...", "normalized_name": "JUAN"}
    with patch("mcp_server.tools.register_citizen.get_blockchain_client", AsyncMock(return_value=fake)):
        from mcp_server.tools.register_citizen import handle_register_citizen
        r = await handle_register_citizen("12345678", "Juan Pérez")
    assert r["citizen_id"] == "0xabc"


@pytest.mark.asyncio
async def test_register_citizen_bloqueada_en_sse(monkeypatch):
    monkeypatch.setenv("MCP_TRANSPORT", "sse")
    from api.config import get_settings
    get_settings.cache_clear()  # type: ignore[attr-defined]
    from mcp_server.tools.register_citizen import handle_register_citizen
    r = await handle_register_citizen("12345678", "Juan Pérez")
    assert "error" in r
    assert r["error"]["code"] == "TOOL_DISABLED"
```

### 3. Commit
```bash
git add agents/mcp_server/tools/register_citizen.py agents/tests/test_mcp_tool_register.py
git commit -m "feat(agents): MCP tool register_citizen (dev-only) (A-026)"
```

## Verificación / Definition of Done

- ✅ Funciona en stdio.
- ✅ Bloqueada en SSE (devuelve `TOOL_DISABLED`).
- ✅ Schema declara `pattern` para DNI.

## Errores comunes

- **El SDK MCP cambia interfaces**
  Si el `inputSchema` no se acepta como dict plano, mirá el wrapper en [A-032](./A-032-mcp-server-entrypoint.md).

## Lecturas
- [Model Context Protocol spec](https://modelcontextprotocol.io/)

## Notas para revisor
- ¿La verificación de transport es la PRIMERA línea? Sí — antes de cualquier operación.
- En Sprint 2 puede convertirse en `register_citizen_with_zk` (sin DNI directo).
