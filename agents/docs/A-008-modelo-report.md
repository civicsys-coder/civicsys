---
id: A-008
title: "models/report.py — Report con metadata trazable"
owner: "junior"
backup: "Sandro"
effort: "45 min"
priority: P0
status: pending
depends_on: [A-001]
sprint: 1
layer: agents
---

# A-008 · Modelo `report.py`

## Por qué importa
El reporte de Hermes es **el producto narrativo del demo**. Si los modelos son pobres (solo `markdown: str`), perdemos toda la metadata trazable que requiere el [INSTINCT.md](../hermes/soul/INSTINCT.md): tx_hash, confidence_score, fuentes citadas. Definirlo bien acá garantiza que el `reporter.py` y el `routes/reports.py` no inventen formatos sobre la marcha.

## Conceptos clave
- **Confidence score**: float ∈ [0, 1]. Hermes lo asigna basado en cantidad de datos disponibles, ambigüedad del tally (ej. empate técnico baja la confianza), etc.
- **Source attribution**: cada reporte cita al menos un `tx_hash` (de `ProposalClosed`). Más en Sprint 2+.
- **Versión del modelo LLM**: registramos qué modelo generó el reporte, para auditoría futura ("¿este reporte sesgado lo hizo claude-sonnet-4 o 3.5?").

## Pre-requisitos
- [ ] [A-001](./A-001-setup-pyproject.md) cerrada.

## Paso a paso

### 1. Crear `api/models/report.py`
```python
"""Schemas del reporte generado por Hermes."""
from __future__ import annotations

from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class ReportSource(BaseModel):
    """Una fuente citada por Hermes en el reporte.

    En Sprint 1, la única fuente es el evento on-chain. En Sprint 2+
    podrán ser noticias, leyes, otros reportes.
    """
    model_config = ConfigDict(extra="forbid")

    kind: Annotated[str, Field(pattern=r"^[a-z_]+$", examples=["onchain_event", "law_text", "news_article"])]
    ref: str = Field(description="tx_hash, URL, ID legislativo, etc.")
    explorer_url: HttpUrl | None = None
    note: str | None = Field(default=None, max_length=300)


class Report(BaseModel):
    """Reporte completo generado por Hermes.

    Estructura del markdown:
    - H1 con el título de la propuesta
    - H2 "Resumen" (3-5 líneas)
    - H2 "Distribución de votos" (tabla)
    - H2 "Observaciones de Hermes" (≤ 200 palabras, sin afiliación política)
    - H2 "Trazabilidad" (lista de sources)
    """
    model_config = ConfigDict(extra="forbid")

    proposal_id: int = Field(ge=1)
    title: str = Field(max_length=200)
    markdown: str = Field(min_length=50, max_length=20000)
    confidence: Annotated[float, Field(ge=0.0, le=1.0)]
    llm_model: str = Field(description="ej. 'claude-sonnet-4-6'")
    generated_at: int = Field(ge=0, description="unix ts de generación")
    sources: list[ReportSource] = Field(default_factory=list, min_length=1)
    tally: list[int] = Field(min_length=2)
    options: list[str] = Field(min_length=2)


class ReportSummary(BaseModel):
    """Vista liviana para listados."""
    model_config = ConfigDict(extra="forbid")

    proposal_id: int = Field(ge=1)
    title: str
    confidence: float
    generated_at: int
    excerpt: str = Field(max_length=300, description="Primeras palabras del markdown")


class ReportGenerateRequest(BaseModel):
    """Body del POST /reports/{proposal_id}/regenerate (opcional Sprint 2)."""
    model_config = ConfigDict(extra="forbid")

    force: bool = Field(default=False, description="Regenera aunque haya cache")
```

### 2. Test
Crear `tests/test_models_report.py`:

```python
import pytest
from pydantic import ValidationError

from api.models.report import Report, ReportSource


def test_report_happy():
    r = Report(
        proposal_id=1,
        title="Aprobar pavimentación",
        markdown="# Aprobar pavimentación\n\nDescripción suficientemente larga del reporte generado.",
        confidence=0.85,
        llm_model="claude-sonnet-4-6",
        generated_at=1700000000,
        sources=[
            ReportSource(
                kind="onchain_event",
                ref="0x" + "a" * 64,
                explorer_url="https://explorer-zk.tanenbaum.io/tx/0xabc",
            )
        ],
        tally=[10, 5],
        options=["A favor", "En contra"],
    )
    assert r.confidence == 0.85


def test_report_confidence_fuera_rango():
    with pytest.raises(ValidationError):
        Report(
            proposal_id=1,
            title="X",
            markdown="Suficientemente largo el markdown blah blah blah de prueba",
            confidence=1.5,
            llm_model="claude",
            generated_at=1700000000,
            sources=[ReportSource(kind="onchain_event", ref="0x" + "a" * 64)],
            tally=[1, 0],
            options=["A", "B"],
        )


def test_report_requiere_al_menos_una_fuente():
    with pytest.raises(ValidationError):
        Report(
            proposal_id=1,
            title="X",
            markdown="Suficientemente largo el markdown blah blah blah de prueba",
            confidence=0.5,
            llm_model="claude",
            generated_at=1700000000,
            sources=[],
            tally=[1, 0],
            options=["A", "B"],
        )


def test_report_markdown_minimo():
    with pytest.raises(ValidationError):
        Report(
            proposal_id=1,
            title="X",
            markdown="corto",
            confidence=0.5,
            llm_model="claude",
            generated_at=1700000000,
            sources=[ReportSource(kind="onchain_event", ref="0x" + "a" * 64)],
            tally=[1, 0],
            options=["A", "B"],
        )
```

### 3. Commit
```bash
git add agents/api/models/report.py agents/tests/test_models_report.py
git commit -m "feat(agents): modelos Pydantic report (A-008)"
```

## Verificación / Definition of Done

```bash
pytest tests/test_models_report.py -v
```

- ✅ Todos los tests pasan.
- ✅ `confidence` validado en [0, 1].
- ✅ `sources` no puede estar vacío (al menos el evento on-chain).

## Errores comunes

- **`HttpUrl` rechaza URLs HTTP del explorer**
  `HttpUrl` por defecto acepta http y https. Si el explorer tiene un esquema raro, ajustar.

- **`min_length=1` para sources se ignora**
  En Pydantic v2 sobre `list`, usar `min_length` (no `min_items`).

## Lecturas
- [Pydantic v2 — Networking types](https://docs.pydantic.dev/latest/api/networks/)
- [`agents/hermes/soul/INSTINCT.md`](../hermes/soul/INSTINCT.md) — qué reglas de trazabilidad debe seguir el reporte

## Notas para revisor
- Confirmar que el `markdown` no se valida por contenido (solo longitud). Si el LLM mete un campo "yo opino" — eso lo cubre el prompt, no el modelo Pydantic.
- En Sprint 2 podemos agregar un test que valida que `tally` no es trivial (no todos 0).
