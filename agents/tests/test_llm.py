import pytest
import respx
import httpx
from app.llm import LLMClient, LLMResult


@pytest.mark.asyncio
async def test_gemini_happy_path():
    client = LLMClient(gemini_key="gem-test")

    with respx.mock() as mock:
        mock.post(url__regex=r".*generativelanguage.*generateContent").mock(
            return_value=httpx.Response(
                200,
                json={
                    "candidates": [
                        {"content": {"parts": [{"text": "análisis gemini simulado"}]}}
                    ],
                },
            )
        )
        result = await client.complete("prompt de prueba")
        assert isinstance(result, LLMResult)
        assert result.provider == "gemini"
        assert "gemini" in result.text
        assert result.confidence > 0


@pytest.mark.asyncio
async def test_gemini_fallback_to_anthropic():
    client = LLMClient(gemini_key="gem-test", anthropic_key="sk-ant-test")

    with respx.mock() as mock:
        mock.post(url__regex=r".*generativelanguage.*").mock(
            return_value=httpx.Response(500)
        )
        mock.post("https://api.anthropic.com/v1/messages").mock(
            return_value=httpx.Response(
                200,
                json={
                    "content": [{"type": "text", "text": "fallback anthropic"}],
                    "model": "claude-sonnet-4-6",
                },
            )
        )
        result = await client.complete("prompt")
        assert result.provider == "anthropic"
        assert "fallback anthropic" in result.text


@pytest.mark.asyncio
async def test_anthropic_happy_path():
    client = LLMClient(anthropic_key="sk-ant-test", openrouter_key=None)

    with respx.mock(base_url="https://api.anthropic.com") as mock:
        mock.post("/v1/messages").mock(
            return_value=httpx.Response(
                200,
                json={
                    "content": [{"type": "text", "text": "análisis Hermes simulado"}],
                    "model": "claude-sonnet-4-6",
                },
            )
        )
        result = await client.complete("prompt de prueba")
        assert isinstance(result, LLMResult)
        assert result.provider == "anthropic"
        assert "análisis Hermes" in result.text
        assert result.confidence > 0


@pytest.mark.asyncio
async def test_fallback_to_openrouter():
    client = LLMClient(anthropic_key="sk-ant-test", openrouter_key="sk-or-test")

    with respx.mock() as mock:
        mock.post("https://api.anthropic.com/v1/messages").mock(
            return_value=httpx.Response(500)
        )
        mock.post("https://openrouter.ai/api/v1/chat/completions").mock(
            return_value=httpx.Response(
                200,
                json={
                    "choices": [{"message": {"content": "respuesta openrouter"}}],
                    "model": "openrouter/anthropic/claude-sonnet-4-6",
                },
            )
        )
        result = await client.complete("prompt")
        assert result.provider == "openrouter"
        assert "openrouter" in result.text


@pytest.mark.asyncio
async def test_both_fail_returns_unavailable():
    client = LLMClient(anthropic_key="sk-ant-test", openrouter_key="sk-or-test")
    with respx.mock() as mock:
        mock.post("https://api.anthropic.com/v1/messages").mock(
            return_value=httpx.Response(500)
        )
        mock.post("https://openrouter.ai/api/v1/chat/completions").mock(
            return_value=httpx.Response(500)
        )
        result = await client.complete("prompt")
        assert result.provider == "unavailable"
        assert result.confidence == 0


@pytest.mark.asyncio
async def test_no_keys_returns_unavailable_immediately():
    client = LLMClient(anthropic_key=None, openrouter_key=None)
    result = await client.complete("prompt")
    assert result.provider == "unavailable"
    assert result.confidence == 0
