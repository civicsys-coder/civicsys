import pytest
from app.settings import Settings


def test_settings_reads_required_env(monkeypatch):
    monkeypatch.setenv("CHAIN_ID", "31337")
    monkeypatch.setenv("REGISTRY_ADDRESS", "0x" + "1" * 40)
    monkeypatch.setenv("VOTE_ADDRESS", "0x" + "2" * 40)
    monkeypatch.setenv("RPC_URL", "http://localhost:8545")
    monkeypatch.setenv("DATABASE_URL", "postgresql://localhost/civicsys")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
    s = Settings()
    assert s.chain_id == 31337
    assert s.registry_address == "0x" + "1" * 40
    assert s.openrouter_api_key is None


def test_settings_accepts_zktanenbaum(monkeypatch):
    monkeypatch.setenv("CHAIN_ID", "57057")
    monkeypatch.setenv("REGISTRY_ADDRESS", "0x" + "1" * 40)
    monkeypatch.setenv("VOTE_ADDRESS", "0x" + "2" * 40)
    monkeypatch.setenv("RPC_URL", "https://rpc-zk.tanenbaum.io")
    monkeypatch.setenv("DATABASE_URL", "postgresql://localhost/civicsys")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
    s = Settings()
    assert s.chain_id == 57057


def test_settings_rejects_unsupported_chain(monkeypatch):
    monkeypatch.setenv("CHAIN_ID", "999")
    monkeypatch.setenv("REGISTRY_ADDRESS", "0x" + "1" * 40)
    monkeypatch.setenv("VOTE_ADDRESS", "0x" + "2" * 40)
    monkeypatch.setenv("RPC_URL", "http://localhost:8545")
    monkeypatch.setenv("DATABASE_URL", "postgresql://localhost/civicsys")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
    with pytest.raises(Exception):
        Settings()
