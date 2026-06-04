---
id: A-032
title: "mcp_server/server.py — entrypoint con registro de tools"
owner: "Sandro"
backup: "junior"
effort: "1.5 h"
priority: P0
status: pending
depends_on: [A-026, A-027, A-028, A-029, A-030, A-031]
sprint: 1
layer: agents
---

# A-032 · Server MCP entrypoint

## Por qué importa
Esta tarea **ensambla** las tools individuales en un servidor MCP funcional. Cuando alguien hace `python -m mcp_server.server` desde Claude Code, ESTA es la pieza que arranca.

## Conceptos clave
- **`mcp.server.Server`**: la clase central del SDK. Le registramos tools con `@server.list_tools()` y `@server.call_tool()`.
- **Doble decorador `list_tools` + `call_tool`**: el primero anuncia tools al cliente; el segundo despacha llamadas.

## Pre-requisitos
- [ ] Todas las A-026 a A-031 cerradas.

## Paso a paso

### 1. Crear `mcp_server/server.py`
```python
"""Entrypoint MCP — registra tools y arranca el transport."""
from __future__ import annotations

import asyncio
import json
import logging

from mcp.server import Server
from mcp.types import Tool, TextContent

from api.config import get_settings
from api.middleware.logging_pii import configure_logging
from api.services.blockchain_client import get_blockchain_client

from mcp_server.tools.register_citizen import (
    REGISTER_CITIZEN_SCHEMA,
    handle_register_citizen,
)
from mcp_server.tools.list_proposals import (
    LIST_PROPOSALS_SCHEMA,
    handle_list_proposals,
)
from mcp_server.tools.get_proposal import (
    GET_PROPOSAL_SCHEMA,
    handle_get_proposal,
)
from mcp_server.tools.cast_vote import (
    CAST_VOTE_SCHEMA,
    handle_cast_vote,
)
from mcp_server.tools.generate_report import (
    GENERATE_REPORT_SCHEMA,
    handle_generate_report,
)
from mcp_server.tools.get_hermes_status import (
    HERMES_STATUS_SCHEMA,
    handle_get_hermes_status,
)
from mcp_server.transports import select_transport

logger = logging.getLogger(__name__)


def build_server() -> Server:
    s = get_settings()
    server = Server("civicsys-mcp")

    TOOLS = {
        "register_citizen":   (REGISTER_CITIZEN_SCHEMA,   handle_register_citizen),
        "list_proposals":     (LIST_PROPOSALS_SCHEMA,     handle_list_proposals),
        "get_proposal":       (GET_PROPOSAL_SCHEMA,       handle_get_proposal),
        "cast_vote":          (CAST_VOTE_SCHEMA,          handle_cast_vote),
        "generate_report":    (GENERATE_REPORT_SCHEMA,    handle_generate_report),
        "get_hermes_status":  (HERMES_STATUS_SCHEMA,      handle_get_hermes_status),
    }

    @server.list_tools()
    async def list_tools() -> list[Tool]:
        out = []
        for name, (schema, _) in TOOLS.items():
            # En SSE, ocultar register_citizen
            if name == "register_citizen" and s.mcp_transport != "stdio":
                continue
            out.append(Tool(
                name=schema["name"],
                description=schema["description"],
                inputSchema=schema["inputSchema"],
            ))
        return out

    @server.call_tool()
    async def call_tool(name: str, arguments: dict) -> list[TextContent]:
        if name not in TOOLS:
            return [TextContent(type="text", text=json.dumps({"error": {"code": "UNKNOWN_TOOL"}}))]
        _, handler = TOOLS[name]
        result = await handler(**(arguments or {}))
        return [TextContent(type="text", text=json.dumps(result, default=str))]

    return server


async def main() -> None:
    configure_logging(level=get_settings().hermes_log_level)
    # Asegurar blockchain client antes de aceptar llamadas
    await get_blockchain_client()
    server = build_server()
    logger.info("MCP server starting", extra={"transport": get_settings().mcp_transport})
    await select_transport(server)


if __name__ == "__main__":
    asyncio.run(main())
```

### 2. Probar arranque local (stdio)
```bash
cd agents
python -m mcp_server.server
# Debería quedar leyendo stdin.
# Ctrl+C para salir.
```

### 3. Probar con Claude Code
Agregar al `.claude/mcp.json` del cliente (Claude Code):
```json
{
  "mcpServers": {
    "civicsys": {
      "command": "python",
      "args": ["-m", "mcp_server.server"],
      "cwd": "C:/dev/hackathons/blockchain-syscoin-04-2026/CivicSys/agents",
      "env": {
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

Reiniciar Claude Code. Tools deberían aparecer en `/mcp`.

### 4. Test smoke
```python
# tests/test_mcp_server.py
import pytest


def test_build_server_no_crash(monkeypatch):
    monkeypatch.setenv("MCP_TRANSPORT", "stdio")
    monkeypatch.setenv("CITIZEN_REGISTRY_ADDRESS", "0x" + "a" * 40)
    monkeypatch.setenv("VOTE_CONTRACT_ADDRESS", "0x" + "b" * 40)
    monkeypatch.setenv("SIGNER_PRIVATE_KEY", "0x" + "c" * 64)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test")
    from api.config import get_settings
    get_settings.cache_clear()  # type: ignore[attr-defined]
    from mcp_server.server import build_server
    srv = build_server()
    assert srv is not None
```

### 5. Commit
```bash
git add agents/mcp_server/server.py agents/tests/test_mcp_server.py
git commit -m "feat(agents): mcp_server.server entrypoint (A-032)"
```

## Verificación / Definition of Done

- ✅ `python -m mcp_server.server` arranca sin crash.
- ✅ En SSE, `register_citizen` NO aparece en `list_tools`.
- ✅ `call_tool("unknown")` devuelve error con código.

## Errores comunes

- **`mcp.types.Tool` no acepta `inputSchema` con `pattern`**
  Algunas versiones cambian la validación. Probar con un schema mínimo y ampliar.

## Lecturas
- [MCP Python SDK examples](https://github.com/modelcontextprotocol/python-sdk/tree/main/examples)

## Notas para revisor
- ¿La lista de tools coincide con el README de agents/? Sincronizar.
- En Sprint 2: auth basada en API key para SSE.
