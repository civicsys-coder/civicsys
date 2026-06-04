# T-10 — HMAC helpers en `agents/app/security.py`

**Prio**: P1 · **Bloqueada por**: T-07 (mismo archivo) · **ADR**: ADR-002

## Qué hacer

Agregar al final de `agents/app/security.py` (que ya existe tras T-07):

```python
import hmac
import hashlib
from pathlib import Path


def compute_hmac(content: bytes, key: bytes) -> str:
    """
    Returns hex-encoded HMAC-SHA256 of `content` using `key`.

    Use to anchor integrity of persisted reports (sessions/proposal_N.json).
    See ADR-002.
    """
    return hmac.new(key, content, hashlib.sha256).hexdigest()


def verify_hmac(content: bytes, expected_hex: str, key: bytes) -> bool:
    """
    Constant-time compare of computed HMAC vs expected hex.

    Returns True if matches; False otherwise. Use to detect mutation
    of persisted reports.
    """
    computed = compute_hmac(content, key)
    return hmac.compare_digest(computed, expected_hex)


def hmac_path(target: Path) -> Path:
    """Returns the HMAC sidecar path for `target` (e.g. foo.json -> foo.json.hmac)."""
    return target.with_suffix(target.suffix + ".hmac")


class IntegrityError(Exception):
    """Raised when HMAC verification fails."""
```

**No** se modifica `Reporter.render` aún (Sprint 02 no persiste reportes en filesystem todavía — el ADR-002 dice que cuando se introduzca persistencia, debe usar estas helpers desde el día 1). Las helpers quedan listas + tests, sin call site en runtime.

Si el equipo prefiere agregar `Reporter.persist`/`Reporter.load` ahora aunque no se use: hacerlo en una sub-tarea opcional (no bloqueante para Gate 2).

## Criterio de done

- [ ] `agents/app/security.py` exporta `compute_hmac`, `verify_hmac`, `hmac_path`, `IntegrityError`.
- [ ] `from app.security import compute_hmac, verify_hmac, hmac_path` funciona.

## Comando de verificación

```bash
cd agents && python -c "from app.security import compute_hmac, verify_hmac, hmac_path, IntegrityError; print(compute_hmac(b'test', b'key123'))"
```
