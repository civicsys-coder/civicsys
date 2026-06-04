# CivicSys — SSC ANTIPEREZA

[![CI](https://github.com/SandroChavez/CivicSys/actions/workflows/ci.yml/badge.svg)](https://github.com/SandroChavez/CivicSys/actions/workflows/ci.yml)

> **Sistema de Supervisión Ciudadana Antipereza**
> Hackathon Syscoin / zkSYS Tanenbaum 2026 · Proof-of-Builders UCV

Cámara cívica deliberativa sobre **Syscoin** (L1 EVM-compatible) vía la edgechain **zkSYS Testnet (zkTanenbaum, Chain ID 57057)**, coordinada por un agente maestro **Hermes** con identidad y memoria propias.

## Principio

> La IA asesora. El ciudadano supervisa. El blockchain firma. Hermes orquesta — y todo queda trazable.

## Las tres capas

1. **Cámara Cívica Digital** — voto consultivo y evaluación legislativa firmados en zkSYS.
2. **Antipereza** — agente maestro Hermes (SOUL + INSTINCT + memoria) que delega subagentes especializados.
3. **Transparencia** — cada inferencia con fuente, fecha, evidencia y nivel de confianza.

## Arquitectura del monorepo

```
CivicSys/
├── blockchain/          # Smart contracts en Solidity (Hardhat)
│   ├── contracts/       # Vote.sol, CitizenRegistry.sol, BallotFactory.sol
│   ├── scripts/         # Deploy scripts a zkTanenbaum
│   ├── test/            # Unit + integration tests
│   └── deployments/     # Direcciones desplegadas por red
│
├── agents/              # Hermes Master Agent + subagentes + API + MCP
│   ├── hermes/          # Agente maestro
│   │   ├── soul/        # SOUL.md, INSTINCT.md (públicos)
│   │   ├── memory/      # MEMORY.md, USER.md, sesiones FTS5
│   │   └── skills/      # Skills generadas autónomamente
│   ├── subagents/       # Subagentes (jurídico, anticorrupción, verificador…)
│   ├── mcp_server/      # Servidor MCP — herramientas para LLM clients
│   └── api/             # FastAPI bridge (frontend ↔ agentes ↔ blockchain)
│
├── shared/              # Tipos, ABIs y schemas compartidos
│   ├── abis/            # ABIs generados de los contratos
│   ├── schemas/         # JSON schemas (Pydantic + Zod)
│   └── types/           # TypeScript types compartidos
│
└── docs/                # Documentación general
    ├── adr/             # Architecture Decision Records
    ├── architecture/    # Diagramas y specs
    ├── sprints/         # Plan por sprint (sprint1.md, sprint2.md…)
    └── security/        # Threat model, hardening VPS, runbooks
```

## Sprint 1 — Prototipo inicial (Día 4–7)

**Objetivo:** Demostrar el flujo end-to-end mínimo:

```
DNI + nombre → registro on-chain (hash) → voto en zkTanenbaum → Hermes lee eventos → reporte
```

### Entregables Sprint 1

| # | Entregable | Owner sugerido |
|---|------------|----------------|
| 1 | Auth ciudadana por DNI (8 dígitos) + nombre completo, con hash on-chain | Orlando |
| 2 | `CitizenRegistry.sol` + `Vote.sol` desplegados en zkTanenbaum (57057) | Orlando |
| 3 | Agente Hermes básico: lee eventos on-chain, genera reportes en lenguaje natural | Sandro |
| 4 | API REST (FastAPI): bridge frontend ↔ agentes ↔ blockchain | Sandro |
| 5 | Servidor MCP que expone `get_proposal`, `cast_vote`, `generate_report` | Sandro |
| 6 | Docs Hermes (SOUL.md, INSTINCT.md, PLAN.md, VISION.md) | Orlando |
| 7 | Tests unitarios contratos + tests API | Gabriel |

Ver [docs/sprints/sprint1.md](docs/sprints/sprint1.md) para el plan ejecutivo detallado.

## Red blockchain

| Campo      | Valor                                  |
|------------|----------------------------------------|
| Red        | zkSYS Testnet (zkTanenbaum)            |
| Tipo       | zkStack · zkRollup-Validium · EVM      |
| Chain ID   | 57057                                  |
| Símbolo    | TSYS                                   |
| RPC        | https://rpc-zk.tanenbaum.io            |
| Explorer   | https://explorer-zk.tanenbaum.io       |
| L1 base    | Syscoin (EVM merge-mined con Bitcoin)  |

## Stack técnico

- **Smart contracts**: Solidity 0.8.24 + Hardhat + ethers v6 + TypeChain
- **Agentes**: Python 3.11 + LangGraph/LangChain + Anthropic SDK (Claude) — compatibilidad OpenRouter/Nous Portal
- **API**: FastAPI + Uvicorn + Pydantic v2 + httpx
- **MCP**: Python MCP SDK (`mcp`) — stdio + SSE transports
- **DB**: Supabase (Postgres + pgvector) — Sprint 2+
- **Despliegue**: Docker rootless + WireGuard + VPS Hetzner — Sprint 2+

## Quick start (Sprint 1)

```bash
# 1. Smart contracts
cd blockchain
npm install
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.ts --network zkTanenbaum

# 2. Agentes + API + MCP
cd ../agents
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000

# 3. MCP server (separado)
python -m mcp_server.server
```

## Equipo · UCV 2026

- **Orlando Vázquez** — Developer Blockchain (smart contracts zkSYS · integración Web3)
- **Sandro Chávez** — Developer Fullstack (Next.js · API · integraciones LLM con Hermes)
- **Eduardo Cuba** — Coordinador & Presentador
- **Mario Alberto** — Networking & Estrategia
- **Grecia Puma** — Social Media Manager
- **Gabriel Sosa** — Testing & QA
- **Tatiana Portillo** — Documentación & Cyber-seguridad

## Licencia

MIT — bien público digital sobre Syscoin.

---

> *La democracia no se delega. Se audita.*
