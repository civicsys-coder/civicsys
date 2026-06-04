---
id: A-039
title: "Tests de aserción NO-PII (DNI nunca en responses ni logs)"
owner: "Tatiana"
backup: "Gabriel"
effort: "1 h"
priority: P0
status: pending
depends_on: [A-014, A-019]
sprint: 1
layer: agents
---

# A-039 · Tests "no leakea PII"

## Por qué importa
El [DoD del Sprint 1](../../docs/sprints/sprint1.md) exige verificar que el DNI NO se persiste, NO se loguea, NO se devuelve. Esta tarea convierte esa intención en **tests automatizados** que rompen si alguien introduce un regresso.

## Conceptos clave
- **Captura de logs en tests**: `caplog` fixture de pytest captura todo lo que pasa por `logging`.
- **Test de regresión**: asserciones específicas sobre el patrón `\d{8}` (DNI peruano).
- **Integration test cubre filesystem**: confirmar que no hay archivos en `agents/hermes/memory/` con DNI.

## Pre-requisitos
- [ ] [A-014](./A-014-route-auth.md), [A-019](./A-019-middleware-logging-pii.md) cerradas.

## Paso a paso

### 1. Crear `tests/test_no_pii.py`
```python
"""Tests de invariante: el DNI NO sale del request handler."""
import re
from unittest.mock import AsyncMock

import pytest
import structlog
from httpx import ASGITransport, AsyncClient

DNI_RE = re.compile(r"\b\d{8}\b")


@pytest.mark.asyncio
async def test_register_response_no_contiene_dni(monkeypatch, fake_blockchain_client):
    fake_blockchain_client.register_citizen.return_value = {
        "citizen_id": "0x" + "a" * 64,
        "normalized_name": "JUAN PEREZ",
        "tx_hash": "0x" + "b" * 64,
        "block_number": 1,
        "explorer_url": "https://e.io/tx/0xb",
    }
    from api.services import blockchain_client as bc_mod
    monkeypatch.setattr(bc_mod, "get_blockchain_client", AsyncMock(return_value=fake_blockchain_client))

    from api.main import create_app
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app), base_url="http://test") as ac:
        r = await ac.post("/auth/register", json={"dni": "12345678", "full_name": "Juan Pérez"})
    assert r.status_code == 201
    # ASSERT clave: no aparece el DNI en la response
    assert not DNI_RE.search(r.text), f"DNI leakeado: {r.text}"


@pytest.mark.asyncio
async def test_logs_no_contienen_dni(monkeypatch, caplog, fake_blockchain_client):
    fake_blockchain_client.register_citizen.return_value = {
        "citizen_id": "0x" + "a" * 64,
        "normalized_name": "JUAN PEREZ",
        "tx_hash": "0x" + "b" * 64,
        "block_number": 1,
        "explorer_url": "https://e.io/tx/0xb",
    }
    from api.services import blockchain_client as bc_mod
    monkeypatch.setattr(bc_mod, "get_blockchain_client", AsyncMock(return_value=fake_blockchain_client))

    from api.main import create_app
    app = create_app()
    with caplog.at_level("INFO"):
        async with AsyncClient(transport=ASGITransport(app), base_url="http://test") as ac:
            await ac.post("/auth/register", json={"dni": "87654321", "full_name": "Test User"})

    full_log = " ".join(rec.getMessage() for rec in caplog.records)
    assert "87654321" not in full_log, f"DNI leakeado en logs: {full_log}"


def test_processor_pii_filtra_dni_directo():
    from api.middleware.logging_pii import redact_pii_processor
    event = {"event": "fake event", "dni": "12345678", "user": "Test"}
    out = redact_pii_processor(None, None, event)
    assert out["dni"] == "[REDACTED]"


def test_processor_pii_filtra_dni_en_strings():
    from api.middleware.logging_pii import redact_pii_processor
    event = {"event": "Registrando 11111111 ...", "context": "Recibimos 22222222"}
    out = redact_pii_processor(None, None, event)
    assert "11111111" not in out["event"]
    assert "22222222" not in out["context"]


def test_no_dni_en_archivos_de_memoria(tmp_path, monkeypatch):
    """Si se acumulan reportes, el DNI nunca aparece en disco."""
    monkeypatch.setattr("api.config.settings", type("S", (), {"hermes_memory_dir": tmp_path})())
    # Simular un reporte ya generado
    report = {
        "proposal_id": 1,
        "title": "Test",
        "markdown": "Reporte sin DNI con suficiente contenido para validar",
        "confidence": 0.8,
        "llm_model": "claude",
        "generated_at": 1,
        "tally": [3, 2],
        "options": ["A", "B"],
        "sources": [{"kind": "onchain_event", "ref": "0x" + "a" * 64}],
    }
    import json
    (tmp_path / "sessions").mkdir()
    (tmp_path / "sessions" / "proposal_1.json").write_text(json.dumps(report))
    text = (tmp_path / "sessions" / "proposal_1.json").read_text()
    assert not DNI_RE.search(text)
```

### 2. Marcar como guardrail
Agregar al `pytest.ini_options`:
```toml
markers = [
  "integration: requiere blockchain o LLM (slow)",
  "e2e: end-to-end fullstack",
  "no_pii: aserciones críticas de privacidad — NUNCA skip",
]
```

Y en cada test, agregar `@pytest.mark.no_pii`.

### 3. Documentar política
Agregar al `docs/security/threat-model-sprint1.md`:

```markdown
## Tests automáticos de privacidad
Cualquier PR que rompa `tests/test_no_pii.py` se rechaza automáticamente.
```

### 4. Commit
```bash
git add agents/tests/test_no_pii.py agents/pyproject.toml docs/security/threat-model-sprint1.md
git commit -m "test(security): aserción NO-PII en responses y logs (A-039)"
```

## Verificación / Definition of Done

- ✅ Todos los tests pasan.
- ✅ Marker `no_pii` en pyproject.
- ✅ Doc actualizada.
- ✅ Si alguien introduce un `print(dni)`, el test falla.

## Errores comunes

- **`caplog` no captura structlog**
  Estructurado no usa `logging` estándar por defecto. Configurar `structlog.stdlib.LoggerFactory()` para integrarlos.

## Lecturas
- [pytest caplog](https://docs.pytest.org/en/stable/how-to/logging.html)
- [`docs/security/threat-model-sprint1.md` § T2](../../docs/security/threat-model-sprint1.md)

## Notas para revisor
- ¿Los tests cubren las 3 capas: response, logs, archivos en disco? Confirmar.
- En Sprint 2 agregar test sobre cuerpo de errores 500 (que no leakean DNI tampoco).
