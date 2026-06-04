"""
Multi-provider LLM client: Gemini primario, Anthropic y OpenRouter fallback.
Si todos fallan, devuelve LLMResult(provider="unavailable", confidence=0).

Endpoints hardcoded (api.anthropic.com, openrouter.ai,
generativelanguage.googleapis.com): NO se expone LLM_BASE_URL configurable
para evitar el vector AI-PI-04 (proxy man-in-the-middle). Ver agents/README.md.
"""

from dataclasses import dataclass
from typing import Literal
import logging
import httpx

logger = logging.getLogger(__name__)

Provider = Literal["gemini", "anthropic", "openrouter", "unavailable"]


@dataclass
class LLMResult:
    text: str
    provider: Provider
    confidence: int


class LLMClient:
    def __init__(
        self,
        gemini_key: str | None = None,
        anthropic_key: str | None = None,
        openrouter_key: str | None = None,
        timeout: float = 30.0,
        model_gemini: str = "gemini-3.5-flash",
        model_anthropic: str = "claude-sonnet-4-6",
        model_openrouter: str = "anthropic/claude-sonnet-4-6",
    ):
        self.gemini_key = gemini_key
        self.anthropic_key = anthropic_key
        self.openrouter_key = openrouter_key
        self.timeout = timeout
        self.model_gemini = model_gemini
        self.model_anthropic = model_anthropic
        self.model_openrouter = model_openrouter

    async def complete(
        self, prompt: str, max_tokens: int = 1024, temperature: float | None = None
    ) -> LLMResult:
        if self.gemini_key:
            try:
                return await self._gemini(prompt, max_tokens, temperature)
            except Exception as e:
                logger.warning("gemini failed: %s", e)
        if self.anthropic_key:
            try:
                return await self._anthropic(prompt, max_tokens)
            except Exception as e:
                logger.warning("anthropic failed: %s", e)
        if self.openrouter_key:
            try:
                return await self._openrouter(prompt, max_tokens)
            except Exception as e:
                logger.warning("openrouter failed: %s", e)
        return LLMResult(
            text="<unavailable: LLM no respondió>",
            provider="unavailable",
            confidence=0,
        )

    async def _gemini(
        self, prompt: str, max_tokens: int, temperature: float | None = None
    ) -> LLMResult:
        # Google Generative Language API (AI Studio). El modelo va en la URL.
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.model_gemini}:generateContent"
        )
        gen_cfg: dict = {
            "maxOutputTokens": max_tokens,
            # gemini-3.5-flash es "thinking": sin cap, el razonamiento se come el
            # presupuesto de salida y trunca/corrompe la respuesta. 0 = desactivarlo.
            "thinkingConfig": {"thinkingBudget": 0},
        }
        if temperature is not None:
            gen_cfg["temperature"] = temperature
        async with httpx.AsyncClient(timeout=self.timeout) as cli:
            r = await cli.post(
                url,
                headers={
                    "x-goog-api-key": self.gemini_key or "",
                    "content-type": "application/json",
                },
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": gen_cfg,
                },
            )
            r.raise_for_status()
            data = r.json()
            candidates = data.get("candidates") or []
            parts = (
                candidates[0].get("content", {}).get("parts", []) if candidates else []
            )
            text = "".join(p.get("text", "") for p in parts).strip()
            if not text:
                # respuesta vacía o truncada (p.ej. todo el presupuesto fue a "thinking")
                raise ValueError("gemini: respuesta vacía/truncada")
            return LLMResult(text=text, provider="gemini", confidence=8)

    async def _anthropic(self, prompt: str, max_tokens: int) -> LLMResult:
        async with httpx.AsyncClient(timeout=self.timeout) as cli:
            r = await cli.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": self.anthropic_key or "",
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": self.model_anthropic,
                    "max_tokens": max_tokens,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            r.raise_for_status()
            data = r.json()
            text = "".join(b["text"] for b in data["content"] if b["type"] == "text")
            return LLMResult(text=text, provider="anthropic", confidence=8)

    async def _openrouter(self, prompt: str, max_tokens: int) -> LLMResult:
        async with httpx.AsyncClient(timeout=self.timeout) as cli:
            r = await cli.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.openrouter_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model_openrouter,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": max_tokens,
                },
            )
            r.raise_for_status()
            data = r.json()
            text = data["choices"][0]["message"]["content"]
            return LLMResult(text=text, provider="openrouter", confidence=7)
