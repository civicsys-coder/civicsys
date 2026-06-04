---
id: A-033
title: "Tests blockchain_client con mocks"
owner: "Gabriel"
backup: "junior"
effort: "2 h"
priority: P0
status: pending
depends_on: [A-012]
sprint: 1
layer: agents
---

# A-033 · Tests del cliente blockchain (unit, mockeados)

## Por qué importa
Los tests smoke contra hardhat local son lentos y requieren todo el stack. Los unit tests con mocks corren en milisegundos y cubren los paths de error (cuándo cliente reverte, cuándo el RPC se cae, cuándo el ABI no existe).

## Conceptos clave
- **`unittest.mock.AsyncMock`**: mock especializado para coroutines.
- **`respx`**: mock HTTP para web3.py (que internamente usa httpx).
- **Patch del singleton**: usar `reset_blockchain_client()` entre tests.

## Pre-requisitos
- [ ] [A-012](./A-012-blockchain-client-vote-tally.md) cerrada.

## Paso a paso

### 1. Crear `tests/test_blockchain_client.py`
```python
"""Tests unit del BlockchainClient — todo mockeado."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.services.blockchain_client import (
    AlreadyVoted,
    BlockchainClient,
    BlockchainError,
    CitizenAlreadyRegistered,
    CitizenNotInRegistry,
)


@pytest.mark.asyncio
async def test_initialize_fails_si_chain_mismatch(monkeypatch):
    fake_w3 = MagicMock()
    fake_w3.is_connected = AsyncMock(return_value=True)
    fake_w3.eth.chain_id = 999  # esperamos 57057
    with patch("api.services.blockchain_client.AsyncWeb3", return_value=fake_w3):
        c = BlockchainClient()
        with pytest.raises(BlockchainError, match="chain_id mismatch"):
            await c.initialize()


@pytest.mark.asyncio
async def test_register_si_ya_existe_lanza_excepcion(monkeypatch):
    c = BlockchainClient()
    c._w3 = MagicMock()
    c._signer = MagicMock()
    c._registry = MagicMock()
    c._registry.functions.isRegistered.return_value.call = AsyncMock(return_value=True)
    with pytest.raises(CitizenAlreadyRegistered):
        await c.register_citizen("12345678", "JUAN PEREZ")


@pytest.mark.asyncio
async def test_cast_vote_pre_check_no_registrado():
    c = BlockchainClient()
    c._registry = MagicMock()
    c._registry.functions.isRegistered.return_value.call = AsyncMock(return_value=False)
    c._vote = MagicMock()
    with pytest.raises(CitizenNotInRegistry):
        await c.cast_vote(1, "0x" + "a" * 64, 0)


@pytest.mark.asyncio
async def test_cast_vote_pre_check_already_voted():
    c = BlockchainClient()
    c._registry = MagicMock()
    c._registry.functions.isRegistered.return_value.call = AsyncMock(return_value=True)
    c._vote = MagicMock()
    c._vote.functions.hasVoted.return_value.call = AsyncMock(return_value=True)
    with pytest.raises(AlreadyVoted):
        await c.cast_vote(1, "0x" + "a" * 64, 0)
```

### 2. Commit
```bash
git add agents/tests/test_blockchain_client.py
git commit -m "test(agents): blockchain_client unit con mocks (A-033)"
```

## Verificación / Definition of Done

- ✅ ≥ 6 tests pasan en < 1s.
- ✅ Coverage `blockchain_client.py` ≥ 70% (el resto lo cubren los smoke con hardhat).

## Errores comunes

- **`AsyncMock` no se invoca como async**
  Asegurate de hacer `await mock_function()` (no `mock_function()`).

## Lecturas
- [`unittest.mock` docs](https://docs.python.org/3/library/unittest.mock.html)
- [respx](https://lundberg.github.io/respx/)

## Notas para revisor
- ¿Los tests no requieren hardhat? Confirmar — `pytest tests/test_blockchain_client.py` sin red debe pasar.
