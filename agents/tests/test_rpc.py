"""
Tests del cliente RPC con failover (ADR-003).
"""

from __future__ import annotations

import httpx
import pytest
import respx

from app.rpc import AllRpcsFailed, fetch_with_failover

PRIMARY = "https://primary.example/rpc"
FALLBACK = "https://fallback.example/rpc"
PAYLOAD = {"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}


@pytest.mark.asyncio
@respx.mock
async def test_primary_success_no_fallback_called():
    primary_route = respx.post(PRIMARY).respond(200, json={"result": "0x1"})
    fallback_route = respx.post(FALLBACK).respond(200, json={"result": "0x99"})

    out = await fetch_with_failover(PRIMARY, FALLBACK, PAYLOAD, timeout=1.0)

    assert out["result"] == "0x1"
    assert primary_route.called
    assert not fallback_route.called


@pytest.mark.asyncio
@respx.mock
async def test_primary_timeout_falls_back():
    respx.post(PRIMARY).mock(side_effect=httpx.TimeoutException("timeout"))
    fb_route = respx.post(FALLBACK).respond(200, json={"result": "0xfa11"})

    out = await fetch_with_failover(PRIMARY, FALLBACK, PAYLOAD, timeout=1.0)

    assert out["result"] == "0xfa11"
    assert fb_route.called


@pytest.mark.asyncio
@respx.mock
async def test_primary_5xx_falls_back():
    respx.post(PRIMARY).respond(503, json={"error": "down"})
    fb_route = respx.post(FALLBACK).respond(200, json={"result": "0xfa11"})

    out = await fetch_with_failover(PRIMARY, FALLBACK, PAYLOAD, timeout=1.0)

    assert out["result"] == "0xfa11"
    assert fb_route.called


@pytest.mark.asyncio
@respx.mock
async def test_both_fail_raises():
    respx.post(PRIMARY).respond(503)
    respx.post(FALLBACK).respond(503)

    with pytest.raises(AllRpcsFailed):
        await fetch_with_failover(PRIMARY, FALLBACK, PAYLOAD, timeout=1.0)


@pytest.mark.asyncio
@respx.mock
async def test_no_fallback_configured_propagates():
    respx.post(PRIMARY).respond(503)

    with pytest.raises(AllRpcsFailed):
        await fetch_with_failover(PRIMARY, None, PAYLOAD, timeout=1.0)


@pytest.mark.asyncio
@respx.mock
async def test_primary_timeout_no_fallback_raises():
    respx.post(PRIMARY).mock(side_effect=httpx.TimeoutException("slow"))

    with pytest.raises(AllRpcsFailed):
        await fetch_with_failover(PRIMARY, None, PAYLOAD, timeout=1.0)


@pytest.mark.asyncio
@respx.mock
async def test_primary_4xx_propagates_to_fallback():
    """4xx tambien es HTTPStatusError - debe activar failover."""
    respx.post(PRIMARY).respond(400, json={"error": "bad request"})
    fb_route = respx.post(FALLBACK).respond(200, json={"result": "0xok"})

    out = await fetch_with_failover(PRIMARY, FALLBACK, PAYLOAD, timeout=1.0)

    assert out["result"] == "0xok"
    assert fb_route.called
