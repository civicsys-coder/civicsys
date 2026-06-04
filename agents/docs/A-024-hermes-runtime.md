---
id: A-024
title: "hermes/runtime.py — loop principal (listener → reporter → cache)"
owner: "Sandro"
backup: "junior"
effort: "2 h"
priority: P0
status: pending
depends_on: [A-013, A-023]
sprint: 1
layer: agents
---

# A-024 · Runtime de Hermes

## Por qué importa
Es el "alma en movimiento" de Hermes. Junta el listener de eventos con el reporter: cuando aparece un `ProposalClosed`, genera el reporte y lo cachea. Sin este loop, Hermes es solo código durmiente.

## Conceptos clave
- **Task asyncio**: corre en background dentro del proceso del API (no separar proceso en Sprint 1 — simplifica).
- **Idempotencia**: si el callback se llama dos veces por el mismo evento, el archivo cache no se regenera.
- **Failure isolation**: si el reporter rompe, loggear y seguir. No matar el listener.

## Pre-requisitos
- [ ] [A-013](./A-013-blockchain-client-event-listener.md), [A-023](./A-023-hermes-reporter.md) cerradas.

## Paso a paso

### 1. Crear `hermes/runtime.py`
```python
"""Runtime de Hermes — orquesta listener + reporter + cache."""
from __future__ import annotations

import json
import logging
from pathlib import Path

from api.config import get_settings
from api.services.blockchain_client import get_blockchain_client
from api.services.event_listener import create_default_listener
from hermes.reporter import generate_report_for_proposal

logger = logging.getLogger(__name__)


def _report_cache_path(proposal_id: int) -> Path:
    s = get_settings()
    d = s.hermes_memory_dir / "sessions"
    d.mkdir(parents=True, exist_ok=True)
    return d / f"proposal_{proposal_id}.json"


async def _on_proposal_closed(payload: dict) -> None:
    proposal_id = payload["proposal_id"]
    cache = _report_cache_path(proposal_id)
    if cache.exists():
        logger.info("report already cached, skipping", extra={"proposal_id": proposal_id})
        return
    client = await get_blockchain_client()
    try:
        report = await generate_report_for_proposal(
            proposal_id=proposal_id,
            client=client,
            closed_tx_hash=payload["tx_hash"],
            closed_block=payload["block_number"],
            closed_timestamp=payload["timestamp"],
        )
    except Exception:
        logger.exception("reporter failed for proposal %s", proposal_id)
        return
    cache.write_text(report.model_dump_json(indent=2), encoding="utf-8")
    logger.info(
        "report generated",
        extra={
            "proposal_id": proposal_id,
            "confidence": report.confidence,
            "tx_hash": payload["tx_hash"],
        },
    )


async def run_hermes() -> None:
    """Loop principal. Llamado desde el lifespan del API."""
    listener = await create_default_listener(on_proposal_closed=_on_proposal_closed)
    logger.info("Hermes runtime started")
    try:
        await listener.run()
    except Exception:
        logger.exception("Hermes runtime crashed")
        raise
```

### 2. Probar con un evento simulado
```python
# tests/test_hermes_runtime.py
import pytest
from pathlib import Path
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
async def test_on_proposal_closed_cachea(monkeypatch, tmp_path):
    monkeypatch.setattr("hermes.runtime._report_cache_path", lambda pid: tmp_path / f"p{pid}.json")
    fake_client = AsyncMock()
    monkeypatch.setattr("hermes.runtime.get_blockchain_client", AsyncMock(return_value=fake_client))

    class FakeReport:
        def model_dump_json(self, indent=2):
            return '{"ok": true}'
        confidence = 0.9
    with patch("hermes.runtime.generate_report_for_proposal", AsyncMock(return_value=FakeReport())):
        from hermes.runtime import _on_proposal_closed
        await _on_proposal_closed({
            "proposal_id": 1,
            "tx_hash": "0xabc",
            "block_number": 10,
            "timestamp": 1,
            "tally": [3, 2],
        })
    assert (tmp_path / "p1.json").exists()
```

### 3. Commit
```bash
git add agents/hermes/runtime.py agents/tests/test_hermes_runtime.py
git commit -m "feat(agents): hermes/runtime.py loop principal (A-024)"
```

## Verificación / Definition of Done

- ✅ Test pasa.
- ✅ Si el cache ya existe, no se regenera.
- ✅ Si reporter falla, se loguea y sigue.
- ✅ El loop arranca desde `api/main.py` lifespan.

## Errores comunes

- **El task de Hermes no arranca**
  En `lifespan`: confirmá `hermes_task = asyncio.create_task(run_hermes())`. Sin `create_task`, la coroutine no corre.

- **Cache no se invalida cuando hay redeploy**
  Sprint 1: borrar manualmente `hermes/memory/sessions/`.

## Lecturas
- [asyncio tasks](https://docs.python.org/3/library/asyncio-task.html)

## Notas para revisor
- ¿El listener sigue corriendo si el reporter falla? Confirmar — el except cubre.
- En Sprint 2, escribir reporte como Markdown directo (en disco) para que sea fácil ver sin abrir JSON.
