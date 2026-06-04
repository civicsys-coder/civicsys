---
id: A-006
title: "models/proposal.py — Proposal, ProposalCreate, ProposalResult"
owner: "junior"
backup: "Sandro"
effort: "1 h"
priority: P0
status: pending
depends_on: [A-001]
sprint: 1
layer: agents
---

# A-006 · Modelo `proposal.py`

## Por qué importa
La API expone propuestas via REST + MCP. Los modelos definen exactamente qué campos van en cada endpoint, qué se valida y qué se documenta automáticamente. Si el `Proposal` está bien diseñado, frontend y agentes consumen sin sorpresas.

## Conceptos clave
- **Tres modelos por entidad**: `ProposalCreate` (input al POST), `Proposal` (entidad completa que se devuelve), `ProposalResult` (vista solo de resultados). Patrón estándar REST.
- **`Enum` vs `Literal`**: Pydantic acepta ambos. `Enum` queda mejor en OpenAPI; `Literal` es más pythonic.
- **Validación de listas**: `min_length`, `max_length` sobre `list[str]`.
- **Timestamps unix**: `int` en segundos. Coincide con `uint64` de Solidity.

## Pre-requisitos
- [ ] [A-001](./A-001-setup-pyproject.md) cerrada.

## Paso a paso

### 1. Crear `api/models/proposal.py`
```python
"""Schemas de propuestas (creación, listado, resultados)."""
from __future__ import annotations

from enum import Enum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ProposalStatus(str, Enum):
    ACTIVE = "active"
    CLOSED = "closed"
    CANCELLED = "cancelled"

    @classmethod
    def from_onchain(cls, value: int) -> "ProposalStatus":
        return {0: cls.ACTIVE, 1: cls.CLOSED, 2: cls.CANCELLED}[value]


class ProposalCreate(BaseModel):
    """Body del POST /proposals (solo admin/curador)."""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    title: Annotated[str, Field(min_length=5, max_length=200)]
    description: Annotated[str, Field(min_length=10, max_length=5000)]
    options: Annotated[list[str], Field(min_length=2, max_length=32)]
    deadline: Annotated[int, Field(
        gt=0,
        description="Unix timestamp del cierre. Debe ser > now.",
    )]

    @model_validator(mode="after")
    def options_no_duplicadas(self) -> "ProposalCreate":
        normalized = [o.strip().lower() for o in self.options]
        if len(set(normalized)) != len(normalized):
            raise ValueError("options no pueden estar duplicadas")
        for o in self.options:
            if not o.strip():
                raise ValueError("ninguna option puede estar vacía")
            if len(o) > 80:
                raise ValueError(f"option demasiado larga (max 80 chars): {o[:30]}…")
        return self


class Proposal(BaseModel):
    """Vista canónica de una propuesta — usada en GET /proposals/{id}."""
    model_config = ConfigDict(extra="forbid")

    id: int = Field(ge=1)
    title: str
    description: str
    options: list[str]
    created_at: int = Field(ge=0)
    deadline: int = Field(ge=0)
    status: ProposalStatus
    curator: Annotated[str, Field(pattern=r"^0x[0-9a-fA-F]{40}$")]
    contract_address: Annotated[str, Field(pattern=r"^0x[0-9a-fA-F]{40}$")]


class ProposalSummary(BaseModel):
    """Versión liviana para GET /proposals (lista)."""
    model_config = ConfigDict(extra="forbid")

    id: int
    title: str
    deadline: int
    status: ProposalStatus
    total_votes: int = Field(ge=0)


class ProposalResult(BaseModel):
    """GET /proposals/{id}/results — tally + metadata mínima."""
    model_config = ConfigDict(extra="forbid")

    proposal_id: int = Field(ge=1)
    options: list[str]
    tally: list[int]
    total_votes: int = Field(ge=0)
    status: ProposalStatus
    closed_at: int | None = None

    @model_validator(mode="after")
    def tally_matches_options(self) -> "ProposalResult":
        if len(self.tally) != len(self.options):
            raise ValueError(
                f"tally ({len(self.tally)}) y options ({len(self.options)}) "
                f"deben tener la misma longitud"
            )
        if sum(self.tally) != self.total_votes:
            raise ValueError(f"total_votes {self.total_votes} != sum(tally) {sum(self.tally)}")
        return self


class ProposalCreateResponse(BaseModel):
    """Response del POST /proposals — confirma creación on-chain."""
    model_config = ConfigDict(extra="forbid")

    proposal_id: int = Field(ge=1)
    tx_hash: Annotated[str, Field(pattern=r"^0x[0-9a-fA-F]{64}$")]
    explorer_url: str
    block_number: int = Field(ge=0)
```

### 2. Test
Crear `tests/test_models_proposal.py`:

```python
import pytest
from pydantic import ValidationError

from api.models.proposal import (
    Proposal,
    ProposalCreate,
    ProposalResult,
    ProposalStatus,
    ProposalSummary,
)


def test_proposal_create_happy():
    p = ProposalCreate(
        title="Aprobar pavimentación SJL",
        description="Inversión de 5M soles en obras viales",
        options=["A favor", "En contra", "Abstención"],
        deadline=2000000000,
    )
    assert p.title == "Aprobar pavimentación SJL"
    assert len(p.options) == 3


def test_proposal_create_options_duplicadas():
    with pytest.raises(ValidationError, match="duplicadas"):
        ProposalCreate(
            title="Test",
            description="Descripción más larga",
            options=["A", "a"],
            deadline=2000000000,
        )


def test_proposal_create_options_vacias():
    with pytest.raises(ValidationError, match="vacía"):
        ProposalCreate(
            title="Test 12345",
            description="Descripción más larga",
            options=["A favor", ""],
            deadline=2000000000,
        )


def test_proposal_create_minimo_2_opciones():
    with pytest.raises(ValidationError):
        ProposalCreate(
            title="Test 12345",
            description="Descripción más larga",
            options=["Solo"],
            deadline=2000000000,
        )


def test_proposal_create_max_32_opciones():
    with pytest.raises(ValidationError):
        ProposalCreate(
            title="Test 12345",
            description="Descripción más larga",
            options=[f"opt{i}" for i in range(33)],
            deadline=2000000000,
        )


def test_proposal_status_from_onchain():
    assert ProposalStatus.from_onchain(0) == ProposalStatus.ACTIVE
    assert ProposalStatus.from_onchain(1) == ProposalStatus.CLOSED
    assert ProposalStatus.from_onchain(2) == ProposalStatus.CANCELLED
    with pytest.raises(KeyError):
        ProposalStatus.from_onchain(99)


def test_proposal_result_tally_consistente():
    r = ProposalResult(
        proposal_id=1,
        options=["A", "B"],
        tally=[5, 3],
        total_votes=8,
        status=ProposalStatus.ACTIVE,
    )
    assert r.total_votes == 8


def test_proposal_result_tally_mismatch():
    with pytest.raises(ValidationError, match="tally"):
        ProposalResult(
            proposal_id=1,
            options=["A", "B"],
            tally=[5],  # 1 valor para 2 options
            total_votes=5,
            status=ProposalStatus.ACTIVE,
        )


def test_proposal_result_total_mismatch():
    with pytest.raises(ValidationError, match="total_votes"):
        ProposalResult(
            proposal_id=1,
            options=["A", "B"],
            tally=[5, 3],
            total_votes=100,  # debería ser 8
            status=ProposalStatus.ACTIVE,
        )
```

```bash
pytest tests/test_models_proposal.py -v
```

### 3. Commit
```bash
git add agents/api/models/proposal.py agents/tests/test_models_proposal.py
git commit -m "feat(agents): modelos Pydantic proposal (A-006)"
```

## Verificación / Definition of Done

- ✅ Todos los tests pasan.
- ✅ `ProposalStatus.from_onchain(int) → enum` funciona.
- ✅ `tally_matches_options` valida consistencia.
- ✅ `options` rechaza vacías, duplicadas, > 32, < 2.

## Errores comunes

- **`model_validator` no se ejecuta**
  En Pydantic v2 hay `mode="before"` y `mode="after"`. Para validar dependencias entre campos, usar `mode="after"`.

- **Status comparado con string falla**
  `ProposalStatus.ACTIVE == "active"` → `True` (porque es `str, Enum`). Si se compara con int, falla. Documentarlo.

- **Lista de strings con espacios**
  `str_strip_whitespace=True` en `model_config` solo limpia strings de nivel raíz, no items de listas. Por eso el validator hace `.strip()` manual.

## Lecturas
- [Pydantic — Model validators](https://docs.pydantic.dev/latest/concepts/validators/#model-validators)
- [FastAPI — Response models](https://fastapi.tiangolo.com/tutorial/response-model/)

## Notas para revisor
- Verificar que `tally_matches_options` se ejecuta SIEMPRE (no solo cuando los campos cambian).
- ¿`Proposal.curator` permite "0x" + 0s? Sí — es válido como dirección "del sistema". Documentarlo si surge en review.
- `ProposalSummary` se usa en lista; `Proposal` en detalle. No mezclarlos.
