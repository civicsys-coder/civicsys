---
id: A-036
title: "Tests MCP tools"
owner: "Gabriel"
backup: "junior"
effort: "1.5 h"
priority: P1
status: pending
depends_on: [A-032]
sprint: 1
layer: agents
---

# A-036 · Tests de MCP tools

## Por qué importa
Cada tool tiene su propio handler. Si uno revierte por excepción no capturada, el server entero se cae. Los tests aseguran que cada tool devuelve `{"error": {...}}` en lugar de levantar.

## Pre-requisitos
- [ ] [A-032](./A-032-mcp-server-entrypoint.md) cerrada.

## Paso a paso

### 1. Crear `tests/test_mcp_tools.py`
```python
"""Tests por tool MCP."""
from unittest.mock import AsyncMock, patch
import pytest


@pytest.mark.asyncio
async def test_list_proposals_smoke(monkeypatch):
    fake = AsyncMock()
    fake.list_proposals.return_value = [{
        "id": 1, "title": "X", "description": "Y", "options": ["A", "B"],
        "created_at": 0, "deadline": 1, "status": 0, "curator": "0x" + "a" * 40,
    }]
    fake.tally.return_value = [3, 2]
    with patch("mcp_server.tools.list_proposals.get_blockchain_client", AsyncMock(return_value=fake)):
        from mcp_server.tools.list_proposals import handle_list_proposals
        r = await handle_list_proposals(only_active=True)
    assert r["count"] == 1
    assert r["proposals"][0]["total_votes"] == 5


@pytest.mark.asyncio
async def test_get_proposal_no_existe():
    fake = AsyncMock()
    fake.get_proposal.return_value = None
    with patch("mcp_server.tools.get_proposal.get_blockchain_client", AsyncMock(return_value=fake)):
        from mcp_server.tools.get_proposal import handle_get_proposal
        r = await handle_get_proposal(proposal_id=999)
    assert "error" in r


@pytest.mark.asyncio
async def test_cast_vote_option_fuera_rango():
    fake = AsyncMock()
    fake.get_proposal.return_value = {
        "id": 1, "title": "X", "description": "Y", "options": ["A", "B"],
        "created_at": 0, "deadline": 1, "status": 0, "curator": "0x" + "a" * 40,
    }
    with patch("mcp_server.tools.cast_vote.get_blockchain_client", AsyncMock(return_value=fake)):
        from mcp_server.tools.cast_vote import handle_cast_vote
        r = await handle_cast_vote(proposal_id=1, citizen_id="0x" + "a" * 64, option=99)
    assert r["error"]["code"] == "INVALID_OPTION"


@pytest.mark.asyncio
async def test_register_citizen_bloqueado_en_sse(monkeypatch):
    monkeypatch.setenv("MCP_TRANSPORT", "sse")
    from api.config import get_settings
    get_settings.cache_clear()  # type: ignore[attr-defined]
    from mcp_server.tools.register_citizen import handle_register_citizen
    r = await handle_register_citizen("12345678", "Juan Pérez")
    assert r["error"]["code"] == "TOOL_DISABLED"
```

### 2. Commit
```bash
git add agents/tests/test_mcp_tools.py
git commit -m "test(agents): MCP tools error paths (A-036)"
```

## Verificación / Definition of Done

- ✅ Cada tool tiene al menos 1 test (happy + 1 error).
- ✅ `register_citizen` confirma bloqueo en SSE.

## Lecturas
- Mismas que A-026 a A-032.

## Notas para revisor
- Validar coverage para `mcp_server/tools/` ≥ 75%.
