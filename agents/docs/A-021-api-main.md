---
id: A-021
title: "api/main.py — FastAPI app factory + lifespan + routers"
owner: "Sandro"
backup: "junior"
effort: "1 h"
priority: P0
status: pending
depends_on: [A-014, A-015, A-016, A-017, A-018, A-019, A-020]
sprint: 1
layer: agents
---

# A-021 · Entrypoint del API

## Por qué importa
Hasta acá tenemos piezas (routers, middlewares, services). Esta tarea las **ensambla** en una `FastAPI` app única, con un lifespan que inicializa el blockchain client, arranca el event listener, y limpia al apagar.

## Conceptos clave
- **App factory**: función que retorna una instancia de `FastAPI`. Permite testear con apps recién creadas y sin estado global.
- **Lifespan**: hook que ejecuta código `before yield` (startup) y `after yield` (shutdown). Reemplaza los viejos `@app.on_event(...)`.
- **Router include**: cada `routes/*.py` exporta un `APIRouter`. El main los suma con `app.include_router(...)`.

## Pre-requisitos
- [ ] Todos los routes (A-014 a A-018) cerrados.
- [ ] Middlewares (A-019, A-020) cerrados.

## Paso a paso

### 1. Crear `api/main.py`
```python
"""FastAPI app factory. Punto de entrada del API."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from api.config import assert_blockchain_ready, get_settings
from api.middleware.cors import configure_cors
from api.middleware.logging_pii import configure_logging
from api.routes import auth, health, proposals, reports, votes
from api.services.blockchain_client import get_blockchain_client

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    s = get_settings()
    configure_logging(level=s.hermes_log_level)
    logger.info("API starting", extra={"chain_id": s.chain_id, "model": s.llm_model})

    # Pre-flight: si faltan vars críticas, fallar rápido
    assert_blockchain_ready()
    await get_blockchain_client()

    # Hermes runtime se arranca solo si tenemos LLM key
    hermes_task = None
    if s.anthropic_api_key is not None:
        from hermes.runtime import run_hermes
        import asyncio
        hermes_task = asyncio.create_task(run_hermes())
    else:
        logger.warning("ANTHROPIC_API_KEY no presente — Hermes runtime deshabilitado")

    try:
        yield
    finally:
        logger.info("API stopping")
        if hermes_task is not None:
            hermes_task.cancel()


def create_app() -> FastAPI:
    s = get_settings()
    app = FastAPI(
        title="CivicSys API — SSC ANTIPEREZA",
        description="API REST de la cámara cívica deliberativa. Sprint 1.",
        version="0.1.0-sprint1",
        lifespan=lifespan,
    )
    configure_cors(app)
    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(proposals.router)
    app.include_router(votes.router)
    app.include_router(reports.router)
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn
    s = get_settings()
    uvicorn.run("api.main:app", host=s.api_host, port=s.api_port, reload=True)
```

### 2. Probar arranque
```bash
cd agents
uvicorn api.main:app --reload --port 8000
```

Abrir http://localhost:8000/docs → debe mostrar Swagger con todos los endpoints.

### 3. Test smoke
```python
# tests/test_main_app.py
import pytest
from httpx import AsyncClient, ASGITransport


@pytest.mark.asyncio
async def test_app_starts(monkeypatch):
    monkeypatch.setenv("CITIZEN_REGISTRY_ADDRESS", "0x" + "a" * 40)
    monkeypatch.setenv("VOTE_CONTRACT_ADDRESS", "0x" + "b" * 40)
    monkeypatch.setenv("SIGNER_PRIVATE_KEY", "0x" + "c" * 64)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test")
    # tests reales necesitan mock del client; este es smoke de import
    from api.main import create_app
    app = create_app()
    assert any(r.path == "/health" for r in app.routes)
```

### 4. Commit
```bash
git add agents/api/main.py agents/tests/test_main_app.py
git commit -m "feat(agents): api/main.py app factory + lifespan (A-021)"
```

## Verificación / Definition of Done

- ✅ `uvicorn api.main:app` arranca sin crash.
- ✅ `/docs` muestra Swagger con todos los endpoints.
- ✅ `/health` responde.
- ✅ Lifespan inicializa blockchain_client antes del primer request.
- ✅ Si faltan env vars, NO arranca (fail-fast).

## Errores comunes

- **`assert_blockchain_ready` rompe en dev sin .env**
  Si querés correr el API sin blockchain, comentá el assert temporalmente. NO commitear sin assert para producción.

- **Hermes task no se cancela al apagar**
  El `finally` lo cancela. Si Hermes tiene loops sin shielding, puede tirar warning de "task pending" — aceptable.

## Lecturas
- [FastAPI — Lifespan](https://fastapi.tiangolo.com/advanced/events/)
- [Uvicorn](https://www.uvicorn.org/)

## Notas para revisor
- Confirmar que las imports de routes están en orden alfabético (estilo).
- ¿`hermes_task` se cancela al shutdown? Verificar con `Ctrl+C` y ver log "API stopping".
