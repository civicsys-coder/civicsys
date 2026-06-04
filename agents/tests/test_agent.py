import pytest

from app.agent import HermesAgent


@pytest.mark.asyncio
async def test_help_intent():
    # Sin keys LLM, el agente sigue respondiendo (path determinista).
    r = await HermesAgent().ask("hola")
    assert r.steps
    assert "propuesta" in r.answer.lower()


@pytest.mark.asyncio
async def test_analyze_proposal_uses_tools_and_mock():
    r = await HermesAgent().ask("analizá la propuesta 1")
    tools = [s.tool for s in r.steps]
    assert "get_proposal" in tools and "get_tally" in tools
    assert r.provider == "simulado"  # sin LLM real -> análisis simulado
    assert "%" in r.answer


@pytest.mark.asyncio
async def test_top_proposal_intent():
    r = await HermesAgent().ask("¿cuál tiene más apoyo?")
    assert any(s.tool == "top_proposal" for s in r.steps)


@pytest.mark.asyncio
async def test_unknown_proposal_is_handled():
    r = await HermesAgent().ask("analizá la propuesta 99")
    assert "no tengo" in r.answer.lower()
