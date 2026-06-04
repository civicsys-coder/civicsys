---
id: A-017
title: "routes/reports.py — GET /reports/{proposal_id}"
owner: "junior"
backup: "Sandro"
effort: "1.5 h"
priority: P0
status: pending
depends_on: [A-008, A-024]
sprint: 1
layer: agents
---

# A-017 · Ruta `reports.py`

## Por qué importa
Es el endpoint que **devuelve el producto de Hermes** al consumidor. Si Hermes ya generó el reporte (caché en disco), lo servimos rápido. Si no, lo generamos on-demand (caro, ~5-10s con LLM) y cacheamos.

## Conceptos clave
- **Caché en disco**: `agents/hermes/memory/sessions/proposal_<id>.json` guarda el reporte. Sprint 2: Postgres.
- **Generación lazy**: si no existe el archivo, lo generamos. Sprint 2: el listener lo genera proactivo.
- **204 vs 404**: si la propuesta sigue activa (no cerró), no hay reporte. Decidimos 425 (Too Early) o 202 (Accepted).

## Pre-requisitos
- [ ] [A-008](./A-008-modelo-report.md), [A-024](./A-024-hermes-runtime.md) cerradas.

## Paso a paso

### 1. Crear `api/routes/reports.py`
```python
"""Ruta de reportes generados por Hermes."""
from __future__ import annotations

import json
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Path as PathParam, status

from api.config import get_settings
from api.models.report import Report
from api.services.blockchain_client import (
    BlockchainClient,
    get_blockchain_client,
)
from api.models.proposal import ProposalStatus

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["reports"])


def _report_path(proposal_id: int) -> Path:
    s = get_settings()
    d = s.hermes_memory_dir / "sessions"
    d.mkdir(parents=True, exist_ok=True)
    return d / f"proposal_{proposal_id}.json"


@router.get(
    "/{proposal_id}",
    response_model=Report,
    responses={
        404: {"description": "propuesta no existe"},
        425: {"description": "propuesta sigue activa, sin reporte aún"},
        503: {"description": "Hermes no pudo generar"},
    },
)
async def get_report(
    proposal_id: int = PathParam(..., ge=1),
    client: BlockchainClient = Depends(get_blockchain_client),
) -> Report:
    # 1. Validar que la propuesta existe
    p = await client.get_proposal(proposal_id)
    if p is None:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"})

    # 2. Si hay caché en disco, devolverlo
    cache_file = _report_path(proposal_id)
    if cache_file.exists():
        return Report(**json.loads(cache_file.read_text()))

    # 3. Si la propuesta sigue activa, no hay reporte aún
    if ProposalStatus.from_onchain(p["status"]) == ProposalStatus.ACTIVE:
        raise HTTPException(
            status_code=425,  # Too Early
            detail={
                "code": "PROPOSAL_NOT_CLOSED",
                "message": "El reporte se genera cuando la propuesta cierra",
            },
        )

    # 4. Generar on-demand (lazy)
    try:
        from hermes.reporter import generate_report_for_proposal
        report = await generate_report_for_proposal(proposal_id, client)
    except Exception as e:
        logger.exception("report generation failed: %s", e)
        raise HTTPException(
            status_code=503,
            detail={"code": "REPORT_GEN_ERROR", "message": "no se pudo generar"},
        )

    cache_file.write_text(report.model_dump_json(indent=2))
    return report
```

### 2. Test
```python
# tests/test_route_reports.py
import json
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock


@pytest.mark.asyncio
async def test_report_not_closed_yet(monkeypatch, tmp_path):
    fake = AsyncMock()
    fake.get_proposal.return_value = {
        "id": 1, "title": "X", "description": "Y", "options": ["A", "B"],
        "created_at": 0, "deadline": 2_000_000_000, "status": 0,
        "curator": "0x" + "a" * 40,
    }
    from api import config
    monkeypatch.setattr(config.settings, "hermes_memory_dir", tmp_path)
    from api.services import blockchain_client as bc_mod
    monkeypatch.setattr(bc_mod, "get_blockchain_client", AsyncMock(return_value=fake))

    from api.main import create_app
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app), base_url="http://test") as ac:
        r = await ac.get("/reports/1")
    assert r.status_code == 425


@pytest.mark.asyncio
async def test_report_cache_hit(monkeypatch, tmp_path):
    cache_file = tmp_path / "sessions" / "proposal_1.json"
    cache_file.parent.mkdir(parents=True, exist_ok=True)
    report_data = {
        "proposal_id": 1, "title": "X",
        "markdown": "# Reporte de prueba con suficiente contenido para pasar validación",
        "confidence": 0.8, "llm_model": "claude", "generated_at": 1, "options": ["A", "B"],
        "tally": [3, 2], "sources": [{"kind": "onchain_event", "ref": "0x" + "a" * 64}],
    }
    cache_file.write_text(json.dumps(report_data))

    fake = AsyncMock()
    fake.get_proposal.return_value = {
        "id": 1, "title": "X", "description": "Y", "options": ["A", "B"],
        "created_at": 0, "deadline": 0, "status": 1,
        "curator": "0x" + "a" * 40,
    }
    from api import config
    monkeypatch.setattr(config.settings, "hermes_memory_dir", tmp_path)
    from api.services import blockchain_client as bc_mod
    monkeypatch.setattr(bc_mod, "get_blockchain_client", AsyncMock(return_value=fake))

    from api.main import create_app
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app), base_url="http://test") as ac:
        r = await ac.get("/reports/1")
    assert r.status_code == 200
    assert r.json()["proposal_id"] == 1
```

### 3. Commit
```bash
git add agents/api/routes/reports.py agents/tests/test_route_reports.py
git commit -m "feat(agents): ruta GET /reports/{id} con cache (A-017)"
```

## Verificación / Definition of Done

- ✅ Cache hit responde rápido (sin LLM).
- ✅ Cache miss + propuesta cerrada → llama Hermes y guarda cache.
- ✅ Propuesta activa → 425.
- ✅ Propuesta inexistente → 404.

## Errores comunes

- **`generate_report_for_proposal` no existe**
  Se crea en [A-023](./A-023-hermes-reporter.md)/[A-024](./A-024-hermes-runtime.md). Mientras tanto, marcar el test como `xfail`.

- **Cache no se invalida si redesplegamos contrato**
  Sprint 1: borrar manualmente. Sprint 2: cache key incluye `contract_address`.

## Lecturas
- [HTTP 425 Too Early](https://developer.mozilla.org/docs/Web/HTTP/Status/425)

## Notas para revisor
- ¿La cache file path se construye de forma segura? `_report_path(proposal_id)` solo acepta int. Path traversal imposible.
- En Sprint 2 considerar mover cache a Redis/Postgres.
