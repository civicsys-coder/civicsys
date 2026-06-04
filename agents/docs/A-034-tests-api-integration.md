---
id: A-034
title: "Tests integration API (httpx + AsyncClient)"
owner: "Gabriel"
backup: "Sandro"
effort: "2.5 h"
priority: P0
status: pending
depends_on: [A-021]
sprint: 1
layer: agents
---

# A-034 · Tests integration del API

## Por qué importa
Los unit tests de modelos/cliente sirven para invariantes locales. Los integration tests prueban que **rutas + middleware + dependencias** se enchufan bien. Si una ruta levanta una excepción mal, el integration test lo detecta.

## Conceptos clave
- **`AsyncClient` + `ASGITransport`**: prueban el app sin abrir un puerto. Más rápido y aislado.
- **Mocks vía `monkeypatch`**: reemplazamos `get_blockchain_client` con un `AsyncMock`.
- **Fixtures compartidas**: en `conftest.py` para no repetir.

## Pre-requisitos
- [ ] [A-021](./A-021-api-main.md) cerrada.

## Paso a paso

### 1. Crear `tests/conftest.py`
```python
"""Fixtures compartidas."""
from unittest.mock import AsyncMock

import pytest


@pytest.fixture
def fake_blockchain_client():
    fake = AsyncMock()
    fake.vote.address = "0x" + "b" * 40
    fake.registry.address = "0x" + "a" * 40
    return fake


@pytest.fixture(autouse=True)
def env_defaults(monkeypatch):
    monkeypatch.setenv("CITIZEN_REGISTRY_ADDRESS", "0x" + "a" * 40)
    monkeypatch.setenv("VOTE_CONTRACT_ADDRESS", "0x" + "b" * 40)
    monkeypatch.setenv("SIGNER_PRIVATE_KEY", "0x" + "c" * 64)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test")
    from api.config import get_settings
    get_settings.cache_clear()  # type: ignore[attr-defined]
```

### 2. Crear `tests/test_api_integration.py`
```python
"""Integration tests del API completo (mockeando blockchain)."""
import time
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio
async def test_register_to_vote_flow(monkeypatch, fake_blockchain_client):
    cid_hex = "0x" + "1" * 64
    fake_blockchain_client.register_citizen.return_value = {
        "citizen_id": cid_hex,
        "normalized_name": "JUAN PEREZ",
        "tx_hash": "0x" + "2" * 64,
        "block_number": 1,
        "explorer_url": "https://e.io/tx/0x...",
    }
    fake_blockchain_client.get_proposal.return_value = {
        "id": 1, "title": "Test", "description": "Desc",
        "options": ["A", "B"], "created_at": 0,
        "deadline": int(time.time()) + 3600, "status": 0,
        "curator": "0x" + "9" * 40,
    }
    fake_blockchain_client.cast_vote.return_value = {
        "proposal_id": 1,
        "tx_hash": "0x" + "3" * 64,
        "block_number": 2,
        "explorer_url": "https://e.io/tx/0x...",
    }
    fake_blockchain_client.tally.return_value = [1, 0]

    from api.services import blockchain_client as bc_mod
    monkeypatch.setattr(bc_mod, "get_blockchain_client", AsyncMock(return_value=fake_blockchain_client))

    from api.main import create_app
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app), base_url="http://test") as ac:
        # 1. Register
        r1 = await ac.post("/auth/register", json={"dni": "12345678", "full_name": "Juan Pérez"})
        assert r1.status_code == 201
        assert r1.json()["citizen_id"] == cid_hex

        # 2. Vote
        r2 = await ac.post(f"/proposals/1/vote", json={"citizen_id": cid_hex, "option": 0})
        assert r2.status_code == 201

        # 3. Results
        r3 = await ac.get("/proposals/1/results")
        assert r3.status_code == 200
        assert r3.json()["tally"] == [1, 0]


@pytest.mark.asyncio
async def test_register_dni_no_se_filtra_en_response(monkeypatch, fake_blockchain_client):
    fake_blockchain_client.register_citizen.return_value = {
        "citizen_id": "0x" + "a" * 64,
        "normalized_name": "JUAN PEREZ",
        "tx_hash": "0x" + "b" * 64,
        "block_number": 1,
        "explorer_url": "https://e.io/tx/0x...",
    }
    from api.services import blockchain_client as bc_mod
    monkeypatch.setattr(bc_mod, "get_blockchain_client", AsyncMock(return_value=fake_blockchain_client))
    from api.main import create_app
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app), base_url="http://test") as ac:
        r = await ac.post("/auth/register", json={"dni": "98765432", "full_name": "Otro Nombre"})
    assert "98765432" not in r.text
    assert "Otro Nombre" not in r.text  # nombre original tampoco — solo el normalized
```

### 3. Commit
```bash
git add agents/tests/conftest.py agents/tests/test_api_integration.py
git commit -m "test(agents): integration tests del API (A-034)"
```

## Verificación / Definition of Done

- ✅ Flow E2E mockeado pasa.
- ✅ DNI y nombre original NO aparecen en respuestas.
- ✅ Tests pasan en < 5s.

## Errores comunes

- **`get_settings.cache_clear()` no existe**
  Si usás `Settings()` directo, no necesita clearcache. Si usás `lru_cache`, sí. Confirmar.

## Lecturas
- [FastAPI testing](https://fastapi.tiangolo.com/tutorial/testing/)

## Notas para revisor
- Los tests no deben tocar la red real. Confirmar con grep que no hay `rpc-zk.tanenbaum.io` en código de tests.
