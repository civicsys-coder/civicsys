---
id: A-015
title: "routes/proposals.py — GET list, POST, GET /{id}/results"
owner: "junior"
backup: "Sandro"
effort: "2.5 h"
priority: P0
status: pending
depends_on: [A-006, A-011]
sprint: 1
layer: agents
---

# A-015 · Ruta `proposals.py`

## Por qué importa
Tres endpoints, un módulo:
- `GET /proposals` — el menú deliberativo.
- `POST /proposals` — alta (solo curador en demo).
- `GET /proposals/{id}/results` — el tally en tiempo real.

Es el "menú principal" del demo público.

## Conceptos clave
- **Listing en Sprint 1**: leemos del contrato directo. Aceptable hasta 100 propuestas.
- **Cache opcional**: para Sprint 1 no lo aplicamos, pero el endpoint puede ser cacheado 30s sin pérdida real de UX.
- **Decimal point**: el `deadline` debe ser **mayor** que `now` cuando llega al contrato; si tardas en validar y enviar, puede expirar entre validar y minar.

## Pre-requisitos
- [ ] [A-006](./A-006-modelo-proposal.md), [A-011](./A-011-blockchain-client-proposals.md) cerradas.

## Paso a paso

### 1. Crear `api/routes/proposals.py`
```python
"""Rutas de propuestas: list / create / results."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status

from api.models.proposal import (
    Proposal,
    ProposalCreate,
    ProposalCreateResponse,
    ProposalResult,
    ProposalStatus,
    ProposalSummary,
)
from api.services.blockchain_client import (
    BlockchainClient,
    BlockchainError,
    get_blockchain_client,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/proposals", tags=["proposals"])


@router.get("", response_model=list[ProposalSummary])
async def list_proposals(
    only_active: bool = Query(default=False),
    client: BlockchainClient = Depends(get_blockchain_client),
) -> list[ProposalSummary]:
    raw = await client.list_proposals(only_active=only_active)
    summaries = []
    for p in raw:
        t = await client.tally(p["id"])
        summaries.append(
            ProposalSummary(
                id=p["id"],
                title=p["title"],
                deadline=p["deadline"],
                status=ProposalStatus.from_onchain(p["status"]),
                total_votes=sum(t),
            )
        )
    return summaries


@router.post(
    "",
    response_model=ProposalCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_proposal(
    body: ProposalCreate,
    client: BlockchainClient = Depends(get_blockchain_client),
) -> ProposalCreateResponse:
    import time
    if body.deadline <= int(time.time()):
        raise HTTPException(
            status_code=400,
            detail={"code": "DEADLINE_IN_PAST", "message": "deadline debe ser > now"},
        )
    try:
        result = await client.create_proposal(
            title=body.title,
            description=body.description,
            options=list(body.options),
            deadline=body.deadline,
        )
    except BlockchainError as e:
        logger.exception("create_proposal failed: %s", e)
        raise HTTPException(
            status_code=503,
            detail={"code": "BLOCKCHAIN_ERROR", "message": "no se pudo crear"},
        )
    return ProposalCreateResponse(**result)


@router.get("/{proposal_id}", response_model=Proposal)
async def get_proposal(
    proposal_id: int = Path(..., ge=1),
    client: BlockchainClient = Depends(get_blockchain_client),
) -> Proposal:
    p = await client.get_proposal(proposal_id)
    if p is None:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"})
    return Proposal(
        id=p["id"],
        title=p["title"],
        description=p["description"],
        options=p["options"],
        created_at=p["created_at"],
        deadline=p["deadline"],
        status=ProposalStatus.from_onchain(p["status"]),
        curator=p["curator"],
        contract_address=client.vote.address,
    )


@router.get("/{proposal_id}/results", response_model=ProposalResult)
async def get_results(
    proposal_id: int = Path(..., ge=1),
    client: BlockchainClient = Depends(get_blockchain_client),
) -> ProposalResult:
    p = await client.get_proposal(proposal_id)
    if p is None:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"})
    t = await client.tally(proposal_id)
    return ProposalResult(
        proposal_id=proposal_id,
        options=p["options"],
        tally=t,
        total_votes=sum(t),
        status=ProposalStatus.from_onchain(p["status"]),
    )
```

### 2. Test
```python
# tests/test_route_proposals.py — esqueleto
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock


@pytest.mark.asyncio
async def test_list_proposals(monkeypatch):
    fake_client = AsyncMock()
    fake_client.list_proposals.return_value = [
        {"id": 1, "title": "X", "description": "Y", "options": ["A", "B"],
         "created_at": 1, "deadline": 2_000_000_000, "status": 0, "curator": "0x" + "a" * 40},
    ]
    fake_client.tally.return_value = [3, 2]

    from api.main import create_app
    from api.services import blockchain_client as bc_mod
    monkeypatch.setattr(bc_mod, "get_blockchain_client", AsyncMock(return_value=fake_client))

    app = create_app()
    async with AsyncClient(transport=ASGITransport(app), base_url="http://test") as ac:
        r = await ac.get("/proposals")
    assert r.status_code == 200
    items = r.json()
    assert len(items) == 1
    assert items[0]["total_votes"] == 5
```

### 3. Commit
```bash
git add agents/api/routes/proposals.py agents/tests/test_route_proposals.py
git commit -m "feat(agents): rutas /proposals (list/create/get/results) (A-015)"
```

## Verificación / Definition of Done

- ✅ GET /proposals retorna lista filtrable por `only_active`.
- ✅ POST /proposals con deadline en el pasado → 400.
- ✅ GET /proposals/999 inexistente → 404.
- ✅ GET /proposals/{id}/results retorna tally consistente.

## Errores comunes

- **`total_votes` no coincide con `sum(tally)`**
  Sucede si entre `list_proposals` y `tally` alguien votó. Para sprint 1 aceptamos esa inconsistencia raras veces; en Sprint 2 usamos snapshot block.

- **POST sin auth de curador**
  Sprint 1: la API firma con `apiSigner` que tiene `CURATOR_ROLE`. Eso es "auth via custodial". Sprint 2: agregar API key o JWT.

## Lecturas
- [FastAPI — Path + Query params](https://fastapi.tiangolo.com/tutorial/query-params/)

## Notas para revisor
- ¿`contract_address` es el de `Vote.sol`? Confirmar (no es el de `CitizenRegistry`).
- En Sprint 2, considerar paginar `GET /proposals?cursor=X` cuando haya 1000+.
