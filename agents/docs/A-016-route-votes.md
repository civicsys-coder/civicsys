---
id: A-016
title: "routes/votes.py — POST /proposals/{id}/vote"
owner: "junior"
backup: "Sandro"
effort: "1.5 h"
priority: P0
status: pending
depends_on: [A-007, A-012]
sprint: 1
layer: agents
---

# A-016 · Ruta `votes.py`

## Por qué importa
Es el endpoint con más invariantes blockchain: existencia de propuesta, estado, deadline, registro, no-duplicado. La ruta debe traducir cada caso a un código HTTP útil — un solo `500` genérico es UX miserable.

## Conceptos clave
- **Mapping excepciones → códigos**:

| Excepción | HTTP | Code |
|-----------|------|------|
| `ProposalNotActive` | 409 | `PROPOSAL_NOT_ACTIVE` |
| `ProposalExpired` | 410 | `PROPOSAL_EXPIRED` |
| `CitizenNotInRegistry` | 403 | `CITIZEN_NOT_REGISTERED` |
| `AlreadyVoted` | 409 | `ALREADY_VOTED` |
| `BlockchainError` | 503 | `BLOCKCHAIN_ERROR` |

- **Sin auth Sprint 1**: el `citizen_id` viene del body. Sprint 2: validar contra una sesión.

## Pre-requisitos
- [ ] [A-007](./A-007-modelo-vote.md), [A-012](./A-012-blockchain-client-vote-tally.md) cerradas.

## Paso a paso

### 1. Crear `api/routes/votes.py`
```python
"""Ruta de emisión de voto."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Path, status

from api.models.vote import VoteRequest, VoteResponse
from api.services.blockchain_client import (
    AlreadyVoted,
    BlockchainClient,
    BlockchainError,
    CitizenNotInRegistry,
    ProposalExpired,
    ProposalNotActive,
    get_blockchain_client,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/proposals", tags=["votes"])


@router.post(
    "/{proposal_id}/vote",
    response_model=VoteResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        403: {"description": "ciudadano no registrado"},
        409: {"description": "ya votó o propuesta inactiva"},
        410: {"description": "propuesta expirada"},
        503: {"description": "blockchain indisponible"},
    },
)
async def cast_vote(
    body: VoteRequest,
    proposal_id: int = Path(..., ge=1),
    client: BlockchainClient = Depends(get_blockchain_client),
) -> VoteResponse:
    # Confirmar que la opción cabe en la propuesta
    p = await client.get_proposal(proposal_id)
    if p is None:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"})
    if body.option >= len(p["options"]):
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_OPTION", "message": f"option fuera de rango (max {len(p['options'])-1})"},
        )

    try:
        result = await client.cast_vote(proposal_id, body.citizen_id, body.option)
    except CitizenNotInRegistry:
        raise HTTPException(
            status_code=403,
            detail={"code": "CITIZEN_NOT_REGISTERED", "message": "Ciudadano no registrado"},
        )
    except AlreadyVoted:
        raise HTTPException(
            status_code=409,
            detail={"code": "ALREADY_VOTED", "message": "El ciudadano ya votó en esta propuesta"},
        )
    except ProposalNotActive:
        raise HTTPException(
            status_code=409,
            detail={"code": "PROPOSAL_NOT_ACTIVE", "message": "La propuesta no acepta votos"},
        )
    except ProposalExpired:
        raise HTTPException(
            status_code=410,
            detail={"code": "PROPOSAL_EXPIRED", "message": "Pasó el deadline"},
        )
    except BlockchainError as e:
        logger.exception("cast_vote unexpected: %s", e)
        raise HTTPException(
            status_code=503,
            detail={"code": "BLOCKCHAIN_ERROR", "message": "no se pudo votar"},
        )
    return VoteResponse(**result)
```

### 2. Test
```python
# tests/test_route_votes.py — happy + error paths
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock
from api.services.blockchain_client import AlreadyVoted


@pytest.mark.asyncio
async def test_cast_vote_already_voted(monkeypatch):
    fake = AsyncMock()
    fake.get_proposal.return_value = {
        "id": 1, "title": "X", "description": "Y", "options": ["A", "B"],
        "created_at": 0, "deadline": 2_000_000_000, "status": 0, "curator": "0x" + "a" * 40,
    }
    fake.cast_vote.side_effect = AlreadyVoted("citizen 0x...")
    from api.main import create_app
    from api.services import blockchain_client as bc_mod
    monkeypatch.setattr(bc_mod, "get_blockchain_client", AsyncMock(return_value=fake))

    app = create_app()
    async with AsyncClient(transport=ASGITransport(app), base_url="http://test") as ac:
        r = await ac.post("/proposals/1/vote", json={"citizen_id": "0x" + "a" * 64, "option": 0})
    assert r.status_code == 409
    assert r.json()["detail"]["code"] == "ALREADY_VOTED"
```

### 3. Commit
```bash
git add agents/api/routes/votes.py agents/tests/test_route_votes.py
git commit -m "feat(agents): ruta POST /proposals/{id}/vote (A-016)"
```

## Verificación / Definition of Done

- ✅ Happy path: 201 con `tx_hash`.
- ✅ Cada excepción del cliente mapea al código HTTP correcto.
- ✅ Option fuera de rango devuelve 400 (no tira gas).
- ✅ Response NO incluye `option`.

## Errores comunes

- **Doble vote no se rechaza**
  Revisar que el pre-check `has_voted` en el cliente esté antes del `cast_vote`. Si no, el contrato tira `AlreadyVoted` (caro pero correcto).

## Lecturas
- [FastAPI — Status codes](https://fastapi.tiangolo.com/tutorial/response-status-code/)

## Notas para revisor
- ¿410 Gone es semánticamente correcto para "expirada"? Sí — recurso ya no disponible.
- Verificar el rate limit en Sprint 2 (un ciudadano spammeando 10 votos por segundo es señal de bot).
