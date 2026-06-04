# T-13 — Tests de RPC fallback

**Prio**: P1 · **Bloqueada por**: T-12 · **ADR**: ADR-003

## Qué hacer

Crear `agents/tests/test_rpc.py`:

```python
import pytest
import respx
import httpx
from app.rpc import fetch_with_failover, AllRpcsFailed

PRIMARY = "https://primary.example/rpc"
FALLBACK = "https://fallback.example/rpc"
PAYLOAD = {"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}


@pytest.mark.asyncio
@respx.mock
async def test_primary_success_no_fallback_called():
    primary = respx.post(PRIMARY).respond(200, json={"result": "0x1"})
    fallback = respx.post(FALLBACK).respond(200, json={"result": "0x99"})
    out = await fetch_with_failover(PRIMARY, FALLBACK, PAYLOAD, timeout=1.0)
    assert out["result"] == "0x1"
    assert primary.called
    assert not fallback.called


@pytest.mark.asyncio
@respx.mock
async def test_primary_timeout_falls_back():
    respx.post(PRIMARY).mock(side_effect=httpx.TimeoutException("timeout"))
    fb = respx.post(FALLBACK).respond(200, json={"result": "0xfa11"})
    out = await fetch_with_failover(PRIMARY, FALLBACK, PAYLOAD, timeout=1.0)
    assert out["result"] == "0xfa11"
    assert fb.called


@pytest.mark.asyncio
@respx.mock
async def test_primary_5xx_falls_back():
    respx.post(PRIMARY).respond(503, json={"error": "down"})
    fb = respx.post(FALLBACK).respond(200, json={"result": "0xfa11"})
    out = await fetch_with_failover(PRIMARY, FALLBACK, PAYLOAD, timeout=1.0)
    assert out["result"] == "0xfa11"
    assert fb.called


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
```

## Criterio de done

- [ ] `pytest agents/tests/test_rpc.py -v` con 5 tests verde.
- [ ] Coverage de `agents/app/rpc.py` = 100%.

## Comando de verificación

```bash
cd agents && python -m pytest tests/test_rpc.py -v --cov=app.rpc --cov-report=term-missing
```
