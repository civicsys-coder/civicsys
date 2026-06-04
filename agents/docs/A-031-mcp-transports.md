---
id: A-031
title: "mcp_server/transports.py — stdio + SSE"
owner: "Sandro"
backup: "junior"
effort: "1.5 h"
priority: P0
status: pending
depends_on: [A-001]
sprint: 1
layer: agents
---

# A-031 · Transports MCP

## Por qué importa
MCP soporta dos transportes principales para Sprint 1: **stdio** (subprocess local, ej. Claude Code) y **SSE** (HTTP streaming, accesible vía red). Los necesitamos a ambos para que el demo funcione tanto en una terminal como integrado al frontend Next.js.

## Conceptos clave
- **stdio**: el server lee de stdin y escribe a stdout. El cliente (Claude Code) arranca el server como subprocess.
- **SSE**: el server expone HTTP. Sirve eventos vía `text/event-stream`.
- **El SDK MCP de Python expone ambos**: `mcp.server.stdio.stdio_server()` y `mcp.server.sse.SseServerTransport()`.

## Pre-requisitos
- [ ] [A-001](./A-001-setup-pyproject.md) cerrada con `mcp` instalado.

## Paso a paso

### 1. Crear `mcp_server/transports.py`
```python
"""Adaptadores de transporte para el MCP server."""
from __future__ import annotations

import asyncio
import logging
from typing import Any

from api.config import get_settings

logger = logging.getLogger(__name__)


async def run_stdio(app: Any) -> None:
    """Modo stdio: cliente lanza este proceso y habla por stdin/stdout."""
    from mcp.server.stdio import stdio_server

    async with stdio_server() as (read, write):
        await app.run(read, write, app.create_initialization_options())


async def run_sse(app: Any) -> None:
    """Modo SSE: expone HTTP en MCP_PORT."""
    from mcp.server.sse import SseServerTransport
    import uvicorn
    from starlette.applications import Starlette
    from starlette.routing import Route, Mount

    s = get_settings()
    transport = SseServerTransport("/messages")

    async def handle_sse(request):
        async with transport.connect_sse(request.scope, request.receive, request._send) as streams:
            await app.run(streams[0], streams[1], app.create_initialization_options())

    starlette = Starlette(
        routes=[
            Route("/sse", endpoint=handle_sse),
            Mount("/messages", app=transport.handle_post_message),
        ],
    )

    config = uvicorn.Config(starlette, host=s.api_host, port=s.mcp_port, log_level="info")
    server = uvicorn.Server(config)
    await server.serve()


def select_transport(app: Any) -> asyncio.coroutine:
    s = get_settings()
    if s.mcp_transport == "stdio":
        return run_stdio(app)
    elif s.mcp_transport == "sse":
        return run_sse(app)
    raise ValueError(f"transport desconocido: {s.mcp_transport}")
```

### 2. Commit
```bash
git add agents/mcp_server/transports.py
git commit -m "feat(agents): MCP transports stdio + SSE (A-031)"
```

## Verificación / Definition of Done

- ✅ `run_stdio` funciona con `claude mcp` (test manual).
- ✅ `run_sse` arranca un HTTP server en `MCP_PORT`.
- ✅ `select_transport` elige según env var.

## Errores comunes

- **El SDK MCP no tiene `SseServerTransport`**
  Algunas versiones cambiaron el nombre. Verificar `python -c "from mcp.server import sse; print(dir(sse))"`.

- **stdio se cuelga**
  El cliente no cerró stdin. Asegurate de que el subprocess termina cuando el cliente se va.

## Lecturas
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- [Starlette](https://www.starlette.io/)

## Notas para revisor
- ¿El SSE expone CORS? Si querés que el frontend del browser lo consuma directo, sí. Si solo lo consume backend-to-backend, no hace falta.
- En Sprint 2 podríamos agregar transporte WebSocket.
