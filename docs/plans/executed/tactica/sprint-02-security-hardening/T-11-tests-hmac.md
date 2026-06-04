# T-11 — Tests HMAC en `agents/tests/test_security.py`

**Prio**: P1 · **Bloqueada por**: T-10 · **ADR**: ADR-002

## Qué hacer

Agregar a `agents/tests/test_security.py` (que ya existe tras T-08):

```python
import pytest
from pathlib import Path
from app.security import compute_hmac, verify_hmac, hmac_path, IntegrityError


def test_compute_hmac_returns_hex_64():
    mac = compute_hmac(b"hello", b"mykey")
    assert len(mac) == 64
    assert all(c in "0123456789abcdef" for c in mac)


def test_compute_hmac_deterministic():
    assert compute_hmac(b"data", b"key") == compute_hmac(b"data", b"key")


def test_compute_hmac_differs_by_content():
    assert compute_hmac(b"a", b"key") != compute_hmac(b"b", b"key")


def test_compute_hmac_differs_by_key():
    assert compute_hmac(b"data", b"k1") != compute_hmac(b"data", b"k2")


def test_verify_hmac_roundtrip():
    content = b'{"report":"hello"}'
    key = b"secret-key-with-enough-entropy-32bytes!!"
    mac = compute_hmac(content, key)
    assert verify_hmac(content, mac, key) is True


def test_verify_hmac_detects_mutation():
    content = b'{"report":"hello"}'
    key = b"secret-key"
    mac = compute_hmac(content, key)
    mutated = b'{"report":"hellO"}'  # 1 byte changed
    assert verify_hmac(mutated, mac, key) is False


def test_verify_hmac_detects_wrong_key():
    content = b"data"
    mac = compute_hmac(content, b"correct-key")
    assert verify_hmac(content, mac, b"wrong-key") is False


def test_hmac_path_appends_suffix(tmp_path):
    p = tmp_path / "proposal_1.json"
    assert hmac_path(p).name == "proposal_1.json.hmac"
```

## Criterio de done

- [ ] `pytest agents/tests/test_security.py::test_compute_hmac_returns_hex_64` (y los demás) verde.
- [ ] Coverage de funciones HMAC en `security.py` = 100%.

## Comando de verificación

```bash
cd agents && python -m pytest tests/test_security.py -v --cov=app.security --cov-report=term-missing
```
