---
id: A-023
title: "hermes/reporter.py — generar reporte de cierre (SOUL + INSTINCT + datos)"
owner: "Sandro"
backup: "junior"
effort: "2.5 h"
priority: P0
status: pending
depends_on: [A-022, A-012]
sprint: 1
layer: agents
---

# A-023 · `reporter.py`

## Por qué importa
Es la pieza **narrativa** del demo: a partir del tally on-chain, Hermes genera un reporte markdown legible. Si está bien, la audiencia entiende el resultado en 30 segundos. Si está mal, parece chatbot genérico.

## Conceptos clave
- **Prompt structure**:
  - `system`: SOUL + INSTINCT (cacheable).
  - `user`: datos de la propuesta + tally + instrucciones de formato.
- **Confidence scoring**: heurística simple en Sprint 1 (tally con un claro ganador → alta confianza; empate → baja).
- **Trazabilidad obligatoria**: el prompt EXIGE incluir `tx_hash` en el markdown.

## Pre-requisitos
- [ ] [A-022](./A-022-hermes-llm-client.md), [A-012](./A-012-blockchain-client-vote-tally.md) cerradas.
- [ ] `hermes/soul/SOUL.md` y `hermes/soul/INSTINCT.md` existen.

## Paso a paso

### 1. Crear `hermes/reporter.py`
```python
"""Reporter de Hermes: genera reporte de cierre de propuesta."""
from __future__ import annotations

import logging
import time
from pathlib import Path

from api.models.proposal import ProposalStatus
from api.models.report import Report, ReportSource
from api.services.blockchain_client import BlockchainClient
from hermes.llm_client import build_cacheable_system, get_llm_client

logger = logging.getLogger(__name__)

SOUL_PATH = Path(__file__).resolve().parent / "soul" / "SOUL.md"
INSTINCT_PATH = Path(__file__).resolve().parent / "soul" / "INSTINCT.md"


def _confidence_from_tally(tally: list[int]) -> float:
    total = sum(tally)
    if total == 0:
        return 0.1  # sin datos
    top = max(tally)
    margin = top / total
    if margin >= 0.7:
        return 0.9
    if margin >= 0.55:
        return 0.75
    if margin >= 0.4:
        return 0.55
    return 0.4


_USER_PROMPT_TEMPLATE = """\
Propuesta {proposal_id}: "{title}"

Descripción:
{description}

Opciones:
{options_listing}

Distribución de votos (final, on-chain):
{tally_listing}

Total de votos: {total}

Evento on-chain de cierre:
- tx_hash: {tx_hash}
- explorer: {explorer_url}
- bloque: {block_number}
- timestamp cierre (unix): {closed_at}

Reglas (NO se pueden ignorar):
1. NO opines política partidaria.
2. NO recomendes voto.
3. SI hay empate técnico (≤ 5% diferencia), declararlo "sin mayoría clara".
4. SIEMPRE incluí el tx_hash y la URL del explorer al final.
5. Usá tono sobrio, claro, accesible. Sin sensacionalismo.
6. Si los datos son insuficientes, decilo explícitamente.

Generá un reporte markdown con estas secciones:
# {title}

## Resumen ejecutivo
3-5 líneas, neutrales.

## Distribución de votos
Tabla con opciones y conteos.

## Observaciones de Hermes
Máximo 200 palabras. Sin afiliación. Citando datos.

## Trazabilidad
- tx_hash: ...
- explorer: ...
- bloque: ...

Devolvé SOLO el markdown del reporte, sin meta-comentarios."""


async def generate_report_for_proposal(
    proposal_id: int,
    client: BlockchainClient,
    closed_tx_hash: str | None = None,
    closed_block: int | None = None,
    closed_timestamp: int | None = None,
) -> Report:
    """Construye el reporte para una propuesta cerrada.

    Si `closed_tx_hash` viene None, lo intentamos buscar via events (Sprint 2).
    Por ahora si no se pasa, marcamos confianza más baja.
    """
    p = await client.get_proposal(proposal_id)
    if p is None:
        raise ValueError(f"proposal {proposal_id} no existe")
    tally = await client.tally(proposal_id)
    total = sum(tally)

    soul = SOUL_PATH.read_text(encoding="utf-8")
    instinct = INSTINCT_PATH.read_text(encoding="utf-8")
    system_blocks = build_cacheable_system(soul, instinct)

    options_listing = "\n".join(f"  {i}. {o}" for i, o in enumerate(p["options"]))
    tally_listing = "\n".join(
        f"  - {o}: {n} ({(n/total*100 if total else 0):.1f}%)"
        for o, n in zip(p["options"], tally)
    )
    user_prompt = _USER_PROMPT_TEMPLATE.format(
        proposal_id=proposal_id,
        title=p["title"],
        description=p["description"],
        options_listing=options_listing,
        tally_listing=tally_listing,
        total=total,
        tx_hash=closed_tx_hash or "(no disponible)",
        explorer_url=client.explorer_tx(closed_tx_hash) if closed_tx_hash else "(no disponible)",
        block_number=closed_block or 0,
        closed_at=closed_timestamp or int(time.time()),
    )

    llm = get_llm_client()
    markdown = await llm.complete(system_blocks=system_blocks, user_message=user_prompt)

    sources: list[ReportSource] = []
    if closed_tx_hash:
        sources.append(ReportSource(
            kind="onchain_event",
            ref=closed_tx_hash,
            explorer_url=client.explorer_tx(closed_tx_hash),
            note="Evento ProposalClosed",
        ))
    else:
        sources.append(ReportSource(
            kind="onchain_event",
            ref=f"proposal-{proposal_id}",
            note="tx_hash de cierre no provisto al reporter",
        ))

    confidence = _confidence_from_tally(tally)
    if closed_tx_hash is None:
        confidence *= 0.9  # menos trazable

    s = get_llm_client()
    return Report(
        proposal_id=proposal_id,
        title=p["title"],
        markdown=markdown,
        confidence=confidence,
        llm_model=s._model,  # type: ignore[attr-defined]
        generated_at=int(time.time()),
        sources=sources,
        tally=tally,
        options=p["options"],
    )
```

### 2. Test con fixture
```python
# tests/test_reporter.py
import pytest
from pathlib import Path
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
async def test_generate_report(monkeypatch, tmp_path):
    fake = AsyncMock()
    fake.get_proposal.return_value = {
        "id": 1, "title": "Pavimentar SJL", "description": "Descripción larga.",
        "options": ["A favor", "En contra"], "created_at": 0, "deadline": 0,
        "status": 1, "curator": "0x" + "a" * 40,
    }
    fake.tally.return_value = [10, 5]
    fake.explorer_tx.return_value = "https://e.io/tx/0xabc"

    with patch("hermes.reporter.get_llm_client") as mock_get:
        mock_llm = AsyncMock()
        mock_llm._model = "claude-test"
        mock_llm.complete.return_value = "# Pavimentar SJL\n\n## Resumen\n\nReporte de prueba con suficiente contenido."
        mock_get.return_value = mock_llm

        from hermes.reporter import generate_report_for_proposal
        r = await generate_report_for_proposal(
            1, fake, closed_tx_hash="0x" + "b" * 64, closed_block=10, closed_timestamp=1700000000
        )
        assert r.confidence > 0.5
        assert r.tally == [10, 5]
        assert any(s.ref.startswith("0x") for s in r.sources)
```

### 3. Commit
```bash
git add agents/hermes/reporter.py agents/tests/test_reporter.py
git commit -m "feat(agents): hermes/reporter.py con prompt sobrio y trazable (A-023)"
```

## Verificación / Definition of Done

- ✅ Test pasa con LLM mockeado.
- ✅ El markdown final contiene el `tx_hash` literal.
- ✅ Confidence baja si no hay `closed_tx_hash`.
- ✅ Sin opinión política en el prompt.

## Errores comunes

- **El LLM "alucinó" números**
  Confirmá que el prompt NO pide al LLM calcular porcentajes — los pasamos pre-calculados.

- **El reporter llama al LLM con SOUL+INSTINCT enormes**
  Es el patrón correcto, y el caching lo abarata. Si igualmente es caro, considerar resumir SOUL en Sprint 2.

## Lecturas
- [`agents/hermes/soul/SOUL.md`](../hermes/soul/SOUL.md)
- [`agents/hermes/soul/INSTINCT.md`](../hermes/soul/INSTINCT.md)

## Notas para revisor
- ¿El reporte resultante (en demo) contiene "yo opino" / "recomiendo"? Si sí, ajustar prompt.
- En Sprint 2: agregar `quechua` cuando el ciudadano lo solicite.
