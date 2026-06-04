"""
RPC client wrapper con failover (ADR-003).

Sprint 02: failover simple — primary -> fallback en timeout/5xx.
Sprint 03+: validacion cruzada multi-RPC para queries criticas (tally, isRegistered).

Uso:
    from app.rpc import fetch_with_failover, AllRpcsFailed

    payload = {"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}
    result = await fetch_with_failover(primary_url, fallback_url, payload)
"""

from __future__ import annotations

import logging

import httpx

logger = logging.getLogger(__name__)


class AllRpcsFailed(Exception):
    """Raised when primary and fallback both fail (or primary fails without fallback)."""


async def fetch_with_failover(
    url_primary: str,
    url_fallback: str | None,
    payload: dict,
    timeout: float = 30.0,
) -> dict:
    """
    POST JSON-RPC payload to primary; if primary fails with timeout/5xx, retry
    on fallback.

    Args:
        url_primary: URL del RPC primario (ej. https://rpc-zk.tanenbaum.io).
        url_fallback: URL del RPC fallback. None desactiva el failover.
        payload: cuerpo JSON-RPC a postear.
        timeout: timeout en segundos por intento (no acumulado).

    Returns:
        Parsed JSON response del primer endpoint que responda exitosamente.

    Raises:
        AllRpcsFailed: si primary falla y no hay fallback, o si ambos fallan.
    """
    async with httpx.AsyncClient(timeout=timeout) as cli:
        try:
            r = await cli.post(url_primary, json=payload)
            r.raise_for_status()
            return r.json()
        except (httpx.TimeoutException, httpx.HTTPStatusError) as e_primary:
            logger.warning("RPC primary failed (%s): %s", url_primary, e_primary)
            if not url_fallback:
                raise AllRpcsFailed(
                    f"primary failed and no fallback configured: {e_primary}"
                ) from e_primary
            try:
                r = await cli.post(url_fallback, json=payload)
                r.raise_for_status()
                logger.info("RPC fallback (%s) succeeded", url_fallback)
                return r.json()
            except (httpx.TimeoutException, httpx.HTTPStatusError) as e_fallback:
                raise AllRpcsFailed(
                    f"primary failed ({e_primary}) and fallback failed ({e_fallback})"
                ) from e_fallback
