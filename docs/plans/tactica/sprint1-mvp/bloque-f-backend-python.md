# Bloque F · Backend Python (FastAPI + Hermes runtime) + tests pytest 80%

**Objetivo**: Implementar el runtime Hermes en Python: FastAPI minimal con endpoints `/agents/health`, `/agents/reports/{id}`. Listener web3.py que detecta `ProposalClosed` / `VoteCast` y dispara la generación de reportes via LLM (Anthropic primario, OpenRouter fallback). Persistencia en Supabase (Postgres + pgvector). Coverage pytest ≥80% statements.

**Tareas**: 16
**LOC estimado**: ~600
**Dependencias**: Bloques C (ABIs en `shared/abis/`), D (types), A (Supabase + Anvil).
**Coverage gate**: `pytest --cov=app --cov-fail-under=80`.

---

## Task F.1 — Bootstrap pyproject.toml en `agents/`

**Files**: Create `agents/pyproject.toml`.

- [ ] **Step 1**: Crear pyproject

```bash
cat > agents/pyproject.toml <<'EOF'
[project]
name = "civicsys-agents"
version = "0.1.0"
description = "Hermes runtime + FastAPI bridge para SSC ANTIPEREZA"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.32",
    "pydantic>=2.9",
    "pydantic-settings>=2.6",
    "web3>=7.4",
    "httpx>=0.27",
    "anthropic>=0.40",
    "asyncpg>=0.30",
    "sqlalchemy[asyncio]>=2.0",
    "pgvector>=0.3.6",
    "sentence-transformers>=3.3",  # all-MiniLM-L6-v2 local embeddings
    "python-dotenv>=1.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3",
    "pytest-asyncio>=0.24",
    "pytest-cov>=6.0",
    "pytest-httpx>=0.34",
    "respx>=0.21",  # mock requests para anthropic SDK
    "ruff>=0.7",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["app", "hermes"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
addopts = "-v --cov=app --cov-report=term-missing --cov-fail-under=80"

[tool.coverage.run]
source = ["app"]
omit = ["app/__init__.py"]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "raise NotImplementedError",
    "if __name__ == .__main__.:",
]
EOF
```

- [ ] **Step 2**: Crear virtualenv e instalar

```bash
cd agents
python -m venv .venv
source .venv/Scripts/activate  # Windows Git Bash; en Linux: source .venv/bin/activate
pip install -e ".[dev]"
```

> **Nota**: `sentence-transformers` baja ~80MB de modelo en primer uso. Esto vive en `~/.cache/huggingface/` y es cross-project.

- [ ] **Step 3**: Verificar instalación

```bash
python -c "import fastapi, web3, anthropic, sqlalchemy, pgvector; print('OK')"
```

Expected: `OK`.

- [ ] **Step 4**: Commit

```bash
cd ..
git add agents/pyproject.toml
git commit -m "agents(F.1): pyproject.toml con FastAPI + web3 + anthropic + sqlalchemy + pgvector + pytest 80% gate"
```

---

## Task F.2 — `agents/.gitignore` y estructura base

**Files**: Create `agents/.gitignore`, scaffold dirs.

- [ ] **Step 1**: gitignore + dirs

```bash
cat > agents/.gitignore <<'EOF'
.venv/
__pycache__/
*.pyc
.pytest_cache/
.coverage
htmlcov/
coverage.xml
.env
dist/
build/
*.egg-info/
EOF

mkdir -p agents/app agents/tests agents/hermes/templates
touch agents/app/__init__.py agents/tests/__init__.py
```

- [ ] **Step 2**: Commit

```bash
git add agents/.gitignore agents/app/__init__.py agents/tests/__init__.py
git commit -m "agents(F.2): scaffold .gitignore + app/ + tests/ + hermes/templates/"
```

---

## Task F.3 — Settings con pydantic-settings + tests

**Files**:
- Create: `agents/app/settings.py`
- Create: `agents/tests/test_settings.py`

- [ ] **Step 1**: Test primero

```bash
cat > agents/tests/test_settings.py <<'EOF'
import os
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
    assert s.openrouter_api_key is None  # opcional


def test_settings_rejects_unsupported_chain(monkeypatch):
    monkeypatch.setenv("CHAIN_ID", "999")
    monkeypatch.setenv("REGISTRY_ADDRESS", "0x" + "1" * 40)
    monkeypatch.setenv("VOTE_ADDRESS", "0x" + "2" * 40)
    monkeypatch.setenv("RPC_URL", "http://localhost:8545")
    monkeypatch.setenv("DATABASE_URL", "postgresql://localhost/civicsys")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
    with pytest.raises(ValueError, match="chain_id"):
        Settings()
EOF
```

- [ ] **Step 2**: Implementación

```bash
cat > agents/app/settings.py <<'EOF'
"""Pydantic settings cargado del entorno + .env."""

from typing import Literal
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

    # Database
    database_url: str

    # LLM
    anthropic_api_key: str
    openrouter_api_key: str | None = None
    llm_model_anthropic: str = "claude-sonnet-4-6"
    llm_timeout_seconds: int = 30

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    # Hermes
    hermes_template_path: str = "hermes/templates/reporte_voto.md"
    embedding_dim: int = 384
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    @field_validator("chain_id")
    @classmethod
    def chain_id_supported(cls, v: int) -> int:
        if v not in (31337, 57057):
            raise ValueError(f"chain_id {v} unsupported (debe ser 31337 o 57057)")
        return v


def get_settings() -> Settings:
    """Factory que lee de env. Útil para inyección en tests."""
    return Settings()  # type: ignore[call-arg]
EOF
```

- [ ] **Step 3**: Run tests

```bash
cd agents && source .venv/Scripts/activate
pytest tests/test_settings.py -v
```

Expected: 2 tests verde.

- [ ] **Step 4**: Commit

```bash
cd ..
git add agents/app/settings.py agents/tests/test_settings.py
git commit -m "agents(F.3): Settings pydantic-settings + 2 tests (env required + chain_id validation)"
```

---

## Task F.4 — Helper `citizen_hash` con tests

**Files**:
- Create: `agents/app/helpers.py`
- Create: `agents/tests/test_helpers.py`

- [ ] **Step 1**: Test (mismo helper que el frontend usa con keccak256)

```bash
cat > agents/tests/test_helpers.py <<'EOF'
from app.helpers import compute_citizen_hash


def test_compute_hash_matches_keccak_format():
    # Mismo hash que viem.keccak256(encodePacked([dni, salt]))
    # produciría
    h = compute_citizen_hash("12345678", "ssc-antipereza-2026-publico")
    assert h.startswith("0x")
    assert len(h) == 66  # 0x + 64 hex


def test_compute_hash_deterministic():
    h1 = compute_citizen_hash("12345678", "salt")
    h2 = compute_citizen_hash("12345678", "salt")
    assert h1 == h2


def test_compute_hash_differs_per_dni():
    h1 = compute_citizen_hash("12345678", "salt")
    h2 = compute_citizen_hash("87654321", "salt")
    assert h1 != h2
EOF
```

- [ ] **Step 2**: Impl

```bash
cat > agents/app/helpers.py <<'EOF'
"""Helpers compartidos. Mantener mínimo — si crece, splittear."""

from eth_utils import keccak


def compute_citizen_hash(dni: str, public_salt: str) -> str:
    """
    Calcula el hash on-chain de un ciudadano.

    Equivalente a Solidity:
        keccak256(abi.encodePacked(dni, public_salt))

    Equivalente a viem:
        keccak256(encodePacked(['string', 'string'], [dni, public_salt]))

    NO logueamos el DNI raw acá. Solo el resultado.
    """
    payload = dni.encode("utf-8") + public_salt.encode("utf-8")
    return "0x" + keccak(payload).hex()
EOF
```

- [ ] **Step 3**: Install eth-utils si no viene transitivamente (probablemente sí via web3)

```bash
pip install eth-utils
```

- [ ] **Step 4**: Run tests

```bash
pytest tests/test_helpers.py -v
```

Expected: 3 verde.

- [ ] **Step 5**: Commit

```bash
cd ..
git add agents/app/helpers.py agents/tests/test_helpers.py
git commit -m "agents(F.4): compute_citizen_hash · 3 tests (keccak format · determinista · diferencias)"
```

---

## Task F.5 — Modelos SQLAlchemy

**Files**: Create `agents/app/db.py` + `agents/app/models.py`.

- [ ] **Step 1**: db.py (engine + session factory)

```bash
cat > agents/app/db.py <<'EOF'
"""SQLAlchemy async engine + session factory."""

from collections.abc import AsyncIterator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.settings import get_settings


def _make_engine():
    settings = get_settings()
    # asyncpg driver
    url = settings.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return create_async_engine(url, pool_size=5, max_overflow=10)


engine = _make_engine()
SessionFactory = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    """Dependency injection helper para FastAPI."""
    async with SessionFactory() as session:
        yield session
EOF
```

- [ ] **Step 2**: models.py

```bash
cat > agents/app/models.py <<'EOF'
"""SQLAlchemy declarative models para las tablas Supabase."""

from datetime import datetime
from sqlalchemy import BigInteger, Boolean, DateTime, Integer, SmallInteger, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from pgvector.sqlalchemy import Vector


class Base(DeclarativeBase):
    pass


class ProposalCache(Base):
    __tablename__ = "proposals_cache"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    chain_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    ipfs_cid: Mapped[str | None] = mapped_column(Text)
    open_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    close_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    closed: Mapped[bool] = mapped_column(Boolean, default=False)
    yes: Mapped[int] = mapped_column(BigInteger, default=0)
    no: Mapped[int] = mapped_column(BigInteger, default=0)
    abstain: Mapped[int] = mapped_column(BigInteger, default=0)
    refreshed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class HermesReport(Base):
    __tablename__ = "hermes_reports"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    proposal_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    chain_id: Mapped[int] = mapped_column(Integer, nullable=False)
    body_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    llm_provider: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    tx_hash: Mapped[str | None] = mapped_column(Text)
    block_number: Mapped[int | None] = mapped_column(BigInteger)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class HermesMemory(Base):
    __tablename__ = "hermes_memory"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    report_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("hermes_reports.id", ondelete="CASCADE"), nullable=False
    )
    embedding: Mapped[list[float]] = mapped_column(Vector(384))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    address: Mapped[str | None] = mapped_column(Text)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    payload: Mapped[dict | None] = mapped_column(JSONB)
    chain_id: Mapped[int | None] = mapped_column(Integer)
    tx_hash: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
EOF
```

- [ ] **Step 3**: Commit

```bash
cd ..
git add agents/app/db.py agents/app/models.py
git commit -m "agents(F.5): SQLAlchemy async engine + 4 models (ProposalCache/HermesReport/HermesMemory/Session)"
```

---

## Task F.6 — LLM client con dual provider + tests

**Files**:
- Create: `agents/app/llm.py`
- Create: `agents/tests/test_llm.py`

- [ ] **Step 1**: Test (con respx para mockear HTTP)

```bash
cat > agents/tests/test_llm.py <<'EOF'
import pytest
import respx
import httpx
from app.llm import LLMClient, LLMResult


@pytest.mark.asyncio
async def test_anthropic_happy_path(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
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
async def test_fallback_to_openrouter(monkeypatch):
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
EOF
```

- [ ] **Step 2**: Impl

```bash
cat > agents/app/llm.py <<'EOF'
"""
Dual-provider LLM client: Anthropic primario, OpenRouter fallback.
Si ambos fallan, devuelve LLMResult(provider="unavailable", confidence=0) en lugar
de romper el pipeline. Esto permite que el demo siga corriendo aunque la red
LLM esté caída — el reporte queda con análisis "<unavailable>".
"""

from dataclasses import dataclass
from typing import Literal
import httpx
import logging

logger = logging.getLogger(__name__)

Provider = Literal["anthropic", "openrouter", "unavailable"]


@dataclass
class LLMResult:
    text: str
    provider: Provider
    confidence: int  # 0-10


class LLMClient:
    def __init__(
        self,
        anthropic_key: str | None = None,
        openrouter_key: str | None = None,
        timeout: float = 30.0,
        model_anthropic: str = "claude-sonnet-4-6",
        model_openrouter: str = "anthropic/claude-sonnet-4-6",
    ):
        self.anthropic_key = anthropic_key
        self.openrouter_key = openrouter_key
        self.timeout = timeout
        self.model_anthropic = model_anthropic
        self.model_openrouter = model_openrouter

    async def complete(self, prompt: str, max_tokens: int = 1024) -> LLMResult:
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
EOF
```

- [ ] **Step 3**: Run

```bash
pytest tests/test_llm.py -v
```

Expected: 3 verde.

- [ ] **Step 4**: Commit

```bash
cd ..
git add agents/app/llm.py agents/tests/test_llm.py
git commit -m "agents(F.6): LLMClient dual provider (anthropic + openrouter fallback) · 3 tests verde"
```

---

## Task F.7 — Reporter con template + tests

**Files**:
- Create: `agents/hermes/templates/reporte_voto.md`
- Create: `agents/app/reporter.py`
- Create: `agents/tests/test_reporter.py`

- [ ] **Step 1**: Template

```bash
cat > agents/hermes/templates/reporte_voto.md <<'EOF'
# Reporte sobre la propuesta {title}

**Fecha**: {timestamp}
**Proposal ID**: {proposal_id}
**Red**: {network} (Chain ID {chain_id})
**Total de votos**: {total_votes}
**Resultados**: Sí={yes} · No={no} · Abstención={abstain}

## Análisis (Hermes)

{llm_analysis}

## Trazabilidad

- TX hash: {tx_hash}
- Bloque: {block_number}
- Explorer: {explorer_url}
- Confianza del análisis: {confidence}/10
- Fuentes: blockchain events + template propio (Hermes v0.1)

---

*La IA asesora. El ciudadano supervisa. El blockchain firma. Hermes orquesta — y todo queda trazable.*
EOF
```

- [ ] **Step 2**: Test reporter

```bash
cat > agents/tests/test_reporter.py <<'EOF'
import pytest
from app.reporter import Reporter, ReportInput
from app.llm import LLMClient, LLMResult
from unittest.mock import AsyncMock


@pytest.mark.asyncio
async def test_render_with_llm_analysis(tmp_path):
    tpl_path = tmp_path / "tpl.md"
    tpl_path.write_text(
        "# {title}\n\nResultados Sí={yes} No={no} Abstención={abstain}\n\n{llm_analysis}\n\n--{confidence}--",
        encoding="utf-8",
    )

    llm = LLMClient()
    llm.complete = AsyncMock(return_value=LLMResult(text="Resumen", provider="anthropic", confidence=9))

    reporter = Reporter(template_path=str(tpl_path), llm=llm)

    out = await reporter.render(ReportInput(
        proposal_id=1,
        chain_id=31337,
        title="Demo",
        yes=3, no=1, abstain=1,
        tx_hash="0xabc",
        block_number=100,
        explorer_url="http://anvil",
    ))

    assert "# Demo" in out.body_markdown
    assert "Sí=3" in out.body_markdown
    assert "Resumen" in out.body_markdown
    assert out.provider == "anthropic"
    assert out.confidence == 9


@pytest.mark.asyncio
async def test_render_handles_unavailable_llm(tmp_path):
    tpl_path = tmp_path / "tpl.md"
    tpl_path.write_text("{llm_analysis}", encoding="utf-8")

    llm = LLMClient()
    llm.complete = AsyncMock(
        return_value=LLMResult(text="<unavailable>", provider="unavailable", confidence=0)
    )

    reporter = Reporter(template_path=str(tpl_path), llm=llm)
    out = await reporter.render(ReportInput(
        proposal_id=1, chain_id=31337, title="T",
        yes=0, no=0, abstain=0, tx_hash=None, block_number=None, explorer_url=None,
    ))
    assert "<unavailable>" in out.body_markdown
    assert out.confidence == 0
EOF
```

- [ ] **Step 3**: Impl

```bash
cat > agents/app/reporter.py <<'EOF'
"""Reporter: rellena un template Markdown con datos on-chain + análisis LLM."""

from dataclasses import dataclass
from datetime import datetime, timezone
from app.llm import LLMClient, LLMResult


@dataclass
class ReportInput:
    proposal_id: int
    chain_id: int
    title: str
    yes: int
    no: int
    abstain: int
    tx_hash: str | None
    block_number: int | None
    explorer_url: str | None


@dataclass
class ReportOutput:
    body_markdown: str
    provider: str
    confidence: int


CHAIN_NAMES = {31337: "Anvil local", 57057: "zkTanenbaum"}


class Reporter:
    def __init__(self, template_path: str, llm: LLMClient):
        self.template_path = template_path
        self.llm = llm

    async def render(self, input: ReportInput) -> ReportOutput:
        total = input.yes + input.no + input.abstain
        prompt = self._build_prompt(input, total)
        llm_result = await self.llm.complete(prompt)
        with open(self.template_path, "r", encoding="utf-8") as f:
            tpl = f.read()

        body = tpl.format(
            title=input.title,
            timestamp=datetime.now(tz=timezone.utc).isoformat(),
            proposal_id=input.proposal_id,
            chain_id=input.chain_id,
            network=CHAIN_NAMES.get(input.chain_id, "unknown"),
            total_votes=total,
            yes=input.yes,
            no=input.no,
            abstain=input.abstain,
            llm_analysis=llm_result.text,
            tx_hash=input.tx_hash or "n/a",
            block_number=input.block_number or "n/a",
            explorer_url=input.explorer_url or "n/a (red local)",
            confidence=llm_result.confidence,
        )
        return ReportOutput(
            body_markdown=body,
            provider=llm_result.provider,
            confidence=llm_result.confidence,
        )

    def _build_prompt(self, input: ReportInput, total: int) -> str:
        return (
            f"Eres Hermes, agente maestro del SSC ANTIPEREZA. Analiza brevemente "
            f"(≤200 palabras) los resultados de la siguiente votación ciudadana "
            f"consultiva. NO inventes datos. Indica nivel de confianza si lo tenés.\n\n"
            f"Propuesta: {input.title}\n"
            f"Total votos: {total}\n"
            f"Sí: {input.yes} · No: {input.no} · Abstención: {input.abstain}\n"
            f"Red: chain_id={input.chain_id}\n"
        )
EOF
```

- [ ] **Step 4**: Run + commit

```bash
pytest tests/test_reporter.py -v
cd ..
git add agents/app/reporter.py agents/tests/test_reporter.py agents/hermes/templates/reporte_voto.md
git commit -m "agents(F.7): Reporter render template + 2 tests (con LLM + sin LLM)"
```

---

## Task F.8 — Memory (pgvector embeddings) con tests

**Files**:
- Create: `agents/app/memory.py`
- Create: `agents/tests/test_memory.py`

- [ ] **Step 1**: Test (embeddings mockeados — no descargar el modelo en CI)

```bash
cat > agents/tests/test_memory.py <<'EOF'
import pytest
from unittest.mock import patch, MagicMock
from app.memory import HermesMemoryStore


class _MockEmbedder:
    def encode(self, text):
        # Devolvemos un vector determinista de 384 elementos
        return [0.1] * 384


def test_compute_embedding_returns_384_dims():
    store = HermesMemoryStore(embedder=_MockEmbedder())
    emb = store.compute_embedding("texto cualquiera")
    assert len(emb) == 384
    assert all(isinstance(x, float) for x in emb)


def test_compute_embedding_deterministic():
    store = HermesMemoryStore(embedder=_MockEmbedder())
    a = store.compute_embedding("hola")
    b = store.compute_embedding("hola")
    assert a == b
EOF
```

- [ ] **Step 2**: Impl

```bash
cat > agents/app/memory.py <<'EOF'
"""
HermesMemoryStore: gestiona embeddings vectoriales en pgvector.

Sprint 1: solo INSERT (cada reporte genera su embedding). Las queries de
similarity vienen en Sprint 2.
"""

from typing import Protocol


class Embedder(Protocol):
    def encode(self, text: str) -> list[float]: ...


class HermesMemoryStore:
    def __init__(self, embedder: Embedder):
        self.embedder = embedder

    def compute_embedding(self, text: str) -> list[float]:
        """Calcula el embedding 384-dim de un texto."""
        vec = self.embedder.encode(text)
        return [float(x) for x in vec]


def make_default_embedder():
    """Factory que carga sentence-transformers/all-MiniLM-L6-v2 (lazy)."""
    from sentence_transformers import SentenceTransformer
    return SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
EOF
```

- [ ] **Step 3**: Run + commit

```bash
pytest tests/test_memory.py -v
cd ..
git add agents/app/memory.py agents/tests/test_memory.py
git commit -m "agents(F.8): HermesMemoryStore + 2 tests con mock embedder (384 dims)"
```

---

## Task F.9 — Hermes soul (SOUL.md, INSTINCT.md, PLAN.md, VISION.md)

**Files**:
- Create/preserve: `agents/hermes/SOUL.md`, `INSTINCT.md`, `PLAN.md`, `VISION.md`

> **Nota**: estos archivos ya existían del Sprint 1 scaffold de Orlando (PR #1). Verificar que existen y actualizar si hace falta para reflejar Sprint 1 actual.

- [ ] **Step 1**: Verificar y revisar el contenido actual

```bash
ls -la agents/hermes/
cat agents/hermes/SOUL.md | head -30
```

- [ ] **Step 2**: Si están vacíos o desactualizados, reescribir SOUL.md siguiendo el patrón del PPT slide 11

```bash
cat > agents/hermes/SOUL.md <<'EOF'
# Hermes · Alma del SSCA

name: hermes-ssca
role: Coordinador maestro de supervisión ciudadana
mission: Reducir la pereza institucional con deliberación trazable.

constraints:
  - No opino, no voto, no decido.
  - Solo asesoro y delego.
  - Cita siempre fuente y nivel de confianza.

tone: claro · sobrio · español rioplatense (es-AR) con respeto cuando aplique.

values:
  - Trazabilidad sobre velocidad.
  - Evidencia sobre opinión.
  - Verificable sobre verosímil.
EOF
```

- [ ] **Step 3**: Idem INSTINCT.md

```bash
cat > agents/hermes/INSTINCT.md <<'EOF'
# Reflejos por defecto (INSTINCT)

on:proposal_closed:
  - leer tally on-chain (yes/no/abstain)
  - generar reporte template + análisis LLM ≤200 palabras
  - persistir en hermes_reports + embedding en hermes_memory
  - emit log con tx_hash + block_number + confidence

on:llm_unavailable:
  - persist reporte con provider="unavailable" + confidence=0
  - NO romper el pipeline · el demo sigue

on:contradiccion_detectada:
  - marcar incertidumbre · NO decidir
  - pedir verificación al fact-checker (Sprint 2+)

on:datos_faltantes:
  - NUNCA inventar — decir "no sé" / "n/a"
  - persistir el reporte con el campo vacío explícito
EOF
```

- [ ] **Step 4**: Commit

```bash
git add agents/hermes/SOUL.md agents/hermes/INSTINCT.md
git commit -m "agents(F.9): SOUL.md + INSTINCT.md alineados al PPT slide 11 (reglas Hermes)"
```

---

## Task F.10 — Event listener web3.py + tests

**Files**:
- Create: `agents/app/listener.py`
- Create: `agents/tests/test_listener.py`

- [ ] **Step 1**: Test (mockear web3)

```bash
cat > agents/tests/test_listener.py <<'EOF'
import pytest
from unittest.mock import MagicMock, AsyncMock
from app.listener import EventListener


def test_extract_vote_cast_event_args():
    listener = EventListener(
        w3=MagicMock(),
        vote_address="0x" + "0" * 40,
        registry_address="0x" + "0" * 40,
        vote_abi=[],
    )

    log = {
        "args": {"voter": "0x" + "1" * 40, "proposalId": 1, "choice": 0},
        "blockNumber": 100,
        "transactionHash": b"\x12\x34",
    }
    parsed = listener.parse_vote_cast_log(log)
    assert parsed.voter == "0x" + "1" * 40
    assert parsed.proposal_id == 1
    assert parsed.choice == 0
    assert parsed.block_number == 100


def test_extract_proposal_closed_event_args():
    listener = EventListener(
        w3=MagicMock(),
        vote_address="0x" + "0" * 40,
        registry_address="0x" + "0" * 40,
        vote_abi=[],
    )

    log = {
        "args": {"proposalId": 1, "yes": 3, "no": 1, "abstain": 1},
        "blockNumber": 200,
        "transactionHash": b"\xab\xcd",
    }
    parsed = listener.parse_proposal_closed_log(log)
    assert parsed.proposal_id == 1
    assert parsed.yes == 3
    assert parsed.no == 1
    assert parsed.abstain == 1
EOF
```

- [ ] **Step 2**: Impl

```bash
cat > agents/app/listener.py <<'EOF'
"""
EventListener: web3.py polling de eventos VoteCast y ProposalClosed.

Sprint 1: polling con eth_getLogs cada 10s (no WebSocket). Suficiente para
demo. Sprint 2 puede migrar a wss para latencia menor.
"""

from dataclasses import dataclass
from typing import Any


@dataclass
class VoteCastEvent:
    voter: str
    proposal_id: int
    choice: int
    block_number: int
    tx_hash: str


@dataclass
class ProposalClosedEvent:
    proposal_id: int
    yes: int
    no: int
    abstain: int
    block_number: int
    tx_hash: str


class EventListener:
    def __init__(
        self,
        w3: Any,
        vote_address: str,
        registry_address: str,
        vote_abi: list,
    ):
        self.w3 = w3
        self.vote_address = vote_address
        self.registry_address = registry_address
        self.vote_abi = vote_abi

    def parse_vote_cast_log(self, log: dict) -> VoteCastEvent:
        return VoteCastEvent(
            voter=log["args"]["voter"],
            proposal_id=log["args"]["proposalId"],
            choice=log["args"]["choice"],
            block_number=log["blockNumber"],
            tx_hash="0x" + log["transactionHash"].hex(),
        )

    def parse_proposal_closed_log(self, log: dict) -> ProposalClosedEvent:
        return ProposalClosedEvent(
            proposal_id=log["args"]["proposalId"],
            yes=log["args"]["yes"],
            no=log["args"]["no"],
            abstain=log["args"]["abstain"],
            block_number=log["blockNumber"],
            tx_hash="0x" + log["transactionHash"].hex(),
        )
EOF
```

> **Nota Sprint 1**: dejo el listener "estructural" — parsea logs pero NO polling loop async todavía. El polling loop se levanta en `main.py` (Task F.12) usando `asyncio.create_task` y los métodos aquí. Esto permite testear el parsing sin necesitar un W3 real.

- [ ] **Step 3**: Run + commit

```bash
pytest tests/test_listener.py -v
cd ..
git add agents/app/listener.py agents/tests/test_listener.py
git commit -m "agents(F.10): EventListener parse VoteCast + ProposalClosed · 2 tests"
```

---

## Task F.11 — FastAPI main + endpoints + tests

**Files**:
- Create: `agents/app/main.py`
- Create: `agents/tests/test_main.py`

- [ ] **Step 1**: Test usando httpx.AsyncClient contra la app FastAPI

```bash
cat > agents/tests/test_main.py <<'EOF'
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
    assert "chain_id" in data
EOF
```

- [ ] **Step 2**: Impl

```bash
cat > agents/app/main.py <<'EOF'
"""FastAPI app para Hermes runtime."""

from fastapi import FastAPI
from app.settings import get_settings

app = FastAPI(title="CivicSys Agents (Hermes)", version="0.1.0")


@app.get("/agents/health")
async def health():
    s = get_settings()
    return {
        "status": "ok",
        "chain_id": s.chain_id,
        "agent": "hermes",
        "version": "0.1.0",
    }
EOF
```

- [ ] **Step 3**: Run + commit

```bash
pytest tests/test_main.py -v
cd ..
git add agents/app/main.py agents/tests/test_main.py
git commit -m "agents(F.11): FastAPI app + /agents/health · 1 test verde"
```

---

## Task F.12 — Coverage gate y verificación final

**Files**: ninguno (configuración ya en pyproject.toml de F.1).

- [ ] **Step 1**: Correr suite completa con coverage

```bash
cd agents && source .venv/Scripts/activate
pytest
```

Expected output:
```
================ X passed in Y.YY s ================
---------- coverage: platform ..., python 3.11.x ----------
Name                  Stmts   Miss  Cover   Missing
...
TOTAL                   XX     X     XX%
Required test coverage of 80% reached. Total coverage: XX%
```

Si está por debajo de 80%, ver "Missing" y agregar tests para esas líneas.

- [ ] **Step 2**: Commit (sin cambios de archivo, pero confirma estado)

(No commit; solo verifica.)

---

## Task F.13 — Smoke test del FastAPI corriendo

**Files**: ninguno.

- [ ] **Step 1**: Crear `.env` de agents

```bash
REG=$(jq -r '.contracts.CitizenRegistry' ../blockchain/deployments/localhost.json)
VOTE=$(jq -r '.contracts.Vote' ../blockchain/deployments/localhost.json)

cat > .env <<EOF
CHAIN_ID=31337
REGISTRY_ADDRESS=$REG
VOTE_ADDRESS=$VOTE
RPC_URL=http://localhost:8545
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/civicsys
ANTHROPIC_API_KEY=sk-ant-PLACEHOLDER
EOF
```

- [ ] **Step 2**: Arrancar uvicorn

```bash
uvicorn app.main:app --reload --port 8000 &
sleep 3
```

- [ ] **Step 3**: Probar health

```bash
curl -sf http://localhost:8000/agents/health | python -m json.tool
```

Expected:
```json
{
    "status": "ok",
    "chain_id": 31337,
    "agent": "hermes",
    "version": "0.1.0"
}
```

- [ ] **Step 4**: Apagar

```bash
pkill -f "uvicorn app.main:app" || true
```

---

## Task F.14 — Borrar tareas docs del producto equivocado (FastAPI A-*)

**Files**: Modify (review) `agents/docs/A-*.md`.

> **Nota**: Las 40 tareas A-001 a A-040 del PR #1 cubren el FastAPI completo (más de lo que Sprint 1 demoable necesita). Sprint 1 implementa subset. Las tareas pueden quedar como referencia para Sprint 2+. **No las borramos en este bloque** — eso es Bloque J.

- [ ] **Step 1**: Sin acción acá. Continuar.

---

## Task F.15 — Documentar agents en `agents/README.md`

**Files**: Modify `agents/README.md`.

- [ ] **Step 1**: Reescribir con info Sprint 1

```bash
cat > agents/README.md <<'EOF'
# agents/ · Hermes runtime + FastAPI

Backend Python del SSC ANTIPEREZA. Runs Hermes master agent + FastAPI bridge.

## Stack

- Python 3.11+, FastAPI, pydantic v2
- web3.py para eventos on-chain (Anvil + zkTanenbaum)
- anthropic + httpx (OpenRouter fallback) para LLM
- SQLAlchemy + asyncpg + pgvector
- sentence-transformers (`all-MiniLM-L6-v2`) para embeddings 384-dim

## Setup

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"

cp ../.env.example .env
# Editar .env: setear ANTHROPIC_API_KEY + REGISTRY_ADDRESS + VOTE_ADDRESS

uvicorn app.main:app --reload --port 8000
```

## Tests

```bash
pytest                  # corre con coverage gate 80% automático
pytest tests/test_llm.py -v
```

## Estructura

```
agents/
├── app/
│   ├── settings.py      pydantic Settings
│   ├── db.py            SQLAlchemy engine + session
│   ├── models.py        ORM models (ProposalCache, HermesReport, ...)
│   ├── helpers.py       compute_citizen_hash
│   ├── llm.py           LLMClient dual provider (anthropic + openrouter)
│   ├── reporter.py      Reporter template + render
│   ├── memory.py        HermesMemoryStore embeddings 384-dim
│   ├── listener.py      EventListener (parse VoteCast + ProposalClosed)
│   └── main.py          FastAPI app
├── hermes/
│   ├── SOUL.md          identidad + constraints
│   ├── INSTINCT.md      reflejos por defecto
│   ├── PLAN.md          sprint actual (in-flight)
│   └── templates/
│       └── reporte_voto.md
└── tests/
    └── test_*.py        coverage gate 80%
```

## Producto Sprint 1

Hermes:
1. Escucha eventos `VoteCast` y `ProposalClosed` en el contrato `Vote.sol`.
2. Cuando una propuesta cierra, lee el tally y arma un reporte usando el template.
3. LLM (Anthropic primario, OpenRouter fallback) escribe el análisis ≤200 palabras.
4. Persiste el reporte en `hermes_reports` + embedding en `hermes_memory`.
5. Si LLM no responde, persist con `provider="unavailable"`. El demo no se cae.

Endpoints:
- `GET /agents/health` — status del runtime.

(Sprint 2 agrega los 7 subagentes especializados, el bot Telegram, y el dashboard de transparencia.)
EOF
```

- [ ] **Step 2**: Commit

```bash
cd ..
git add agents/README.md
git commit -m "agents(F.15): README de Sprint 1 (FastAPI + Hermes + endpoints + tests)"
```

---

## Task F.16 — Cierre del Bloque F

**Files**: ninguno.

- [ ] **Step 1**: Re-run coverage

```bash
cd agents && pytest
```

Expected: ≥15 tests verde · `Required test coverage of 80% reached`.

- [ ] **Step 2**: Confirm commits

```bash
cd .. && git log --oneline agents/ | head -20
```

Expected: ~14 commits del bloque.

---

## Criterios de done del Bloque F

- [ ] FastAPI corriendo con `/agents/health` OK.
- [ ] LLMClient dual provider · 3 tests verde.
- [ ] Reporter template + render · 2 tests verde.
- [ ] EventListener parse logs · 2 tests verde.
- [ ] Memory store embeddings · 2 tests verde.
- [ ] Settings con validación · 2 tests verde.
- [ ] Helpers compute_citizen_hash · 3 tests verde.
- [ ] Coverage ≥80% statements con `pytest`.
- [ ] `hermes/SOUL.md` y `INSTINCT.md` alineados al PPT.
- [ ] 14 commits del bloque (`agents(F.X)`).

**Gate humano antes de Bloque G**: Orlando verifica `pytest` verde en agents/. Aprueba pasar a frontend.
