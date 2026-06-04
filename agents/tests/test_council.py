import pytest

from app import mockdata
from app.council import HermesCouncil, get_evolution, get_swarm_state


@pytest.mark.asyncio
async def test_deliberate_runs_full_council():
    # Sin keys LLM → cada consejero cae a su variante "simulada".
    res = await HermesCouncil().deliberate(mockdata.PROPOSALS[0])
    assert len(res["advisors"]) == 4
    assert all(a["postura"] in ("A_FAVOR", "EN_CONTRA", "CAUTELA") for a in res["advisors"])
    assert all(a["provider"] == "simulado" for a in res["advisors"])
    assert res["verdict"]["text"]
    assert res["divergence"]["level"] in ("baja", "media", "alta")
    assert isinstance(res["consensus"], bool)


@pytest.mark.asyncio
async def test_evolution_and_swarm_state_updated():
    await HermesCouncil().deliberate(mockdata.PROPOSALS[1])
    assert get_evolution(), "el ledger de evolución debería tener al menos una sesión"
    swarm = get_swarm_state()
    assert len(swarm) == 4
    assert any(a["runs"] > 0 for a in swarm)
