---
id: A-022
title: "hermes/llm_client.py — Anthropic SDK + OpenRouter compat"
owner: "Sandro"
backup: "junior"
effort: "1.5 h"
priority: P0
status: pending
depends_on: [A-002]
sprint: 1
layer: agents
---

# A-022 · LLM client de Hermes

## Por qué importa
Hermes habla con un LLM (Claude por defecto). Necesitamos un wrapper que:
- Centralice configuración (modelo, temperatura, max_tokens).
- Acepte fallback a OpenRouter / Nous Portal via `base_url`.
- Sea **async**.
- Tenga **prompt caching** (Claude lo soporta nativo → ahorra costo en re-runs con mismo SOUL/INSTINCT).

## Conceptos clave
- **Prompt caching de Claude**: los primeros bloques del prompt (system, ej. SOUL.md) se marcan como `cache_control: {"type": "ephemeral"}` y el SDK descuenta el costo. [Skill claude-api](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching).
- **`base_url`**: redirige el cliente a un proxy compatible (OpenRouter). Permite cambiar provider sin tocar código.
- **`SecretStr.get_secret_value()`**: forma segura de extraer la clave.

## Pre-requisitos
- [ ] [A-002](./A-002-config-pydantic-settings.md) cerrada.

## Paso a paso

### 1. Crear `hermes/llm_client.py`
```python
"""Wrapper async de Anthropic SDK con prompt caching."""
from __future__ import annotations

import logging
from typing import Any

from anthropic import AsyncAnthropic

from api.config import get_settings

logger = logging.getLogger(__name__)


class LLMClient:
    def __init__(self) -> None:
        s = get_settings()
        if s.anthropic_api_key is None:
            raise RuntimeError("ANTHROPIC_API_KEY no presente")
        kwargs: dict[str, Any] = {"api_key": s.anthropic_api_key.get_secret_value()}
        if s.llm_base_url:
            kwargs["base_url"] = s.llm_base_url
        self._client = AsyncAnthropic(**kwargs)
        self._model = s.llm_model
        self._max_tokens = s.llm_max_tokens

    async def complete(
        self,
        system_blocks: list[dict[str, Any]],
        user_message: str,
        temperature: float = 0.3,
        max_tokens: int | None = None,
    ) -> str:
        """Llama al modelo y retorna el texto plano."""
        max_tokens = max_tokens or self._max_tokens
        resp = await self._client.messages.create(
            model=self._model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_blocks,
            messages=[{"role": "user", "content": user_message}],
        )
        # resp.content es una lista de bloques. Para texto plano tomamos el primero.
        if not resp.content:
            return ""
        return resp.content[0].text  # type: ignore[union-attr]


_singleton: LLMClient | None = None


def get_llm_client() -> LLMClient:
    global _singleton
    if _singleton is None:
        _singleton = LLMClient()
    return _singleton


def build_cacheable_system(soul_md: str, instinct_md: str) -> list[dict[str, Any]]:
    """Convierte SOUL.md e INSTINCT.md en bloques system con cache_control.

    Estos bloques son grandes y casi nunca cambian → se aprovecha caché.
    """
    return [
        {
            "type": "text",
            "text": "Identidad de Hermes (SOUL.md):\n\n" + soul_md,
            "cache_control": {"type": "ephemeral"},
        },
        {
            "type": "text",
            "text": "Reflejos por defecto (INSTINCT.md):\n\n" + instinct_md,
            "cache_control": {"type": "ephemeral"},
        },
    ]
```

### 2. Test (con respx para mockear la API)
```python
# tests/test_llm_client.py
import pytest
import respx
import httpx
from api.config import get_settings


@pytest.mark.asyncio
async def test_llm_complete(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test")
    get_settings.cache_clear()  # type: ignore[attr-defined]

    with respx.mock(base_url="https://api.anthropic.com") as mock:
        mock.post("/v1/messages").mock(return_value=httpx.Response(
            200,
            json={
                "id": "msg_1",
                "type": "message",
                "role": "assistant",
                "model": "claude-sonnet-4-6",
                "content": [{"type": "text", "text": "Hola mundo"}],
                "stop_reason": "end_turn",
                "usage": {"input_tokens": 10, "output_tokens": 2},
            },
        ))
        from hermes.llm_client import LLMClient
        c = LLMClient()
        out = await c.complete(
            system_blocks=[{"type": "text", "text": "Sé conciso"}],
            user_message="¿Hola?",
        )
        assert out == "Hola mundo"
```

### 3. Commit
```bash
git add agents/hermes/llm_client.py agents/tests/test_llm_client.py
git commit -m "feat(agents): hermes/llm_client.py con prompt cache (A-022)"
```

## Verificación / Definition of Done

- ✅ Test pasa con `respx`.
- ✅ Si `LLM_BASE_URL` está set, el cliente apunta ahí.
- ✅ `build_cacheable_system` agrega `cache_control: ephemeral` a SOUL+INSTINCT.
- ✅ No se loguea la `api_key`.

## Errores comunes

- **`AsyncAnthropic` no acepta `base_url`**
  En SDK ≥ 0.30 sí. Si tu versión es vieja, actualizar.

- **`resp.content[0].text` falla**
  El bloque puede ser un `ToolUseBlock` u otro tipo. Si solo esperás texto, asegurate de que `system` no pide herramientas.

## Lecturas
- [Anthropic — Prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
- [Skill `claude-api`](file:///../../) — referencia interna

## Notas para revisor
- ¿`cache_control` está aplicado a los bloques grandes? Confirmar.
- En Sprint 2 podemos agregar streaming para mejorar UX.
