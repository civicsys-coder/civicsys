---
id: A-014
title: "routes/auth.py — POST /auth/register, GET /auth/status"
owner: "junior"
backup: "Sandro"
effort: "2 h"
priority: P0
status: pending
depends_on: [A-005, A-010]
sprint: 1
layer: agents
---

# A-014 · Ruta `auth.py`

## Por qué importa
Es el primer endpoint que toca un ciudadano: si la experiencia es mala (mensajes confusos, tiempos eternos, errores 500), el demo se cae. Más crítico: es **el endpoint que recibe DNI**, así que cada decisión cuenta para T2/T6 del threat model.

## Conceptos clave
- **Dependency injection FastAPI**: `client = Depends(get_blockchain_client)` pasa el cliente sin globalss.
- **Manejo de errores → HTTPException**: traducimos las excepciones de `blockchain_client` a códigos HTTP que el frontend entiende.
- **`response_model` explícito**: garantiza que FastAPI filtre campos no declarados al serializar.

## Pre-requisitos
- [ ] [A-005](./A-005-modelo-auth.md), [A-010](./A-010-blockchain-client-register.md) cerradas.

## Paso a paso

### 1. Crear `api/routes/auth.py`
```python
"""Rutas de autenticación (registro y status de ciudadanos)."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Path, status

from api.models.auth import (
    AuthStatusResponse,
    RegisterRequest,
    RegisterResponse,
)
from api.services.blockchain_client import (
    BlockchainClient,
    BlockchainError,
    CitizenAlreadyRegistered,
    get_blockchain_client,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"description": "DNI o nombre inválido"},
        409: {"description": "Ciudadano ya registrado"},
        503: {"description": "Blockchain indisponible"},
    },
)
async def register_citizen(
    body: RegisterRequest,
    client: BlockchainClient = Depends(get_blockchain_client),
) -> RegisterResponse:
    """Registra un ciudadano on-chain.

    El DNI se hashea junto con el nombre normalizado y un salt público.
    El DNI NUNCA se persiste ni loguea.
    """
    try:
        result = await client.register_citizen(body.dni, body.full_name)
    except CitizenAlreadyRegistered:
        # NO incluimos el citizen_id en el response para no facilitar dox
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "ALREADY_REGISTERED", "message": "Ciudadano ya registrado"},
        )
    except BlockchainError as e:
        # No exponemos el detalle interno
        logger.exception("register_citizen blockchain error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "BLOCKCHAIN_ERROR", "message": "No se pudo registrar"},
        )

    # Limpiar referencias al DNI (paranoia)
    del body
    return RegisterResponse(**result)


@router.get(
    "/status/{citizen_id}",
    response_model=AuthStatusResponse,
)
async def auth_status(
    citizen_id: str = Path(..., pattern=r"^0x[0-9a-fA-F]{64}$"),
    client: BlockchainClient = Depends(get_blockchain_client),
) -> AuthStatusResponse:
    """Verifica si un citizen_id (hash) está registrado on-chain.

    NO recibe DNI — solo el hash. Útil para frontends que cachan el hash
    después del POST.
    """
    citizen = await client.get_citizen(citizen_id)
    if citizen is None:
        return AuthStatusResponse(citizen_id=citizen_id, is_registered=False)
    return AuthStatusResponse(
        citizen_id=citizen_id,
        is_registered=bool(citizen["active"]),
        registered_at=int(citizen["registered_at"]),
    )
```

### 2. Test con `httpx` AsyncClient
```python
# tests/test_route_auth.py
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, AsyncMock


@pytest.mark.asyncio
async def test_register_happy(monkeypatch):
    fake_result = {
        "citizen_id": "0x" + "a" * 64,
        "normalized_name": "JUAN PEREZ",
        "tx_hash": "0x" + "b" * 64,
        "block_number": 10,
        "explorer_url": "https://e.io/tx/0xb",
    }
    fake_client = AsyncMock()
    fake_client.register_citizen.return_value = fake_result

    from api.main import create_app
    from api.services import blockchain_client as bc_mod
    monkeypatch.setattr(bc_mod, "get_blockchain_client", AsyncMock(return_value=fake_client))

    app = create_app()
    async with AsyncClient(transport=ASGITransport(app), base_url="http://test") as ac:
        r = await ac.post("/auth/register", json={"dni": "12345678", "full_name": "Juan Pérez"})
    assert r.status_code == 201
    assert r.json()["citizen_id"] == fake_result["citizen_id"]
    # No leakea DNI en la response
    assert "12345678" not in r.text
    assert "dni" not in r.json()


@pytest.mark.asyncio
async def test_register_dni_invalido(monkeypatch):
    from api.main import create_app
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app), base_url="http://test") as ac:
        r = await ac.post("/auth/register", json={"dni": "123", "full_name": "Juan Pérez"})
    assert r.status_code == 422
```

### 3. Commit
```bash
git add agents/api/routes/auth.py agents/tests/test_route_auth.py
git commit -m "feat(agents): rutas /auth/register y /auth/status (A-014)"
```

## Verificación / Definition of Done

- ✅ POST /auth/register devuelve 201 con tx_hash.
- ✅ POST con DNI inválido devuelve 422 (validación Pydantic).
- ✅ POST con citizen ya registrado devuelve 409.
- ✅ GET /auth/status devuelve `is_registered: false` para hashes no registrados.
- ✅ La response **NO** incluye el DNI original.

## Errores comunes

- **El test no encuentra `create_app`**
  Se crea en [A-021](./A-021-api-main.md). Hasta entonces, marcar el test como `pytest.mark.skip` o crear un app mínimo provisorio.

- **`HTTPException(detail=dict)` no se documenta bien en OpenAPI**
  En Sprint 2 podemos usar un schema custom. Para Sprint 1 alcanza.

- **`del body` parece innecesario**
  En Python no fuerza GC pero declara intención. Útil cuando alguien lee el código.

## Lecturas
- [FastAPI — Dependencies](https://fastapi.tiangolo.com/tutorial/dependencies/)
- [`docs/security/threat-model-sprint1.md` § T2](../../docs/security/threat-model-sprint1.md)

## Notas para revisor
- ⚠️ Grep: `grep -i "dni" agents/api/routes/auth.py` debe aparecer solo en docstrings y en `body.dni` (no en logs/responses).
- El test `test_register_happy` verifica que `"12345678" not in r.text` — buena guardrail.
- `auth_status` no recibe DNI ni full_name — confirmar.
