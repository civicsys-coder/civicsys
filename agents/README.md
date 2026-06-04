# agents/ — Hermes Master + API + MCP

Componente de agentes IA, API REST y servidor MCP del proyecto CivicSys / SSC ANTIPEREZA.

## Componentes

```
agents/
├── hermes/              # Agente maestro
│   ├── soul/
│   │   ├── SOUL.md      # Identidad y mission (PÚBLICO)
│   │   └── INSTINCT.md  # Reflejos por defecto (PÚBLICO)
│   ├── memory/          # Memoria persistente (sessions/ gitignored)
│   ├── skills/          # Skills generadas autónomamente (Sprint 2+)
│   ├── PLAN.md          # Sprint actual (INTERNO)
│   ├── VISION.md        # North star (INTERNO)
│   ├── runtime.py       # Loop principal del agente
│   ├── llm_client.py    # Wrapper para Claude / OpenRouter / Nous
│   ├── event_listener.py# Listener de eventos on-chain
│   └── reporter.py      # Generador de reportes
│
├── subagents/           # Subagentes (Sprint 2+: jurídico, anticorrupción…)
│
├── mcp_server/          # Servidor MCP (Model Context Protocol)
│   ├── server.py        # entrypoint
│   ├── tools/           # cada tool en su archivo
│   │   ├── register_citizen.py
│   │   ├── list_proposals.py
│   │   ├── cast_vote.py
│   │   └── generate_report.py
│   └── transports.py    # stdio + SSE
│
├── api/                 # FastAPI
│   ├── main.py
│   ├── routes/
│   │   ├── auth.py
│   │   ├── proposals.py
│   │   ├── votes.py
│   │   └── reports.py
│   ├── services/
│   │   ├── blockchain_client.py
│   │   ├── hermes_bridge.py
│   │   └── citizen_hash.py
│   └── models/          # Pydantic v2 schemas
│
├── requirements.txt
├── pyproject.toml
└── .env.example
```

## Stack

- **Python** 3.11+
- **FastAPI** + **Uvicorn**
- **Pydantic v2** + **httpx**
- **web3.py** (cliente blockchain Python)
- **mcp** (Python MCP SDK)
- **anthropic** (Claude SDK) — compatible con OpenRouter mediante base_url
- **pytest** + **pytest-asyncio**
- **ruff** (lint) + **mypy** (types)

## API REST — Sprint 1

| Método | Ruta                          | Descripción                                  |
|--------|-------------------------------|----------------------------------------------|
| POST   | `/auth/register`              | Registra ciudadano (DNI+nombre) on-chain     |
| GET    | `/auth/status/{citizen_id}`   | Verifica si un hash está registrado          |
| GET    | `/proposals`                  | Lista propuestas activas                     |
| POST   | `/proposals`                  | Crea una nueva propuesta (admin/curador)     |
| POST   | `/proposals/{id}/vote`        | Emite voto                                   |
| GET    | `/proposals/{id}/results`     | Resultado actual on-chain                    |
| GET    | `/reports/{proposal_id}`      | Reporte Hermes (genera si no existe)         |
| GET    | `/hermes/status`              | Estado del agente (memoria, last_event…)     |
| GET    | `/health`                     | Healthcheck (RPC + LLM + DB)                 |

Documentación interactiva: `http://localhost:8000/docs` (Swagger autogenerado).

## MCP server — Sprint 1

Expone las siguientes **tools** vía Model Context Protocol:

| Tool                  | Args                                          | Returns                          |
|-----------------------|-----------------------------------------------|----------------------------------|
| `register_citizen`    | `dni: str`, `full_name: str`                  | `{citizen_id, tx_hash}`          |
| `list_proposals`      | (none)                                        | `Proposal[]`                     |
| `get_proposal`        | `proposal_id: int`                            | `Proposal`                       |
| `cast_vote`           | `proposal_id: int`, `option: int`, `citizen_id: str` | `{tx_hash}`               |
| `generate_report`     | `proposal_id: int`                            | `Report (markdown + metadata)`   |
| `get_hermes_status`   | (none)                                        | `{soul_loaded, last_event, ...}` |

**Transports soportados:**
- `stdio` — para integración con Claude Code y otros clientes MCP locales.
- `SSE` — para acceso desde frontend Next.js o herramientas web.

## Hermes runtime

Loop básico (Sprint 1):

```python
# hermes/runtime.py (pseudo)
async def run():
    soul = load_md("hermes/soul/SOUL.md")
    instinct = load_md("hermes/soul/INSTINCT.md")

    async for event in event_listener.subscribe(["ProposalClosed"]):
        proposal = await blockchain.get_proposal(event.proposal_id)
        tally = await blockchain.tally(event.proposal_id)

        report = await reporter.generate(
            soul=soul,
            instinct=instinct,
            proposal=proposal,
            tally=tally,
        )

        memory.persist(report)
        await api_bridge.publish(report)
```

## Citizen hashing (Sprint 1)

```python
# services/citizen_hash.py
import hashlib

def normalize_name(name: str) -> str:
    """Upper, sin tildes, sin espacios dobles."""
    import unicodedata
    nfkd = unicodedata.normalize("NFKD", name)
    no_acc = "".join(c for c in nfkd if not unicodedata.combining(c))
    return " ".join(no_acc.upper().split())

def citizen_id(dni: str, full_name: str, public_salt: str) -> bytes:
    """keccak256(dni || normalized_name || public_salt). DNI nunca se persiste."""
    from eth_utils import keccak
    payload = f"{dni}|{normalize_name(full_name)}|{public_salt}".encode()
    return keccak(payload)
```

## Quick start

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env

# Levantar API
uvicorn api.main:app --reload --port 8000

# Levantar MCP server (otra terminal)
python -m mcp_server.server

# Tests
pytest -v
```

## Variables de entorno (`.env`)

Generar los secretos con `openssl rand -hex 32`. **Ningún valor real se commitea** — sólo placeholders en `.env.example`.

```dotenv
# Blockchain
RPC_URL=https://rpc-zk.tanenbaum.io
RPC_FALLBACK=                                  # opcional - failover (ADR-003)
CHAIN_ID=57057
CITIZEN_REGISTRY_ADDRESS=0x...
VOTE_CONTRACT_ADDRESS=0x...
PUBLIC_SALT=<openssl rand -hex 32>             # NO commitear (ADR-001)

# LLM (Hermes)
ANTHROPIC_API_KEY=sk-ant-...
OPENROUTER_API_KEY=                            # opcional fallback
LLM_MODEL=claude-sonnet-4-6

# Integridad de reportes (HMAC) - ADR-002
MEMORY_INTEGRITY_KEY=<openssl rand -hex 32>

# API
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=http://localhost:3000

# MCP (cuando se implemente - ver docs/security/mcp-policy.md)
MCP_AUTH_TOKEN=<openssl rand -hex 32>          # NO arranca el server sin esto
MCP_TRANSPORT=stdio
MCP_PORT=8765
```

**Variables eliminadas en Sprint 02** (intencionalmente):
- `SIGNER_PRIVATE_KEY` — Hermes no firma transacciones; el frontend ciudadano firma con MetaMask. Ver "Modelo de seguridad" abajo.
- `LLM_BASE_URL` — el `LLMClient` usa endpoints hardcoded para evitar vector AI-PI-04 (proxy man-in-the-middle).

## Modelo de seguridad

Sprint 1/2 **NO tiene signer custodial**. Hermes:

- **Lee** eventos on-chain via `EventListener` (sin firmar).
- **Llama** LLM con `ANTHROPIC_API_KEY` (httpx → endpoints hardcoded).
- **Sirve** API HTTP (sin escrituras on-chain).

El ciudadano firma todas las transacciones desde su wallet (MetaMask) en el frontend. El backend Node BFF es solo-lectura.

Cuando Sprint 3+ introduzca un publisher on-chain (ej. `AuditLog.sol::logReport`), será con multisig 2-de-3, no una EOA única. Ver:

- [`docs/security/threat-model.md`](../docs/security/threat-model.md) — vector S7 dormido.
- [`docs/plans/executed/arquitectura/ADR-002-audit-log-l1.md`](../docs/plans/executed/arquitectura/ADR-002-audit-log-l1.md).

### Prompt injection defense

Cualquier dato que llegue al prompt LLM (título de propuesta, descripción on-chain) **debe** pasar por `app.security.sanitize_untrusted()`. Ver:

- [`docs/plans/executed/arquitectura/ADR-005-prompt-injection-defense.md`](../docs/plans/executed/arquitectura/ADR-005-prompt-injection-defense.md).
- Tests: `agents/tests/test_security.py` con ≥10 payloads conocidos.

### MCP Server

El directorio `agents/mcp_server/` está reservado pero sin implementación. Cualquier futuro código **debe** cumplir [`docs/security/mcp-policy.md`](../docs/security/mcp-policy.md): Bearer auth obligatoria, allow-list de tools, prohibición absoluta de tools que toquen filesystem de memoria o env con credenciales.

### gitleaks pre-commit (opcional)

Para activar gitleaks localmente:

```bash
pip install pre-commit
pre-commit install
```

Config en `.pre-commit-config.yaml` raíz.

## Integración con Claude Code

Tras levantar el MCP server, registrarlo en Claude Code (`~/.claude.json` o vía CLI):

```bash
claude mcp add civicsys --transport stdio --command "python -m mcp_server.server" --cwd /ruta/a/CivicSys/agents
```

Luego, Claude Code puede invocar las tools directamente, por ejemplo:

> "Lista las propuestas activas y genera un reporte para la propuesta 1."
