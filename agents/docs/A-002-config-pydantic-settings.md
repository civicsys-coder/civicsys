---
id: A-002
title: "config.py centralizado con Pydantic Settings"
owner: "junior"
backup: "Sandro"
effort: "45 min"
priority: P0
status: pending
depends_on: [A-001]
sprint: 1
layer: agents
---

# A-002 · `config.py` centralizado

## Por qué importa
Tener variables sueltas (`os.environ.get("ANTHROPIC_API_KEY")`) dispersas por todo el código es la receta perfecta para bugs sutiles: un módulo lee la key en mayúsculas, otro en minúsculas; alguien escribe `os.getenv("URL_RPC")` cuando la var se llama `RPC_URL`. **Un objeto `settings` único** carga el `.env`, valida tipos, falla rápido si falta algo crítico, y todo el resto del código accede via `settings.attr`.

## Conceptos clave
- **Pydantic Settings v2**: `BaseSettings` lee env vars automáticamente, las castea al tipo declarado y valida con `Field`.
- **Fail-fast**: si falta `ANTHROPIC_API_KEY` en producción, queremos que el proceso muera al arrancar — no a la primera llamada del LLM 5 minutos después.
- **Defaults sensatos**: `RPC_URL` default a zkTanenbaum; `MCP_PORT` default `8765`. Permite arrancar dev sin completar todo.
- **Singleton lazy**: `@lru_cache` sobre `get_settings()` evita recargar el `.env` mil veces.

## Pre-requisitos
- [ ] [A-001](./A-001-setup-pyproject.md) completa.

## Paso a paso

### 1. Crear `api/config.py`
```python
"""Configuración centralizada para agents/.

Cualquier modulo que necesite env vars hace:
    from api.config import settings
    settings.rpc_url

Si una var crítica falta, el constructor de Settings tira ValidationError
al arrancar, no a runtime.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ---- Blockchain ----
    rpc_url: str = Field(default="https://rpc-zk.tanenbaum.io", description="JSON-RPC zkTanenbaum")
    rpc_fallback: str | None = Field(default=None)
    chain_id: int = Field(default=57057)
    citizen_registry_address: str | None = Field(default=None, pattern=r"^0x[0-9a-fA-F]{40}$|^$")
    vote_contract_address: str | None = Field(default=None, pattern=r"^0x[0-9a-fA-F]{40}$|^$")
    deploy_block: int = Field(default=0, ge=0)

    # ---- Signing ----
    signer_private_key: SecretStr | None = Field(default=None)
    public_salt: str = Field(default="ssc-antipereza-2026-publico")

    # ---- LLM (Hermes) ----
    anthropic_api_key: SecretStr | None = Field(default=None)
    llm_model: str = Field(default="claude-sonnet-4-6")
    llm_base_url: str | None = Field(default=None, description="None → Anthropic directo; OpenRouter/Nous → URL")
    llm_max_tokens: int = Field(default=2048, gt=0)

    # ---- API ----
    api_host: str = Field(default="0.0.0.0")
    api_port: int = Field(default=8000, gt=0, lt=65536)
    cors_origins: str = Field(default="http://localhost:3000")

    # ---- MCP ----
    mcp_transport: str = Field(default="stdio")  # stdio | sse
    mcp_port: int = Field(default=8765, gt=0, lt=65536)

    # ---- Hermes ----
    hermes_memory_dir: Path = Field(default=Path("./hermes/memory"))
    hermes_log_level: str = Field(default="INFO")
    hermes_poll_interval: int = Field(default=15, gt=0, description="Segundos entre polls de eventos on-chain")

    # ---- Derived ----
    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @field_validator("mcp_transport")
    @classmethod
    def validate_transport(cls, v: str) -> str:
        if v not in {"stdio", "sse"}:
            raise ValueError(f"mcp_transport debe ser 'stdio' o 'sse', vino: {v}")
        return v


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Singleton perezoso de Settings. Usar en lugar de `Settings()` directo
    para que la lectura del .env ocurra solo una vez."""
    return Settings()


settings = get_settings()


def assert_blockchain_ready() -> None:
    """Función de pre-flight: lanzá esto antes de arrancar el API si necesitás
    blockchain inicializado."""
    s = get_settings()
    missing: list[str] = []
    if not s.citizen_registry_address:
        missing.append("CITIZEN_REGISTRY_ADDRESS")
    if not s.vote_contract_address:
        missing.append("VOTE_CONTRACT_ADDRESS")
    if not s.signer_private_key:
        missing.append("SIGNER_PRIVATE_KEY")
    if missing:
        raise RuntimeError(
            f"Faltan env vars para blockchain: {missing}. "
            f"Hacer deploy de contratos (blockchain/docs/B-019) y completar agents/.env."
        )


def assert_llm_ready() -> None:
    s = get_settings()
    if not s.anthropic_api_key:
        raise RuntimeError("Falta ANTHROPIC_API_KEY en agents/.env")
```

### 2. ¿Por qué `SecretStr` para keys?

`SecretStr` evita que `logger.info(settings)` o `print(settings)` muestren la key. Cuando necesitás el valor real, llamás `.get_secret_value()`. Defensa en profundidad pequeña pero efectiva.

### 3. Validar con un dummy script
Crear `agents/scripts/check-config.py` (no commitear, es solo para vos):

```python
from api.config import get_settings

s = get_settings()
print(f"RPC: {s.rpc_url}")
print(f"Chain: {s.chain_id}")
print(f"LLM model: {s.llm_model}")
print(f"CORS: {s.cors_origins_list}")
print(f"Hermes memory: {s.hermes_memory_dir.resolve()}")
print(f"Signer set: {s.signer_private_key is not None}")
print(f"LLM key set: {s.anthropic_api_key is not None}")
```

```bash
cd agents
python -c "from api.config import get_settings; print(get_settings().model_dump_json(indent=2))"
```

Esperado: JSON con todos los valores cargados, las keys aparecen como `'**********'` (Pydantic enmascara SecretStr en `model_dump_json`).

### 4. Test rápido
Crear `tests/test_config.py`:

```python
from api.config import Settings


def test_default_values_load(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    s = Settings()
    assert s.chain_id == 57057
    assert s.mcp_transport == "stdio"
    assert s.cors_origins_list == ["http://localhost:3000"]


def test_invalid_address_rejected(monkeypatch):
    monkeypatch.setenv("CITIZEN_REGISTRY_ADDRESS", "no-es-direccion")
    import pytest
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        Settings()


def test_secret_str_masked_on_json(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-fake")
    s = Settings()
    json_str = s.model_dump_json()
    assert "sk-test-fake" not in json_str
    assert s.anthropic_api_key.get_secret_value() == "sk-test-fake"
```

```bash
pytest tests/test_config.py -v
```

### 5. Commit
```bash
git add agents/api/config.py agents/tests/test_config.py
git commit -m "feat(agents): config centralizado con Pydantic Settings (A-002)"
```

## Verificación / Definition of Done

```bash
cd agents
pytest tests/test_config.py -v
python -c "from api.config import settings; print(settings.chain_id)"  # → 57057
```

- ✅ 3 tests pasando.
- ✅ Settings importa sin error con `.env` parcial.
- ✅ `assert_blockchain_ready()` reverte si faltan vars críticas.

## Errores comunes

- **`pydantic.ValidationError` al arrancar pero el .env existe**
  Probable: archivo `.env` con BOM (UTF-8 BOM) o encoding raro. Resave en UTF-8 sin BOM.

- **`SecretStr is not JSON serializable`**
  Solo si convertís a JSON con `json.dumps` directo. Usá `model_dump_json` de pydantic — sabe enmascarar.

- **Env var no se lee**
  Verificá: 1) el `.env` está en `agents/.env` (no en `agents/api/.env`); 2) `case_sensitive=False`; 3) tu shell no tiene la var con otro valor (los env vars del shell ganan al .env).

## Lecturas
- [Pydantic Settings docs](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
- [`agents/.env.example`](../.env.example)
- [`docs/security/threat-model-sprint1.md` § T6](../../docs/security/threat-model-sprint1.md)

## Notas para revisor
- ¿`SecretStr` se usa en TODAS las keys/passwords? `signer_private_key`, `anthropic_api_key` deberían ser `SecretStr`.
- Los defaults no deben tener URLs sensibles ni datos privados.
- `assert_blockchain_ready` se llama desde `api/main.py` (cuando se lance), no en cada request.
