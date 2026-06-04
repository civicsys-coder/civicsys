---
id: A-018
title: "routes/health.py + /hermes/status"
owner: "junior"
backup: "Sandro"
effort: "1 h"
priority: P1
status: pending
depends_on: [A-009]
sprint: 1
layer: agents
---

# A-018 · Rutas de salud

## Por qué importa
- `GET /health` es la "señal vital" del sistema. Sin esto no podemos monitorear, ni un load balancer sabría si el pod está vivo.
- `GET /hermes/status` expone el alma de Hermes (¿está corriendo?, ¿memoria cargada?, ¿último evento procesado?). Útil para el dashboard interno y como auto-doc.

## Conceptos clave
- **Liveness vs readiness**: `liveness` = "el proceso está vivo". `readiness` = "puedo recibir tráfico" (deps OK). En Sprint 1 los combinamos.
- **Healthcheck sin gas**: las verificaciones deben ser baratas. `eth.chain_id` está bien. `getCitizen(0x...)` NO está bien.

## Pre-requisitos
- [ ] [A-009](./A-009-blockchain-client-setup.md) cerrada.

## Paso a paso

### 1. Crear `api/routes/health.py`
```python
"""Endpoints de salud y estado."""
from __future__ import annotations

import time
from pathlib import Path

from fastapi import APIRouter, Depends

from api.config import get_settings
from api.services.blockchain_client import (
    BlockchainClient,
    get_blockchain_client,
)

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(
    client: BlockchainClient = Depends(get_blockchain_client),
) -> dict:
    started = time.perf_counter()
    rpc_ok = False
    chain_id: int | None = None
    try:
        chain_id = await client.w3.eth.chain_id
        rpc_ok = True
    except Exception:
        pass
    return {
        "status": "ok" if rpc_ok else "degraded",
        "rpc_ok": rpc_ok,
        "chain_id": chain_id,
        "latency_ms": int((time.perf_counter() - started) * 1000),
    }


@router.get("/hermes/status")
async def hermes_status() -> dict:
    s = get_settings()
    mem = Path(s.hermes_memory_dir)
    cursor_file = mem / "event_cursor.json"
    sessions = (mem / "sessions").glob("*.json") if (mem / "sessions").exists() else []

    soul_md = Path(__file__).resolve().parents[2] / "hermes" / "soul" / "SOUL.md"
    instinct_md = Path(__file__).resolve().parents[2] / "hermes" / "soul" / "INSTINCT.md"

    last_block = None
    processed_count = 0
    if cursor_file.exists():
        import json
        d = json.loads(cursor_file.read_text())
        last_block = d.get("last_block")
        processed_count = len(d.get("processed_tx", []))

    return {
        "soul_loaded": soul_md.exists(),
        "instinct_loaded": instinct_md.exists(),
        "memory_dir": str(mem),
        "last_processed_block": last_block,
        "events_processed": processed_count,
        "reports_cached": sum(1 for _ in sessions),
        "llm_model": s.llm_model,
    }
```

### 2. Test
```python
# tests/test_route_health.py
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, MagicMock


@pytest.mark.asyncio
async def test_health_ok(monkeypatch):
    fake = AsyncMock()
    fake.w3.eth.chain_id = 57057
    from api.services import blockchain_client as bc_mod
    monkeypatch.setattr(bc_mod, "get_blockchain_client", AsyncMock(return_value=fake))

    from api.main import create_app
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app), base_url="http://test") as ac:
        r = await ac.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["rpc_ok"] is True
    assert body["chain_id"] == 57057
```

### 3. Commit
```bash
git add agents/api/routes/health.py agents/tests/test_route_health.py
git commit -m "feat(agents): rutas /health y /hermes/status (A-018)"
```

## Verificación / Definition of Done

- ✅ /health responde < 1s.
- ✅ /hermes/status muestra `soul_loaded: true` (porque SOUL.md ya existe).
- ✅ Si el RPC está caído, /health devuelve `status: "degraded"` y NO 500.

## Errores comunes

- **Health endpoint cuelga si el RPC se cuelga**
  Por eso usamos `try/except`. Nunca debe colgar el endpoint.

- **`Path(__file__).parents[N]` da el directorio equivocado**
  Hacé `print(Path(__file__).resolve())` para diagnosticar.

## Lecturas
- [Kubernetes probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)

## Notas para revisor
- ¿`/hermes/status` revela info sensible? No — solo paths y contadores. OK público.
- En Sprint 2 separar liveness (proceso vivo) de readiness (puede atender requests).
