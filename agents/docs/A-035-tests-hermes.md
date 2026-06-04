---
id: A-035
title: "Tests Hermes (reporter + listener) con fixtures LLM"
owner: "Gabriel"
backup: "Sandro"
effort: "2 h"
priority: P0
status: pending
depends_on: [A-024]
sprint: 1
layer: agents
---

# A-035 · Tests de Hermes

## Por qué importa
Hermes habla con LLM externo (Claude). En tests NUNCA tocamos la API real (costoso, lento, no determinístico). Usamos **fixtures**: respuestas predefinidas que simulan al LLM, validan que el reporter parsea bien y que el loop no rompe.

## Conceptos clave
- **Snapshot fixture**: archivo JSON con una respuesta real (anonimizada) del LLM. Útil para regression.
- **`respx`**: mock HTTP — útil si quisiéramos interceptar `httpx` directo. Para Anthropic SDK lo más simple es patchear `LLMClient.complete`.
- **Reproducibilidad**: tests no dependen de internet ni de tokens.

## Pre-requisitos
- [ ] [A-024](./A-024-hermes-runtime.md) cerrada.

## Paso a paso

### 1. Crear fixture `tests/fixtures/llm_reporter_sample.md`
```markdown
# Aprobar pavimentación en San Juan de Lurigancho

## Resumen ejecutivo
La propuesta sobre la pavimentación en SJL obtuvo apoyo mayoritario en la consulta.
Total de votos: 15. Margen suficiente para tomar la consulta como representativa
de los participantes registrados.

## Distribución de votos

| Opción | Votos | % |
|--------|-------|---|
| A favor | 10 | 66.7 |
| En contra | 5 | 33.3 |

## Observaciones de Hermes
La distribución muestra mayoría clara a favor. No se identifican señales de
participación irregular en los registros on-chain. La votación cumple los
requisitos mínimos del protocolo Sprint 1.

## Trazabilidad
- tx_hash: 0xabcd...
- explorer: https://explorer-zk.tanenbaum.io/tx/0xabcd...
- bloque: 12345
```

### 2. Crear `tests/test_hermes.py`
```python
"""Tests del reporter y runtime de Hermes."""
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest


FIXTURE = Path(__file__).parent / "fixtures" / "llm_reporter_sample.md"


@pytest.mark.asyncio
async def test_reporter_usa_llm_respuesta(monkeypatch, tmp_path):
    fake = AsyncMock()
    fake.get_proposal.return_value = {
        "id": 1, "title": "Aprobar pavimentación", "description": "Desc",
        "options": ["A favor", "En contra"], "created_at": 0,
        "deadline": 0, "status": 1, "curator": "0x" + "a" * 40,
    }
    fake.tally.return_value = [10, 5]
    fake.explorer_tx.return_value = "https://e.io/tx/0xabcd"

    with patch("hermes.reporter.get_llm_client") as mock_get:
        mock_llm = AsyncMock()
        mock_llm._model = "claude-test"
        mock_llm.complete.return_value = FIXTURE.read_text(encoding="utf-8")
        mock_get.return_value = mock_llm

        from hermes.reporter import generate_report_for_proposal
        r = await generate_report_for_proposal(
            1, fake, closed_tx_hash="0x" + "a" * 64,
            closed_block=1, closed_timestamp=1,
        )
        assert "Aprobar pavimentación" in r.markdown
        assert r.confidence >= 0.7  # 10/15 = 66.7% → high confidence rule


@pytest.mark.asyncio
async def test_reporter_falla_si_propuesta_no_existe():
    fake = AsyncMock()
    fake.get_proposal.return_value = None
    from hermes.reporter import generate_report_for_proposal
    with pytest.raises(ValueError):
        await generate_report_for_proposal(99, fake)


def test_confidence_empate():
    from hermes.reporter import _confidence_from_tally
    assert _confidence_from_tally([5, 5]) < 0.5
    assert _confidence_from_tally([10, 0]) >= 0.9
    assert _confidence_from_tally([0, 0]) < 0.5
```

### 3. Commit
```bash
git add agents/tests/fixtures/llm_reporter_sample.md agents/tests/test_hermes.py
git commit -m "test(agents): hermes reporter con fixture LLM (A-035)"
```

## Verificación / Definition of Done

- ✅ Tests pasan sin red.
- ✅ Confidence rules cubiertas.
- ✅ Fixture markdown está versionada.

## Errores comunes

- **El path de `FIXTURE` no se encuentra**
  `Path(__file__).parent` resuelve al directorio del test. Si está en `tests/test_hermes.py`, busca en `tests/fixtures/`.

## Lecturas
- [pytest fixtures](https://docs.pytest.org/en/stable/explanation/fixtures.html)

## Notas para revisor
- ¿La fixture coincide en formato con lo que Hermes va a generar en demo? Si no, ajustar.
