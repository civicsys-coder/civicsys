import pytest
from httpx import AsyncClient, ASGITransport


@pytest.mark.asyncio
async def test_health_endpoint(monkeypatch):
    monkeypatch.setenv("CHAIN_ID", "31337")
    monkeypatch.setenv("REGISTRY_ADDRESS", "0x" + "1" * 40)
    monkeypatch.setenv("VOTE_ADDRESS", "0x" + "2" * 40)
    monkeypatch.setenv("RPC_URL", "http://localhost:8545")
    monkeypatch.setenv("DATABASE_URL", "postgresql://localhost/civicsys")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")

    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/agents/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["chain_id"] == 31337
    assert data["agent"] == "hermes"


@pytest.mark.asyncio
async def test_dedupe_face_endpoint():
    from app.main import app

    emb = [0.0] * 384
    emb[0] = 1.0
    fc = "0x" + "ab" * 32
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        # registrar primero
        r1 = await c.post(
            "/agents/identity/register-face",
            json={"embedding": emb, "faceCommitment": fc},
        )
        assert r1.status_code == 200
        # mismo embedding -> duplicado (solo booleano: sin topMatch/similarity,
        # anti-enumeración del padrón, hardening MNEMA)
        r2 = await c.post("/agents/identity/dedupe-face", json={"embedding": emb})
    assert r2.status_code == 200
    body = r2.json()
    assert body["duplicate"] is True
    assert "topMatch" not in body
    assert "similarity" not in body


@pytest.mark.asyncio
async def test_channels_register_endpoint():
    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r1 = await c.post(
            "/agents/channels/register", json={"channel": "telegram", "person_ref": "zoe-e2e"}
        )
        assert r1.status_code == 200 and r1.json()["accepted"] is True
        # misma persona por otro canal -> rechazada
        r2 = await c.post(
            "/agents/channels/register", json={"channel": "discord", "person_ref": "zoe-e2e"}
        )
        assert r2.json()["accepted"] is False
        rs = await c.get("/agents/channels/status")
    assert "telegram" in rs.json()["channels"]


@pytest.mark.asyncio
async def test_toxica_analyze_endpoint(monkeypatch):
    # /toxica/analyze construye el LLM desde settings → requiere env de chain.
    monkeypatch.setenv("CHAIN_ID", "31337")
    monkeypatch.setenv("REGISTRY_ADDRESS", "0x" + "1" * 40)
    monkeypatch.setenv("VOTE_ADDRESS", "0x" + "2" * 40)
    monkeypatch.setenv("RPC_URL", "http://localhost:8545")
    monkeypatch.setenv("DATABASE_URL", "postgresql://localhost/civicsys")
    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.post(
            "/agents/toxica/analyze",
            json={"proposal_id": 1, "transcript": "El congreso archivó la reforma."},
        )
    assert r.status_code == 200
    body = r.json()
    assert body["proposal_id"] == 1
    assert body["approved"] is False  # human-in-the-loop
    assert body["public_post"]
