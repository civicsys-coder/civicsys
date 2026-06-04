---
id: A-007
title: "models/vote.py — VoteRequest, VoteResult"
owner: "junior"
backup: "Sandro"
effort: "30 min"
priority: P0
status: pending
depends_on: [A-001]
sprint: 1
layer: agents
---

# A-007 · Modelo `vote.py`

## Por qué importa
El endpoint `POST /proposals/{id}/vote` recibe el `citizen_id` (hash) y la opción seleccionada. Si los modelos rechazan datos malformados antes de tocar el contrato, ahorramos gas y txs falladas. Si los rechazan después, la UX es pésima.

## Conceptos clave
- **`uint8` constraint**: la opción es `uint8` en Solidity → 0–255. Aplicamos `ge=0, le=255` en Pydantic.
- **No revelamos voto en la response**: para no facilitar nudging, la respuesta confirma `tx_hash` pero no qué opción se votó.
- **`citizen_id` viene del cliente**: el cliente lo precalcula con el mismo `PUBLIC_SALT` (o lo recibe del registro). En Sprint 1 podemos también calcularlo en el server si nos pasan `dni+full_name` — discutirlo.

## Pre-requisitos
- [ ] [A-001](./A-001-setup-pyproject.md) cerrada.

## Paso a paso

### 1. Crear `api/models/vote.py`
```python
"""Schemas de voto (emisión y resultado)."""
from __future__ import annotations

from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


class VoteRequest(BaseModel):
    """Body del POST /proposals/{id}/vote.

    Espera el `citizen_id` precomputado. El cliente (frontend o MCP)
    debe haber registrado al ciudadano previamente.
    """
    model_config = ConfigDict(extra="forbid")

    citizen_id: Annotated[str, Field(
        pattern=r"^0x[0-9a-fA-F]{64}$",
        description="keccak256 del ciudadano. Resultado del POST /auth/register.",
    )]
    option: Annotated[int, Field(
        ge=0,
        le=255,
        description="Indice de la opción (0-based) según `Proposal.options`.",
    )]


class VoteResponse(BaseModel):
    """Confirmación del voto.

    NO incluye `option` para no exponer el voto en el response cuando la
    propuesta sigue activa.
    """
    model_config = ConfigDict(extra="forbid")

    proposal_id: int = Field(ge=1)
    tx_hash: Annotated[str, Field(pattern=r"^0x[0-9a-fA-F]{64}$")]
    explorer_url: str
    block_number: int = Field(ge=0)


class VoteErrorResponse(BaseModel):
    """Errores documentados del POST vote."""
    model_config = ConfigDict(extra="forbid")

    code: Annotated[str, Field(
        pattern=r"^[A-Z_]+$",
        examples=[
            "PROPOSAL_NOT_ACTIVE",
            "PROPOSAL_EXPIRED",
            "INVALID_OPTION",
            "CITIZEN_NOT_REGISTERED",
            "ALREADY_VOTED",
            "BLOCKCHAIN_ERROR",
        ],
    )]
    message: str = Field(max_length=300)
```

### 2. Tests rápidos
Crear `tests/test_models_vote.py`:

```python
import pytest
from pydantic import ValidationError

from api.models.vote import VoteRequest, VoteResponse


def test_vote_request_happy():
    r = VoteRequest(citizen_id="0x" + "a" * 64, option=0)
    assert r.option == 0


@pytest.mark.parametrize("citizen_id", [
    "not-hex",
    "0x" + "z" * 64,
    "0xab",
    "ab" * 32,        # sin 0x
    "0X" + "a" * 64,  # capital X
])
def test_vote_request_citizen_id_invalido(citizen_id):
    with pytest.raises(ValidationError):
        VoteRequest(citizen_id=citizen_id, option=0)


@pytest.mark.parametrize("option", [-1, 256, 999])
def test_vote_request_option_fuera_rango(option):
    with pytest.raises(ValidationError):
        VoteRequest(citizen_id="0x" + "a" * 64, option=option)


def test_vote_response_no_expone_option():
    r = VoteResponse(
        proposal_id=1,
        tx_hash="0x" + "a" * 64,
        explorer_url="https://e.io/tx/0x...",
        block_number=10,
    )
    assert "option" not in r.model_dump()
```

### 3. Commit
```bash
git add agents/api/models/vote.py agents/tests/test_models_vote.py
git commit -m "feat(agents): modelos Pydantic vote (A-007)"
```

## Verificación / Definition of Done

```bash
pytest tests/test_models_vote.py -v
```

- ✅ Todos los tests pasan.
- ✅ `VoteResponse` confirmadamente NO incluye `option`.
- ✅ `citizen_id` rechaza valores no-hex.

## Errores comunes

- **El pattern acepta `0X...` mayúscula**
  El regex `^0x` es estricto en minúscula. Eso es intencional (ethers v6 también es lowercase). Si querés ambos: `^0[xX]`.

- **`option` acepta string `"0"` y lo castea a 0**
  Pydantic v2 hace coercion. Si necesitás estricto, usar `strict=True` en `Field`. Para Sprint 1 mantenemos lax.

## Lecturas
- [Pydantic v2 — Strict mode](https://docs.pydantic.dev/latest/concepts/strict_mode/)

## Notas para revisor
- ¿Hay test confirmando que `option=-1` falla? Sí — buenísimo, porque ese sería un underflow potencial si llegara al contrato.
- En Sprint 2, considerar que un mismo `citizen_id` no pueda mandar `option` repetido (validar antes de la tx). Pero el contrato ya lo rechaza con `AlreadyVoted`.
