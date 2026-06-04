---
id: A-001
title: "Setup pyproject.toml + requirements.txt + venv"
owner: "Sandro"
backup: "junior"
effort: "1 h"
priority: P0
status: pending
depends_on: []
sprint: 1
layer: agents
---

# A-001 · Setup del paquete Python

## Por qué importa
Toda la capa `agents/` depende de Python 3.11+, FastAPI, web3.py, Anthropic SDK y MCP SDK. Sin un setup canónico:
- Cada dev instala distintas versiones, y los tests pasan en una máquina y fallan en otra.
- `agents/.env.example` no se conecta a nada si no hay un `config.py` que la lea.
- El CI no puede correr (no sabe qué instalar).

Esta tarea deja todo el equipo en el mismo punto de arranque.

## Conceptos clave
- **`pyproject.toml`**: estándar moderno (PEP 621) para metadata + deps + scripts. Reemplaza `setup.py`.
- **`requirements.txt`**: lista plana de deps. Compatible con `pip install -r`. Útil para CI/Docker. En proyectos modernos coexiste con `pyproject.toml`.
- **venv**: entorno aislado de Python. Cada proyecto el suyo, sin contaminar el sistema.
- **`uv` o `pip-tools`** (opcional): herramientas de resolución. Para este sprint vamos con `pip` clásico para no introducir variables.
- **`ruff`**: linter + formatter ultra-rápido, reemplazo de flake8 + black.
- **`mypy`**: type checker estático.

## Pre-requisitos
- [ ] Python 3.11+ instalado (`python --version`).
- [ ] `pip` actualizado: `python -m pip install --upgrade pip`.
- [ ] Estás en `agents/`.

## Paso a paso

### 1. Crear el venv
```bash
cd C:/dev/hackathons/blockchain-syscoin-04-2026/CivicSys/agents
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
# Bash (Linux/Mac/git-bash)
source .venv/bin/activate
```

> **Si Activate.ps1 da error de policy** en PowerShell:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```

### 2. Crear `pyproject.toml`
```toml
[project]
name = "civicsys-agents"
version = "0.1.0-sprint1"
description = "Hermes master agent + FastAPI + MCP server para CivicSys SSC ANTIPEREZA"
readme = "README.md"
requires-python = ">=3.11"
license = { text = "MIT" }
authors = [
  { name = "CivicSys team — UCV 2026" }
]
dependencies = [
  "fastapi>=0.110",
  "uvicorn[standard]>=0.27",
  "pydantic>=2.6",
  "pydantic-settings>=2.2",
  "web3>=6.15",
  "eth-utils>=4.0",
  "httpx>=0.27",
  "python-dotenv>=1.0",
  "anthropic>=0.30",
  "mcp>=0.9",
  "structlog>=24.1",
]

[project.optional-dependencies]
dev = [
  "pytest>=8.0",
  "pytest-asyncio>=0.23",
  "pytest-cov>=4.1",
  "respx>=0.20",
  "ruff>=0.4",
  "mypy>=1.9",
  "types-requests",
]

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "W", "I", "UP", "B", "SIM", "RUF"]
ignore = []

[tool.mypy]
python_version = "3.11"
strict = true
warn_return_any = true
warn_unused_configs = true
exclude = ["tests/fixtures/"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
addopts = "-v --strict-markers"
markers = [
  "integration: requiere blockchain o LLM (slow)",
  "e2e: end-to-end fullstack",
]
```

> **Nota**: `mcp>=0.9` puede no estar publicado aún. Si el `pip install` falla, comentar esa línea y volverla a agregar cuando el SDK se publique.

### 3. Crear `requirements.txt` (sincronizado con pyproject)
Para que CI y entornos sin `pip install -e .` funcionen, mantener `requirements.txt`:

```txt
fastapi>=0.110
uvicorn[standard]>=0.27
pydantic>=2.6
pydantic-settings>=2.2
web3>=6.15
eth-utils>=4.0
httpx>=0.27
python-dotenv>=1.0
anthropic>=0.30
mcp>=0.9
structlog>=24.1
```

Y `requirements-dev.txt`:
```txt
-r requirements.txt
pytest>=8.0
pytest-asyncio>=0.23
pytest-cov>=4.1
respx>=0.20
ruff>=0.4
mypy>=1.9
```

### 4. Instalar
```bash
pip install -r requirements-dev.txt
# o, si ya tenés pyproject:
pip install -e ".[dev]"
```

### 5. Crear estructura mínima
```bash
mkdir api api/routes api/services api/middleware api/models
mkdir hermes/skills mcp_server mcp_server/tools tests tests/fixtures
touch api/__init__.py api/routes/__init__.py api/services/__init__.py api/middleware/__init__.py api/models/__init__.py
touch hermes/__init__.py hermes/skills/__init__.py mcp_server/__init__.py mcp_server/tools/__init__.py
touch tests/__init__.py
```

### 6. Validar instalación
```bash
python -c "import fastapi, pydantic, web3, anthropic, httpx, structlog; print('all OK')"
ruff --version
mypy --version
pytest --version
```

Esperado:
```
all OK
ruff 0.4.x
mypy 1.9.x
pytest 8.x.x
```

### 7. `.gitignore` específico
Si no está, agregar:
```gitignore
.venv/
__pycache__/
*.pyc
.mypy_cache/
.ruff_cache/
.pytest_cache/
htmlcov/
.coverage
.coverage.*
*.egg-info/
dist/
build/
```

### 8. Quick test: que ruff y mypy corran sin archivos
```bash
ruff check .
mypy api hermes mcp_server
```

Ambos deben terminar con exit 0 (no hay nada que chequear todavía).

### 9. Commit
```bash
git add agents/pyproject.toml agents/requirements.txt agents/requirements-dev.txt agents/.gitignore agents/api/ agents/hermes/__init__.py agents/mcp_server/ agents/tests/
git commit -m "feat(agents): setup pyproject + venv + estructura base (A-001)"
```

## Verificación / Definition of Done

```bash
cd agents
python -c "from importlib.metadata import version; print(version('fastapi'), version('web3'), version('anthropic'))"
ruff check .
mypy api hermes mcp_server
pytest -q
```

- ✅ Todas las versiones imprimen sin error.
- ✅ Lint y type check terminan en 0.
- ✅ `pytest` corre 0 tests sin error.

## Errores comunes

- **`No module named pydantic_settings`**
  Falta instalar el paquete: `pip install pydantic-settings`. Pydantic v2 separó la sub-librería.

- **`web3` no instala en Windows**
  Compilador C nativo faltante. Solución: instalar Microsoft Visual C++ Build Tools, o usar Python 3.11 oficial (no Anaconda) y `pip install web3 --prefer-binary`.

- **`mcp` no existe**
  Probable: el SDK aún no se publicó. Comentá temporalmente y agregalo cuando se publique. Alternativa: clone del repo oficial y `pip install -e .`.

- **`pytest-asyncio` mode conflict**
  Si tira "auto mode" warning, asegurate que tenés `asyncio_mode = "auto"` en `[tool.pytest.ini_options]`.

## Lecturas
- [PEP 621 — Project metadata](https://peps.python.org/pep-0621/)
- [Pydantic v2 — Quickstart](https://docs.pydantic.dev/latest/)
- [FastAPI tutorial](https://fastapi.tiangolo.com/tutorial/)
- [`agents/README.md`](../README.md)

## Notas para revisor
- ¿`mcp` está en deps? Si el SDK no está disponible, abrir un issue: necesitamos un fallback (HTTP wrapper).
- Confirmar que `requirements.txt` y `pyproject.toml` están sincronizados — no queremos drift.
- El `.venv` NO va al repo (confirmar `.gitignore`).
