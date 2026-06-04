---
id: A-020
title: "Middleware CORS configurable desde env"
owner: "junior"
backup: "Sandro"
effort: "30 min"
priority: P1
status: pending
depends_on: [A-001]
sprint: 1
layer: agents
---

# A-020 · Middleware CORS

## Por qué importa
El frontend (Next.js en localhost:3000) y el backend (FastAPI en localhost:8000) están en orígenes distintos. Sin CORS, el browser bloquea las peticiones. Mal configurado, exponemos el endpoint a cualquier sitio web del mundo (riesgo CSRF para acciones autenticadas).

## Conceptos clave
- **Same-Origin Policy**: regla del browser que bloquea fetch entre orígenes distintos por defecto.
- **CORS = "Cross-Origin Resource Sharing"**: protocolo de cabeceras que permite explícitamente ciertas combinaciones.
- **`allow_origins=["*"]`**: peligroso porque cualquiera puede llamar. Solo se permite si `allow_credentials=False`.
- **Lista blanca desde env**: en dev `http://localhost:3000`; en prod los dominios reales.

## Pre-requisitos
- [ ] [A-001](./A-001-setup-pyproject.md) cerrada.

## Paso a paso

### 1. Crear `api/middleware/cors.py`
```python
"""Configuración CORS basada en settings.cors_origins."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.config import get_settings


def configure_cors(app: FastAPI) -> None:
    s = get_settings()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=s.cors_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
        max_age=600,
    )
```

### 2. Defaults seguros
En `agents/.env.example`:
```
CORS_ORIGINS=http://localhost:3000
```

En producción:
```
CORS_ORIGINS=https://civicsys.org,https://app.civicsys.org
```

> NUNCA `*` con `allow_credentials=True` — FastAPI lo rechaza. Usar lista explícita.

### 3. Test smoke
```python
# tests/test_cors.py
import pytest
from httpx import AsyncClient, ASGITransport


@pytest.mark.asyncio
async def test_cors_header_se_envia():
    from api.main import create_app
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app), base_url="http://test") as ac:
        r = await ac.options("/health", headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        })
    assert r.headers.get("access-control-allow-origin") == "http://localhost:3000"


@pytest.mark.asyncio
async def test_cors_rechaza_origin_no_permitido():
    from api.main import create_app
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app), base_url="http://test") as ac:
        r = await ac.options("/health", headers={
            "Origin": "https://malicioso.com",
            "Access-Control-Request-Method": "GET",
        })
    assert r.headers.get("access-control-allow-origin") != "https://malicioso.com"
```

### 4. Commit
```bash
git add agents/api/middleware/cors.py agents/tests/test_cors.py
git commit -m "feat(agents): middleware CORS configurable (A-020)"
```

## Verificación / Definition of Done

- ✅ Headers CORS aparecen en preflight OPTIONS.
- ✅ Origin no listado es rechazado.
- ✅ Sin `*` con credentials.

## Errores comunes

- **Browser sigue bloqueando**
  Verificá que el browser no esté cacheando preflights (vaciar caché).

- **`allow_credentials=True` + `allow_origins=["*"]` = 500**
  FastAPI valida — uno u otro.

## Lecturas
- [MDN — CORS](https://developer.mozilla.org/docs/Web/HTTP/CORS)
- [FastAPI — CORS middleware](https://fastapi.tiangolo.com/tutorial/cors/)

## Notas para revisor
- ¿`allow_methods` incluye `OPTIONS`? Sí — necesario para preflight.
- En Sprint 2 considerar rate limit + CSRF token para POSTs.
