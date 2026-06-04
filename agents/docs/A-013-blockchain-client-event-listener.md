---
id: A-013
title: "services/event_listener.py — poll de ProposalClosed"
owner: "Sandro"
backup: "junior"
effort: "2 h"
priority: P0
status: pending
depends_on: [A-009, A-012]
sprint: 1
layer: agents
---

# A-013 · Event listener

## Por qué importa
Hermes **debe** enterarse del cierre de una propuesta para generar el reporte. Sin un listener, Hermes solo reportaría cuando alguien hace `GET /reports/{id}` — flujo "pull" lento e inconsistente. El listener "push" mantiene la latencia baja y el reporte siempre fresco.

## Conceptos clave
- **Polling vs WebSocket**: WebSocket es ideal pero requiere RPC compatible. En Sprint 1 hacemos polling con `eth_getLogs` cada N segundos. Funciona universalmente.
- **Cursor de bloque**: guardamos el `last_processed_block` en `hermes/memory/` para no re-procesar después de un restart.
- **Reorgs**: en testnet pueden ocurrir reorgs cortos. Esperamos `N` confirmaciones antes de procesar (ej. 3 bloques).
- **Idempotencia**: procesar el mismo evento dos veces NO debe generar dos reportes. Mantener un set de `tx_hash` procesados.

## Pre-requisitos
- [ ] [A-009](./A-009-blockchain-client-setup.md), [A-012](./A-012-blockchain-client-vote-tally.md) cerradas.

## Paso a paso

### 1. Crear `api/services/event_listener.py`
```python
"""Polling de eventos on-chain (ProposalClosed) para alimentar a Hermes."""
from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path
from typing import Awaitable, Callable

from api.config import get_settings
from api.services.blockchain_client import BlockchainClient, get_blockchain_client

logger = logging.getLogger(__name__)

CONFIRMATION_BLOCKS = 3


class EventListener:
    def __init__(
        self,
        client: BlockchainClient,
        on_proposal_closed: Callable[[dict], Awaitable[None]],
        state_path: Path,
        poll_interval_s: int = 15,
    ) -> None:
        self._client = client
        self._cb = on_proposal_closed
        self._state_path = state_path
        self._poll_interval = poll_interval_s
        self._stop = asyncio.Event()
        self._processed_tx: set[str] = set()
        self._last_block: int = 0

    def _load_state(self) -> None:
        if self._state_path.exists():
            data = json.loads(self._state_path.read_text())
            self._last_block = int(data.get("last_block", 0))
            self._processed_tx = set(data.get("processed_tx", []))
        else:
            self._last_block = get_settings().deploy_block

    def _save_state(self) -> None:
        self._state_path.parent.mkdir(parents=True, exist_ok=True)
        self._state_path.write_text(json.dumps({
            "last_block": self._last_block,
            "processed_tx": sorted(self._processed_tx)[-1000:],  # cap
        }, indent=2))

    async def run(self) -> None:
        self._load_state()
        logger.info("event_listener starting", extra={"from_block": self._last_block})

        while not self._stop.is_set():
            try:
                await self._tick()
            except Exception as e:
                logger.exception("event_listener tick failed: %s", e)
                # No matamos el loop por un error transitorio
            try:
                await asyncio.wait_for(self._stop.wait(), timeout=self._poll_interval)
            except asyncio.TimeoutError:
                pass

    async def _tick(self) -> None:
        latest = await self._client.w3.eth.block_number
        safe_to = max(0, latest - CONFIRMATION_BLOCKS)
        if safe_to <= self._last_block:
            return

        event = self._client.vote.events.ProposalClosed()
        logs = await event.get_logs(fromBlock=self._last_block + 1, toBlock=safe_to)
        for log in logs:
            tx_hash = log["transactionHash"].hex()
            if tx_hash in self._processed_tx:
                continue
            payload = {
                "proposal_id": int(log["args"]["proposalId"]),
                "tally": [int(x) for x in log["args"]["tally"]],
                "timestamp": int(log["args"]["timestamp"]),
                "tx_hash": tx_hash,
                "block_number": int(log["blockNumber"]),
            }
            logger.info("ProposalClosed seen", extra=payload)
            try:
                await self._cb(payload)
                self._processed_tx.add(tx_hash)
            except Exception as e:
                logger.exception("callback failed for %s: %s", tx_hash, e)
                continue

        self._last_block = safe_to
        self._save_state()

    def stop(self) -> None:
        self._stop.set()


async def create_default_listener(
    on_proposal_closed: Callable[[dict], Awaitable[None]],
) -> EventListener:
    s = get_settings()
    client = await get_blockchain_client()
    state_path = s.hermes_memory_dir / "event_cursor.json"
    return EventListener(
        client=client,
        on_proposal_closed=on_proposal_closed,
        state_path=state_path,
        poll_interval_s=s.hermes_poll_interval,
    )
```

### 2. Estado persistente
El archivo `agents/hermes/memory/event_cursor.json` se ve así:
```json
{
  "last_block": 12345,
  "processed_tx": ["0xabc...", "0xdef..."]
}
```

> `processed_tx` es un set capado a 1000 entradas (deque-style). Suficiente para Sprint 1.

### 3. Test con un mock callback
```python
# tests/test_event_listener.py
import json
import tempfile
from pathlib import Path
import pytest
from unittest.mock import AsyncMock, MagicMock
from api.services.event_listener import EventListener


@pytest.mark.asyncio
async def test_state_persistence(tmp_path: Path):
    cb = AsyncMock()
    client = MagicMock()
    client.w3.eth.block_number = 0
    listener = EventListener(client, cb, tmp_path / "cursor.json", poll_interval_s=1)
    listener._last_block = 100
    listener._processed_tx = {"0xabc"}
    listener._save_state()
    saved = json.loads((tmp_path / "cursor.json").read_text())
    assert saved["last_block"] == 100
    assert "0xabc" in saved["processed_tx"]
```

### 4. Commit
```bash
git add agents/api/services/event_listener.py agents/tests/test_event_listener.py
git commit -m "feat(agents): event_listener poll ProposalClosed (A-013)"
```

## Verificación / Definition of Done

- ✅ Estado persiste entre restarts.
- ✅ `tx_hash` ya procesado no re-dispara callback.
- ✅ Confirmation blocks = 3 implementadas.
- ✅ Falla del callback no mata el loop.

## Errores comunes

- **`get_logs` retorna nada incluso con eventos visibles**
  El `fromBlock` puede ser mayor que `toBlock`. Confirmar `latest - CONFIRMATION_BLOCKS > last_block`.

- **`processed_tx` crece sin fin**
  Cap aplicado (1000). Si necesitás más, mover a SQLite.

- **Reorg saca un evento que ya procesamos**
  Sprint 1 acepta el riesgo (testnet pequeña). Sprint 2: tracking de bloque + tx + log_index.

## Lecturas
- [web3.py — Events](https://web3py.readthedocs.io/en/stable/web3.contract.html#events)

## Notas para revisor
- ¿La excepción del callback se loguea pero el loop sigue? Verificar.
- ¿`_processed_tx` se serializa ordenado? Eso ayuda a diffs en review.
