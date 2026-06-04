# T-12 — RPC fallback en `Settings` + helper en `agents/app/rpc.py`

**Prio**: P1 · **Bloqueada por**: — · **ADR**: ADR-003

## Qué hacer

1. Editar `agents/app/settings.py`. Agregar campo:

```python
rpc_fallback: str | None = None
rpc_timeout_seconds: int = 30
```

2. Crear `agents/app/rpc.py`:

```python
"""
RPC client wrapper con failover.

Sprint 02: failover simple (primary → fallback en timeout/5xx).
Sprint 03+: validación cruzada multi-RPC. Ver ADR-003.
"""

from __future__ import annotations
import logging
import httpx

logger = logging.getLogger(__name__)


class AllRpcsFailed(Exception):
    """Raised when primary and fallback both fail."""


async def fetch_with_failover(
    url_primary: str,
    url_fallback: str | None,
    payload: dict,
    timeout: float = 30.0,
) -> dict:
    """
    POST JSON-RPC payload to primary; if fails (timeout/5xx), retry on fallback.
    Returns the parsed JSON response. Raises AllRpcsFailed if both fail or if
    fallback is None and primary fails.
    """
    async with httpx.AsyncClient(timeout=timeout) as cli:
        try:
            r = await cli.post(url_primary, json=payload)
            r.raise_for_status()
            return r.json()
        except (httpx.TimeoutException, httpx.HTTPStatusError) as e_primary:
            logger.warning("RPC primary failed: %s", e_primary)
            if not url_fallback:
                raise AllRpcsFailed(f"primary failed and no fallback: {e_primary}") from e_primary
            try:
                r = await cli.post(url_fallback, json=payload)
                r.raise_for_status()
                logger.info("RPC fallback succeeded")
                return r.json()
            except (httpx.TimeoutException, httpx.HTTPStatusError) as e_fallback:
                raise AllRpcsFailed(
                    f"primary failed ({e_primary}) and fallback failed ({e_fallback})"
                ) from e_fallback
```

(Si web3.py 7 ofrece middleware nativo, evaluar reemplazar — pero esta versión funcional cubre el ADR.)

## Criterio de done

- [ ] `Settings` carga `rpc_fallback` y `rpc_timeout_seconds`.
- [ ] `agents/app/rpc.py` existe con `fetch_with_failover` y `AllRpcsFailed`.
- [ ] `from app.rpc import fetch_with_failover` funciona.

## Comando de verificación

```bash
cd agents && python -c "from app.rpc import fetch_with_failover, AllRpcsFailed; print('ok')"
```
