---
id: A-019
title: "middleware/logging.py — structlog + filtro PII"
owner: "Tatiana"
backup: "Sandro"
effort: "1.5 h"
priority: P0
status: pending
depends_on: [A-001]
sprint: 1
layer: agents
---

# A-019 · Logging con filtro PII

## Por qué importa
**T2 (Tampering)** del threat model marca *crítico* el riesgo de que la API loguee DNI en claro. Sin un filtro automático, basta un `logger.info(f"register {body}")` para arruinar la promesa de privacidad. Esta tarea instala el filtro como una capa de defensa: aunque alguien cometa el error, el filtro lo redacta.

## Conceptos clave
- **`structlog`**: logging estructurado (JSON). Cada log es un dict. Filtros son funciones puras `dict → dict`.
- **Processor chain**: `structlog` aplica una pila de procesadores. Insertamos un procesador "redact PII" cerca del final.
- **Patrones a redactar**: DNI peruano (`\b\d{8}\b`), private keys (`0x[a-f0-9]{64}`), nombres de campos sensibles (`dni`, `password`, `secret`, `private_key`, `mnemonic`).

## Pre-requisitos
- [ ] [A-001](./A-001-setup-pyproject.md) cerrada.

## Paso a paso

### 1. Crear `api/middleware/logging_pii.py`
```python
"""Filtro PII para structlog.

Cualquier log que pase por nuestra pila tiene los valores sensibles redactados.
"""
from __future__ import annotations

import re
from typing import Any

import structlog

_SENSITIVE_KEYS = {
    "dni",
    "password",
    "passwd",
    "secret",
    "private_key",
    "privkey",
    "mnemonic",
    "api_key",
    "anthropic_api_key",
    "signer_private_key",
    "deployer_private_key",
    "token",
    "auth",
    "authorization",
}

_DNI_RE = re.compile(r"\b\d{8}\b")
_HEX64_RE = re.compile(r"\b0x[a-fA-F0-9]{64}\b")


def _redact_scalar(value: Any) -> Any:
    if not isinstance(value, str):
        return value
    redacted = _DNI_RE.sub("[REDACTED_DNI]", value)
    # NOTE: hex64 puede ser tx_hash o citizen_id legítimo, NO lo redactamos
    # globalmente. Solo si la clave dice 'key' lo redactamos.
    return redacted


def _redact_dict(d: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for k, v in d.items():
        if k.lower() in _SENSITIVE_KEYS:
            out[k] = "[REDACTED]"
        elif isinstance(v, dict):
            out[k] = _redact_dict(v)
        elif isinstance(v, list):
            out[k] = [_redact_dict(x) if isinstance(x, dict) else _redact_scalar(x) for x in v]
        else:
            out[k] = _redact_scalar(v)
    return out


def redact_pii_processor(_, __, event_dict: dict[str, Any]) -> dict[str, Any]:
    """structlog processor que redacta campos sensibles."""
    return _redact_dict(event_dict)


def configure_logging(level: str = "INFO") -> None:
    """Configura structlog. Llamar al startup."""
    structlog.configure(
        processors=[
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.format_exc_info,
            redact_pii_processor,             # <-- nuestra capa
            structlog.dev.ConsoleRenderer(colors=True),
            # o JSONRenderer() para producción
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(__import__("logging"), level.upper(), 20)
        ),
        cache_logger_on_first_use=True,
    )
```

### 2. Tests
```python
# tests/test_logging_pii.py
from api.middleware.logging_pii import redact_pii_processor


def test_redacta_dni():
    out = redact_pii_processor(None, None, {"event": "register", "dni": "12345678", "name": "Juan"})
    assert out["dni"] == "[REDACTED]"


def test_redacta_dni_en_string_arbitrario():
    out = redact_pii_processor(None, None, {"event": "fallo 12345678 inválido"})
    assert "12345678" not in out["event"]
    assert "[REDACTED_DNI]" in out["event"]


def test_redacta_nested():
    out = redact_pii_processor(None, None, {"event": "x", "body": {"dni": "12345678", "ok": True}})
    assert out["body"]["dni"] == "[REDACTED]"


def test_redacta_private_key():
    out = redact_pii_processor(None, None, {"event": "x", "signer_private_key": "0xdeadbeef"})
    assert out["signer_private_key"] == "[REDACTED]"


def test_no_redacta_tx_hash():
    """Los tx_hash sí son público y NO se redactan."""
    out = redact_pii_processor(None, None, {"event": "x", "tx_hash": "0x" + "a" * 64})
    assert out["tx_hash"] == "0x" + "a" * 64
```

### 3. Commit
```bash
git add agents/api/middleware/logging_pii.py agents/tests/test_logging_pii.py
git commit -m "feat(agents): structlog + filtro PII (DNI, keys) (A-019)"
```

## Verificación / Definition of Done

```bash
pytest tests/test_logging_pii.py -v
```

- ✅ DNI nunca aparece en logs.
- ✅ Private keys nunca aparecen.
- ✅ Tx hashes y citizen_ids SÍ aparecen (no son PII).
- ✅ El processor está activo en `configure_logging()`.

## Errores comunes

- **El filtro no se aplica**
  Verificar que `configure_logging()` se llama UNA vez al startup, y que todos los módulos usan `structlog.get_logger(__name__)` (NO `logging.getLogger`).

- **El filtro rompe logs estructurados con bytes**
  El recursor solo cubre `dict` y `str`. Si pasás `bytes` u objetos custom, no se tocan. Convertí a str antes de loguear.

## Lecturas
- [structlog docs](https://www.structlog.org/)
- [`docs/security/threat-model-sprint1.md` § T2](../../docs/security/threat-model-sprint1.md)

## Notas para revisor
- ¿`_SENSITIVE_KEYS` incluye todos los nombres relevantes? Hacer code review específico de este set.
- En Sprint 2: integrar Loki/Sentry con tags de filtro.
