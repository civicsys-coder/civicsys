"""Pydantic settings cargado del entorno + .env."""

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Chain
    chain_id: int = 31337
    registry_address: str
    vote_address: str
    rpc_url: str
    rpc_fallback: str | None = None  # ADR-003: failover RPC.
    rpc_timeout_seconds: int = 30

    # Database
    database_url: str

    # LLM — Gemini primario (Sprint 02b). Anthropic/OpenRouter quedan como
    # fallback opcional. Al menos uno deberia estar seteado para analisis real;
    # sin ninguno, Hermes persiste reportes con provider="unavailable".
    gemini_api_key: str = ""
    anthropic_api_key: str = ""
    openrouter_api_key: str | None = None
    llm_model_gemini: str = "gemini-3.5-flash"
    llm_model_anthropic: str = "claude-sonnet-4-6"
    # 30s era muy corto: gemini-3.5-flash a veces tarda 30-60s y caía a "simulado"
    # (~2 de 3 veces). Con 60s el provider gemini responde 5/5. Override por env
    # LLM_TIMEOUT_SECONDS si hace falta.
    llm_timeout_seconds: int = 60

    # Integridad de reportes (ADR-002).
    # Default: cadena vacia -> persistencia HMAC deshabilitada (Sprint 02 todavia
    # no persiste reportes). Cuando se introduzca persistencia, este campo debe
    # estar seteado con al menos 32 chars hex.
    memory_integrity_key: str = ""

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    # Hermes
    hermes_template_path: str = "hermes/templates/reporte_voto.md"
    embedding_dim: int = 384

    @field_validator("chain_id")
    @classmethod
    def chain_id_supported(cls, v: int) -> int:
        if v not in (31337, 57057):
            raise ValueError(f"chain_id {v} unsupported (debe ser 31337 o 57057)")
        return v


def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
