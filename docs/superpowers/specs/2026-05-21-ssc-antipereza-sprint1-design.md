# SSC ANTIPEREZA — Sprint 1 design spec

**Fecha**: 2026-05-21
**Estado**: Diseño aprobado · pendiente de plan AEGIS (writing-plans skill)
**Deadline**: día 7 del roadmap PPT ≈ 2026-05-25 (4-5 días desde hoy)
**Tag SemVer target**: `sprint1-mvp` (no es release público, es checkpoint interno).
**Source of truth del concepto**: `C:\Users\Orlando\OneDrive\Desktop\Syscoin Hackathon Blockchain\SSC_ANTIPEREZA_Project_Speech_v3.pptx` (18 slides).

---

## 1 · Contexto

CivicSys / SSC ANTIPEREZA es el proyecto del equipo UCV 2026 para Proof-of-Builders Syscoin Hackathon. El pitch (slide 1):

> *La IA asesora. El ciudadano supervisa. El blockchain firma. Hermes orquesta — y todo queda trazable.*

El sistema tiene tres capas (PPT slide 6):

1. **Cámara Cívica Digital** — voto consultivo + ranking candidatos + evaluación legislativa firmados on-chain.
2. **Antipereza** — agente maestro Hermes (Nous Research) con 8 subagentes especializados de fiscalización.
3. **Transparencia** — cada inferencia con fuente, fecha, evidencia, nivel de confianza.

El roadmap del PPT marca 4 fases en 14 días: Discovery (1-3), MVP Sprint 1 (4-7), MVP Sprint 2 (8-11), Pitch & QA (12-14). Esta spec cubre **solo Sprint 1**.

### Estado actual del repo (2026-05-21)

- PR #1 (Orlando, Sprint 1 scaffold): 22 tareas blockchain + 40 tareas agents, **cero implementación** real.
- PR #2 (Sandro, Sprint 2): 36 tareas backend + 58 tareas frontend para alertas/sentry — **producto equivocado** según PPT. Boilerplate Next.js + tRPC con `BlockchainService` mockeada (`"0xHashFalso123"`).
- Total: 172 task `.md`, ~209 líneas de código real (boilerplate de CLIs).
- Sandro inactivo últimas ~24h. Orlando el único dev activo durante este Sprint 1.

### Decisiones tomadas en brainstorming

1. **Arquitectura mixta** (Node BFF + Python Hermes aislado) — respeta lo que pushó Sandro y mantiene Hermes nativo Python.
2. **Supabase desde Sprint 1** — alineado a PPT slide 17.
3. **Demo blockchain dual** — Anvil local (Chain ID 31337) como surrogate para iteración rápida + zkTanenbaum testnet (57057) deployment en paralelo como evidencia.

---

## 2 · Slice mínimo demoable

**Historia única end-to-end**:

> Un ciudadano abre la app → conecta MetaMask (zkTanenbaum o Anvil local) → se registra (DNI hash on-chain) → ve una propuesta legislativa **preseeded** → vota Sí/No/Abstención → Hermes lee el evento on-chain → genera un reporte con fuente + nivel de confianza → reporte visible en dashboard.

**Métrica de éxito Sprint 1**: el flujo completo corre end-to-end sin intervención manual, en ≤2 minutos, ambos en Anvil local y zkTanenbaum testnet. Demo grabable de ≤5 min.

### Incluido (IN scope)

| # | Componente | Detalle |
|---|---|---|
| 1 | `CitizenRegistry.sol` | Mapea `address → keccak256(DNI 8 dígitos + salt público)`. Una dirección, un hash. No revela el DNI on-chain. |
| 2 | `Vote.sol` | Una propuesta hardcoded preseeded en deploy. Tres opciones (Sí/No/Abstención). Solo direcciones registradas pueden votar. Un voto por dirección. |
| 3 | Deploy Anvil local | Hardhat script que despliega ambos contratos en Anvil + seed de 1 propuesta. |
| 4 | Deploy zkTanenbaum testnet | Mismo script con red distinta. Faucet TSYS manual previo. |
| 5 | Backend Node (Express+tRPC) | BFF: lee proposals + tallies on-chain via viem. Endpoints: `/trpc/proposals.list`, `/trpc/proposals.get`, `/trpc/citizens.isRegistered`, `/trpc/reports.list`. |
| 6 | Backend Python (FastAPI) | Hermes runtime: event listener on-chain → cuando se cierra una propuesta o se cruza un threshold de votos, genera 1 reporte usando template. Persiste reporte en Supabase. |
| 7 | Frontend Next.js 14 + Tailwind + shadcn | 4 páginas: home (landing pitch), `/registro` (DNI → hash → tx), `/propuesta/[id]` (votar), `/dashboard` (reportes de Hermes). |
| 8 | Supabase local | Docker container con Postgres + pgvector. Tablas: `sessions`, `proposals_cache`, `hermes_reports`, `hermes_memory` (pgvector embeddings). |
| 9 | Docker Compose | Un solo `docker compose up` levanta: anvil, supabase, backend-node, backend-python, frontend. |
| 10 | Testing guide localhost | Documento `docs/testing-localhost.md` con setup paso a paso para que cualquier dev del equipo pueda correr el demo en su máquina. |

### Excluido (OUT of scope, defer a Sprint 2/3)

| # | Item | Por qué se difiere |
|---|---|---|
| 1 | 7 de 8 subagentes (Jurídico, Económico, Ético, Anticorrupción, Verificador, Social, Ambiental, Transparencia) | PPT slide 14 los pone en Sprint 2 (días 8-11). Solo Hermes maestro genera el reporte simple. |
| 2 | Ranking de candidatos | Sprint 2-3. Sprint 1 solo cubre voto sobre 1 propuesta. |
| 3 | Evaluación legislativa avanzada | Idem. |
| 4 | Bot Telegram bridge | Sprint 2 (PPT slide 14). |
| 5 | Dashboard de transparencia con métricas avanzadas | Sprint 1 tiene versión mínima (lista de reportes). Métricas/charts a Sprint 2. |
| 6 | WireGuard mesh + VPS hardened + Cloudflare tunnel | Defer a Sprint 3 (PPT slide 12). Sprint 1 corre localhost. |
| 7 | Bias Observatory público | Defer a post-MVP (PPT slide 17 risks). |
| 8 | Atestación DNI con autoridad estatal | Sprint 1 usa hash directo. La atestación es feature post-MVP. |
| 9 | Auth Bearer / JWT entre frontend y backend | Sprint 1 corre todo localhost confiado. Hardening a Sprint 3. |
| 10 | Multi-propuesta dinámica (crear propuestas desde UI) | Sprint 1 propuesta hardcoded en deploy. Sprint 2 agrega creación dinámica con governance. |

---

## 3 · Arquitectura

```
┌───────────────────────────────────────────────────────────────┐
│  Frontend  ·  Next.js 14 + Tailwind + shadcn  ·  :3000         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  app/                                                    │  │
│  │  ├─ page.tsx          (home · pitch del PPT)             │  │
│  │  ├─ registro/page.tsx (DNI → hash → tx CitizenRegistry)  │  │
│  │  ├─ propuesta/[id]/   (votar via Vote.castVote)          │  │
│  │  └─ dashboard/page.tsx (lista reportes Hermes)           │  │
│  │  components/                                             │  │
│  │  ├─ ConnectWalletButton.tsx                              │  │
│  │  ├─ NetworkBadge.tsx  (zkTanenbaum 57057 vs Anvil 31337) │  │
│  │  └─ ui/* (shadcn primitives)                             │  │
│  │  lib/                                                    │  │
│  │  ├─ wagmi.ts          (config dual-chain)                │  │
│  │  ├─ contracts.ts      (ABIs cargados desde shared/abis/) │  │
│  │  └─ trpc.ts           (cliente tRPC)                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────┬──────────────────────────────┬───────────────┘
                 │ tRPC over HTTP               │ HTTP (CORS)
                 ▼                              ▼
┌────────────────────────────┐  ┌──────────────────────────────┐
│  Backend Node  ·  :4000    │  │  Agents Python  ·  :8000     │
│  Express + tRPC + viem     │  │  FastAPI + Hermes runtime    │
│                            │  │                              │
│  routers/                  │  │  app/                        │
│  ├─ proposals.ts           │  │  ├─ main.py    (FastAPI)     │
│  │   .list, .get, .tally   │  │  ├─ listener.py (web3 events)│
│  ├─ citizens.ts            │  │  ├─ reporter.py (templates)  │
│  │   .isRegistered         │  │  ├─ llm.py     (anthropic/   │
│  ├─ reports.ts             │  │  │              openrouter)  │
│  │   .list (lee Supabase)  │  │  └─ memory.py  (pgvector)    │
│  │                         │  │  hermes/                     │
│  services/                 │  │  ├─ SOUL.md (orlando wrote)  │
│  └─ blockchain.service.ts  │  │  ├─ INSTINCT.md              │
│      (viem clients to      │  │  └─ templates/               │
│       Anvil + zkTanenbaum) │  │      └─ reporte_voto.md      │
└────────────┬───────────────┘  └──────────┬───────────────────┘
             │ pg (Supabase)               │ pg (Supabase)
             ▼                              ▼
┌────────────────────────────────────────────────────────────┐
│  Supabase  ·  Postgres 17 + pgvector  ·  :54322            │
│  Tablas:                                                   │
│  ├─ proposals_cache    (cache de propuestas on-chain)       │
│  ├─ hermes_reports     (reportes generados)                 │
│  ├─ hermes_memory      (embeddings vectoriales pgvector)    │
│  └─ sessions           (no auth real Sprint 1, audit only)  │
└────────────────────────────────────────────────────────────┘
             │ JSON-RPC                     │ JSON-RPC (websocket)
             ▼                              ▼
┌────────────────────────────────────────────────────────────┐
│  Blockchain                                                │
│  ┌──────────────────────────┐  ┌──────────────────────┐    │
│  │ Anvil local  ·  :8545    │  │ zkTanenbaum testnet  │    │
│  │ Chain ID 31337           │  │ Chain ID 57057       │    │
│  │ Fork: stand-alone        │  │ rpc-zk.tanenbaum.io  │    │
│  │ Cuentas pre-funded       │  │ Faucet TSYS manual   │    │
│  └──────────────────────────┘  └──────────────────────┘    │
│  Contratos (idénticos en ambas redes):                     │
│  ├─ CitizenRegistry.sol  (registro DNI hash)               │
│  └─ Vote.sol             (1 propuesta preseeded)           │
└────────────────────────────────────────────────────────────┘
```

### Estructura del repo después de Sprint 1

```
CivicSys/
├── blockchain/                  ← real implementación, NO solo docs
│   ├── contracts/
│   │   ├── CitizenRegistry.sol
│   │   ├── Vote.sol
│   │   └── interfaces/
│   ├── scripts/
│   │   ├── deploy-local.ts
│   │   ├── deploy-zktanenbaum.ts
│   │   └── seed-propuesta.ts
│   ├── test/
│   │   ├── CitizenRegistry.test.ts
│   │   └── Vote.test.ts
│   ├── hardhat.config.ts
│   └── deployments/             ← addresses por red
│       ├── localhost.json
│       └── zkTanenbaum.json
│
├── backend/                     ← Node BFF (mantener lo de Sandro, podar lo de alertas)
│   ├── src/
│   │   ├── server.ts
│   │   ├── trpc.ts
│   │   ├── routers/
│   │   │   ├── _app.ts
│   │   │   ├── proposals.ts
│   │   │   ├── citizens.ts
│   │   │   └── reports.ts
│   │   ├── services/
│   │   │   ├── blockchain.service.ts  (real viem, no mock)
│   │   │   └── supabase.service.ts
│   │   └── lib/
│   │       └── chains.ts              (zkTanenbaum + Anvil definitions)
│   └── package.json
│
├── agents/                      ← Python FastAPI + Hermes
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py
│   │   ├── listener.py
│   │   ├── reporter.py
│   │   ├── llm.py
│   │   └── memory.py
│   ├── hermes/
│   │   ├── SOUL.md
│   │   ├── INSTINCT.md
│   │   ├── PLAN.md
│   │   ├── VISION.md
│   │   └── templates/
│   │       └── reporte_voto.md
│   └── tests/
│
├── frontend/civicsys/           ← mantener scaffold de Sandro, podar páginas de alertas
│   ├── app/
│   │   ├── page.tsx                    (home/pitch)
│   │   ├── registro/page.tsx
│   │   ├── propuesta/[id]/page.tsx
│   │   └── dashboard/page.tsx
│   ├── components/
│   │   ├── ConnectWalletButton.tsx
│   │   ├── NetworkBadge.tsx
│   │   └── ui/                         (shadcn)
│   ├── lib/
│   │   ├── wagmi.ts
│   │   ├── contracts.ts
│   │   └── trpc.ts
│   └── package.json
│
├── shared/                      ← finalmente con contenido
│   ├── abis/
│   │   ├── CitizenRegistry.json
│   │   └── Vote.json
│   ├── types/
│   │   └── index.ts             (Proposal, Vote, CitizenHash, HermesReport)
│   └── schemas/
│       └── zod.ts               (validación cross-stack)
│
├── infra/                       ← NUEVO: Docker + scripts ops
│   ├── docker-compose.yml
│   ├── supabase/
│   │   ├── init.sql             (DDL tablas)
│   │   └── seed.sql             (data demo opcional)
│   └── anvil/
│       └── Dockerfile           (foundry-rs/foundry image)
│
└── docs/
    ├── superpowers/specs/2026-05-21-ssc-antipereza-sprint1-design.md   (este archivo)
    ├── plans/                                                          (AEGIS · próximo paso)
    │   └── tactica/sprint1-mvp/
    │       └── 00-INDEX.md      (plan AEGIS detallado · writing-plans)
    ├── testing-localhost.md      (guía de prueba en localhost)
    └── (existing docs preserved)
```

---

## 4 · Componentes (unit-by-unit)

### 4.1 · `CitizenRegistry.sol`

**Qué hace**: registra ciudadanos por hash de DNI. Una dirección, un hash. Eventos on-chain para auditoría.

**Interfaz**:
```solidity
function register(bytes32 dniHash) external;
function hashOf(address citizen) external view returns (bytes32);
function isRegistered(address citizen) external view returns (bool);
event CitizenRegistered(address indexed citizen, bytes32 dniHash, uint256 timestamp);
```

**Invariantes**:
- `dniHash != bytes32(0)` (sanity).
- Una dirección no se puede re-registrar (Sprint 1 simplifica; Sprint 2 puede agregar revocación).
- El hash NO contiene el DNI en claro; se calcula off-chain como `keccak256(abi.encodePacked(dni, PUBLIC_SALT))`.

**Privacy**: `PUBLIC_SALT` es público (vive en `.env.example` y se comparte cross-stack). No es secreto criptográfico — es para prevenir rainbow-tables triviales. Verdadera atestación queda fuera de scope.

### 4.2 · `Vote.sol`

**Qué hace**: una propuesta hardcoded preseeded en el deploy. Tres opciones (Sí/No/Abstención). Solo ciudadanos registrados votan. Un voto por dirección. Cierre por timestamp.

**Interfaz**:
```solidity
struct Proposal {
    uint256 id;
    string title;
    string ipfsCid;          // contenido completo de la propuesta en IPFS · opcional Sprint 1
    uint256 openAt;
    uint256 closeAt;
    bool closed;
}

enum Choice { Yes, No, Abstain }

function castVote(uint256 proposalId, Choice choice) external;
function getProposal(uint256 id) external view returns (Proposal memory);
function tally(uint256 id) external view returns (uint256 yes, uint256 no, uint256 abstain);
function close(uint256 id) external;  // anyone after closeAt; emits Closed
event VoteCast(address indexed voter, uint256 indexed proposalId, Choice choice);
event ProposalClosed(uint256 indexed proposalId, uint256 yes, uint256 no, uint256 abstain);
```

**Dependencias**: lee `CitizenRegistry.isRegistered(msg.sender)` antes de aceptar voto. Si no, revierte.

**Invariantes**:
- Un votante no puede votar dos veces (mapping `voted[id][address]`).
- No se acepta voto fuera de `[openAt, closeAt]`.
- `close` solo después de `closeAt` y no idempotente — emite `ProposalClosed` una sola vez.

### 4.3 · Hardhat config + deploy scripts

**Qué hace**: compila Solidity 0.8.24, configura redes (Anvil local + zkTanenbaum), despliega + seedea + copia ABIs a `shared/abis/`.

**Comandos**:
- `npx hardhat compile`
- `npx hardhat node` (Anvil local equivalente — pero usaremos Foundry Anvil para fidelidad)
- `npx hardhat run scripts/deploy-local.ts --network localhost`
- `npx hardhat run scripts/deploy-zktanenbaum.ts --network zkTanenbaum`

**Deploy script logic**: deploya CitizenRegistry, deploya Vote pasándole `(registryAddress, title, ipfsCid, openAt, closeAt)` — la propuesta se crea en el constructor del Vote.sol con esos parámetros (no hay función `createProposal` pública en Sprint 1; multi-propuesta dinámica se difiere a Sprint 2). Escribe addresses a `deployments/{red}.json`. Copia ABIs a `shared/abis/`.

### 4.4 · Backend Node (Express + tRPC + viem)

**Qué hace**: BFF que el frontend consume. Lee on-chain via viem. Mantiene cache en Supabase para queries que costaría refrescar cada llamada.

**Endpoints tRPC**:
- `proposals.list()` → lee del cache Supabase (refresca background cada 30s).
- `proposals.get(id)` → cache primero, fallback on-chain.
- `proposals.tally(id)` → siempre on-chain (datos fresh para mostrar "x votos").
- `citizens.isRegistered(address)` → on-chain directo (cache TTL 60s).
- `reports.list({limit, offset})` → lee Supabase.

**viem clients**: dos clients configurados (`anvilClient`, `zkTanenbaumClient`). Selección por env var `CHAIN=local|testnet` o por header `X-Chain` del request.

**Dependencias externas**: Supabase, ambos RPCs. Si Supabase cae, degrada a leer todo on-chain (lento pero funcional). Si RPC cae, devuelve error 503 con mensaje claro.

### 4.5 · Agents Python (FastAPI + Hermes runtime)

**Qué hace**: corre Hermes maestro. Escucha eventos `ProposalClosed` on-chain. Cuando dispara, genera un reporte usando un template + LLM (Anthropic Claude API o OpenRouter como fallback). Guarda reporte en Supabase.

**Endpoints FastAPI**:
- `GET /agents/health` → status del listener, último evento procesado.
- `GET /agents/reports/{proposal_id}` → reporte específico (parseable JSON).
- `POST /agents/regenerate/{proposal_id}` → fuerza regeneración (manual, dev-only).

**Listener**: usa web3.py (mismo proveedor que viem en JS) con `eth_getLogs` polling cada 10s. Para Anvil/testnet ambos. Persistente: guarda `last_block_processed` en Supabase para no reprocesar al reiniciar.

**Reporter template** (`hermes/templates/reporte_voto.md`):
```markdown
# Reporte sobre la propuesta {{proposal.title}}

**Fecha**: {{timestamp}}
**Proposal ID**: {{proposal.id}}
**Red**: {{network}}
**Total de votos**: {{total_votes}}
**Resultados**: Sí={{yes}} · No={{no}} · Abstención={{abstain}}

## Análisis (Hermes)

{{llm_analysis}}

## Trazabilidad

- TX hash: {{tx_hash}}
- Bloque: {{block_number}}
- Explorer: {{explorer_url}}
- Confianza del análisis: {{confidence}}/10
- Fuentes: blockchain events + template propio (Hermes v0.1)
```

**LLM client**: dual provider con fallback. Anthropic `claude-sonnet-4-6` primario, OpenRouter secundario. Timeout 30s. Si ambos fallan, persiste reporte con `llm_analysis = "<unavailable>"` y `confidence = 0` — el demo no se cae.

**Memory pgvector**: cada reporte genera embedding (384 dim, modelo `all-MiniLM-L6-v2` local o HF API). Sprint 1 lo guarda pero no consulta (las queries vectoriales vienen en Sprint 2 con "buscar reportes similares").

### 4.6 · Frontend Next.js 14 + Tailwind + shadcn

**Páginas**:

- **`/`** (home): pitch del PPT slide 1. Tres bloques: "La IA asesora · El ciudadano supervisa · El blockchain firma". CTA "Conectar wallet" + "Ver propuesta activa".
- **`/registro`**: formulario DNI (8 dígitos) → cliente calcula `keccak256(dni + PUBLIC_SALT)` → modal de confirmación → MetaMask sign → tx → confirmar registro → toast.
- **`/propuesta/[id]`**: muestra detalle de la propuesta (título, descripción, openAt/closeAt). Si el ciudadano no está registrado → CTA registro. Si registrado y abierta → 3 botones (Sí/No/Abstención) → MetaMask sign → confirmación. Si cerrada → muestra tally + link al reporte.
- **`/dashboard`**: lista reportes de Hermes con búsqueda básica + filtro por proposal_id. Click expande Markdown renderizado.

**Componentes clave**:
- `ConnectWalletButton` con wagmi + RainbowKit (o connectkit, decidir en plan táctico).
- `NetworkBadge` que muestra red conectada y avisa si no es 57057 ni 31337.
- `<RegisterCitizenForm>` con validación zod + react-hook-form.

### 4.7 · Supabase (Postgres + pgvector)

**Tablas Sprint 1**:

```sql
-- proposals_cache: refresco background del backend Node
CREATE TABLE proposals_cache (
  id BIGINT PRIMARY KEY,
  chain_id INT NOT NULL,
  title TEXT NOT NULL,
  ipfs_cid TEXT,
  open_at TIMESTAMPTZ NOT NULL,
  close_at TIMESTAMPTZ NOT NULL,
  closed BOOLEAN DEFAULT FALSE,
  yes BIGINT DEFAULT 0,
  no BIGINT DEFAULT 0,
  abstain BIGINT DEFAULT 0,
  refreshed_at TIMESTAMPTZ DEFAULT NOW()
);

-- hermes_reports: persistencia de reportes generados
CREATE TABLE hermes_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id BIGINT NOT NULL REFERENCES proposals_cache(id),
  chain_id INT NOT NULL,
  body_markdown TEXT NOT NULL,
  llm_provider TEXT NOT NULL,        -- 'anthropic' | 'openrouter' | 'unavailable'
  confidence SMALLINT NOT NULL,       -- 0-10
  tx_hash TEXT,
  block_number BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- hermes_memory: embeddings de reportes (pgvector)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE hermes_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES hermes_reports(id) ON DELETE CASCADE,
  embedding VECTOR(384),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX hermes_memory_embedding_idx ON hermes_memory USING ivfflat (embedding vector_cosine_ops);

-- sessions: audit log mínimo de interacciones (no auth real Sprint 1)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT,
  action TEXT NOT NULL,               -- 'register' | 'vote' | 'view_report'
  payload JSONB,
  chain_id INT,
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5 · Data flow (demo happy path)

```
1. User abre http://localhost:3000  → home con pitch
2. Click "Conectar Wallet" → MetaMask popup
3. wagmi detecta chain → NetworkBadge muestra "zkTanenbaum 57057 ✓" o "Anvil local 31337 ✓"
4. User va a /registro
5. Ingresa DNI 12345678 → frontend calcula keccak256("12345678" + SALT)
6. Click "Registrar" → MetaMask popup pidiendo firma de tx CitizenRegistry.register(hash)
7. Confirma → tx broadcast → toast "Esperando confirmación..."
8. Bloque mineado → toast "✓ Registrado on-chain"
9. User va a /propuesta/1
10. Frontend pide proposals.get(1) → backend Node lee cache (o on-chain si miss)
11. Muestra título + opciones Sí/No/Abstención
12. User click "Sí" → MetaMask popup → firma tx Vote.castVote(1, 0)
13. Confirma → tx → toast "✓ Voto registrado"
14. Backend Python (listener) detecta VoteCast event
15. Listener actualiza proposals_cache (yes++)
16. Si la propuesta llega a closeAt o threshold → ejecuta Vote.close(1)
17. Listener detecta ProposalClosed event
18. Reporter genera report markdown via LLM (Anthropic)
19. Persiste en hermes_reports + embedding en hermes_memory
20. User va a /dashboard → ve reporte recién creado
21. Click expande → ve análisis Hermes con tx_hash + confidence + fuentes
```

**Latencias esperadas**:
- Pasos 1-9 (registro): ≤30s incluyendo MetaMask + bloque.
- Pasos 11-13 (voto): ≤30s.
- Pasos 14-19 (Hermes pipeline): ≤60s (incluyendo LLM call).
- Total demo: ≤2 min.

---

## 6 · Error handling

| Falla | Detección | Respuesta |
|---|---|---|
| RPC zkTanenbaum down | viem timeout o `getChainId()` falla | Frontend: muestra banner "RPC remoto inestable, usá Anvil local". Backend: fallback a RPC secundario si existe en `.env`. |
| Anvil local no corre | viem `eth_chainId` connection refused | Frontend: error UI "Anvil no corre. Ejecutá `docker compose up`". Link a `docs/testing-localhost.md`. |
| Supabase down | pg connection refused | Backend Node: log + degrada a on-chain reads. Backend Python: cola en memoria los reportes pendientes (LRU bounded 100), reintenta cada 30s. |
| LLM (Anthropic + OpenRouter) ambos fallan | timeouts o 5xx | Reporte persistido con `llm_analysis="<unavailable>"`, `llm_provider="unavailable"`, `confidence=0`. Demo no se rompe; admin ve "0 confianza" claramente. |
| MetaMask en red equivocada | wagmi `chainId` mismatch | NetworkBadge rojo + botón "Cambiar a zkTanenbaum" que llama `switchChain`. Si user rechaza, voto bloqueado con toast explicativo. |
| Usuario intenta votar sin registrar | Vote.sol revierte | viem captura revert + frontend muestra toast "Tenés que registrarte primero" + redirect a /registro. |
| Doble registro / doble voto | revert on-chain | Toast "Ya registrado" / "Ya votaste esta propuesta". No es error, es UX. |
| Tx pendiente que nunca confirma | timeout 60s | Toast "Tx atascada. Hash X. Verificá en explorer." con link al explorer correspondiente (Anvil sin explorer, zkTanenbaum link directo). |

---

## 7 · Testing

### 7.1 · Tests automatizados Sprint 1

**Política de cobertura: ≥80% statements en todas las capas con código de aplicación.** No es aspiracional — es **bloqueante en CI**. Si un bloque del plan AEGIS baja el coverage debajo del 80% en su capa, el bloque no cierra.

| Capa | Framework | Herramienta de coverage | Mínimo |
|---|---|---|---|
| Solidity contratos | Hardhat + Chai + ethers v6 | `solidity-coverage` | **80% statements** · 100% branches en `require`/`revert` |
| Backend Node (tRPC + viem) | Vitest + supertest | `vitest --coverage` (c8/v8 provider) | **80% statements** en `routers/`, `services/`, `lib/` |
| Backend Python (FastAPI + Hermes) | pytest + httpx + pytest-asyncio | `pytest-cov` | **80% statements** en `app/`, excluyendo `__init__.py` y wiring de FastAPI |
| Frontend Next.js (componentes + hooks + lib) | Vitest + `@testing-library/react` + jsdom + msw | `vitest --coverage` | **80% statements** en `components/`, `lib/`, `hooks/`. Excluye `app/*/page.tsx` (server components testeados via E2E) y assets estáticos |
| Frontend E2E (happy path) | Playwright | N/A (cobertura de comportamiento, no de líneas) | 1 escenario verde · happy path completo contra Anvil local |

**Configuración cross-stack del coverage gate**:

- Cada `package.json` / `pyproject.toml` define `coverage.threshold.statements = 80` para que `npm run test:ci` / `pytest --cov-fail-under=80` falle naturalmente si baja.
- El plan AEGIS incluye un **bloque dedicado a CI** (`.github/workflows/ci.yml`) que corre los 4 jobs en paralelo y rechaza el merge si alguno tira coverage < 80.
- `solidity-coverage` se corre como `npx hardhat coverage` (genera `coverage/index.html`).
- `vitest --coverage` con `--reporter=text-summary` para output legible en CI logs.
- `pytest-cov --cov-report=term-missing --cov-fail-under=80`.

**Componentes específicos que requieren cobertura**:

| Capa | Targets de coverage (priorizado) |
|---|---|
| Solidity | `CitizenRegistry.register/isRegistered/hashOf` · `Vote.castVote/getProposal/tally/close` · cada `require` con su test de revert |
| Backend Node | `routers/proposals.ts` · `routers/citizens.ts` · `routers/reports.ts` · `services/blockchain.service.ts` (viem mockeado) · `services/supabase.service.ts` (pg mockeado) · `lib/chains.ts` |
| Backend Python | `app/listener.py` (event polling con web3 mock) · `app/reporter.py` (template render + edge cases vacíos) · `app/llm.py` (anthropic + openrouter clients con `httpx_mock`) · `app/memory.py` (pgvector insert + similarity query) |
| Frontend | `components/ConnectWalletButton.tsx` (estados: disconnected/connecting/connected/wrongChain) · `components/NetworkBadge.tsx` (zkTanenbaum/Anvil/desconocida) · `components/RegisterCitizenForm.tsx` (validación zod + flujo de tx) · `lib/wagmi.ts` (config dual-chain) · `lib/contracts.ts` (ABI loaders) · `lib/trpc.ts` (client wrapper) · hooks custom |

**Lo que NO se testea automáticamente en Sprint 1** (defer):
- Cross-browser (solo Chromium en E2E Sprint 1; Firefox/WebKit a Sprint 2).
- Tests de carga (≥100 votos métrica del PPT · Sprint 2-3).
- Tests de seguridad / threat model (Sprint 3 cyber con Tatiana).
- Mutation testing (Stryker / mutmut) — nice-to-have post-MVP.
- Server Components (Next.js `app/*/page.tsx` cuando son async/server): se cubren via Playwright E2E porque testearlos como unit requiere infraestructura desproporcionada para Sprint 1.

### 7.2 · Testing manual (guía localhost)

Documento `docs/testing-localhost.md` con setup paso a paso:

1. Pre-requisitos (Docker Desktop, Node 20+, Python 3.11+, Foundry, MetaMask).
2. Clone repo.
3. `cp .env.example .env` y completar `ANTHROPIC_API_KEY` (o `OPENROUTER_API_KEY`).
4. `docker compose up -d` levanta: anvil, supabase-postgres, supabase-meta, supabase-rest (mínimo necesario).
5. `cd blockchain && npm install && npx hardhat run scripts/deploy-local.ts --network localhost` (deploya + seedea + copia ABIs).
6. `cd ../backend && npm install && npm run dev` (puerto 4000).
7. `cd ../agents && pip install -e . && uvicorn app.main:app --reload --port 8000` (puerto 8000).
8. `cd ../frontend/civicsys && npm install && npm run dev` (puerto 3000).
9. Configurar MetaMask: agregar red custom "Anvil local" (RPC `http://localhost:8545`, Chain ID `31337`, Symbol `ETH`). Importar account 0 de Anvil (private key conocido).
10. Navegar `http://localhost:3000` y ejecutar el happy path completo.

Más una sección de testing contra zkTanenbaum:

11. Solicitar TSYS del faucet (URL en docs).
12. Cambiar MetaMask a "zkTanenbaum" (RPC `https://rpc-zk.tanenbaum.io`, Chain ID `57057`, Symbol `TSYS`).
13. `cd blockchain && npx hardhat run scripts/deploy-zktanenbaum.ts --network zkTanenbaum` (deploya en testnet real).
14. Repetir flow en testnet.

---

## 8 · Docker emulación zkTanenbaum

**Decisión técnica clave**: NO emulamos zkTanenbaum completo (zkRollup-Validium + prover + sequencer + Robin Bridge + Sentry Nodes). Demasiado pesado y poco realista para hackathon. Usamos **Anvil de Foundry** como EVM-compatible surrogate con configuración que mimetiza zkTanenbaum lo mejor posible:

```yaml
# infra/docker-compose.yml (extracto)
services:
  anvil:
    image: ghcr.io/foundry-rs/foundry:latest
    container_name: ssca-anvil
    ports:
      - "8545:8545"
    command: >
      anvil
      --host 0.0.0.0
      --chain-id 31337
      --block-time 2
      --gas-limit 30000000
      --base-fee 1000000000
      --accounts 10
      --balance 10000
```

**Fidelidad lograda**:
- ✅ EVM-compatible (Solidity 0.8.24 funciona idéntico).
- ✅ JSON-RPC compatible (viem + web3.py funcionan idéntico).
- ✅ Eventos / logs (event listener Python funciona idéntico).
- ✅ Block time 2s (zkTanenbaum tarda similar para finality básica).
- ❌ **No emula zkProofs** (en zkTanenbaum cada tx genera prueba; en Anvil no hay).
- ❌ **No emula sentry nodes AI** (feature de Syscoin específica, irrelevante para nuestro contrato).
- ❌ **No emula merge-mining con Bitcoin** (feature L1 Syscoin, transparente para nosotros).

**Justificación**: para Sprint 1 demo, lo que importa es el flow (registro → voto → reporte). Las features zk únicas (privacy, costos bajos, finality fast) son **propiedades del entorno**, no afectan el contrato. Cuando deploymos a testnet real (`scripts/deploy-zktanenbaum.ts`), tenemos las features de verdad — y el plan AEGIS incluye smoke-tests contra testnet en cada bloque relevante.

---

## 9 · Riesgos & mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Sandro no vuelve en Sprint 1 | Alta | Medio | Slice está diseñado para ser ejecutable solo por Orlando. Re-asigna las task A-* y B-* a Orlando. |
| Faucet zkTanenbaum sin TSYS | Media | Bajo | Anvil local cubre 99%. Testnet es "evidencia adicional" no bloqueante. |
| RPC zkTanenbaum caído durante demo | Media | Alto si demo en vivo | Demo principal en Anvil local. Testnet es video pregrabado de evidencia. |
| LLM API quota / costos | Baja | Bajo | Anthropic con prompt caching. OpenRouter como fallback. Anvil local + 1 reporte por demo = mínimo costo. |
| Supabase complejidad operacional | Media | Medio | Sprint 1 usa supabase-postgres + meta + rest (3 contenedores, no la stack completa de Studio). Self-host minimal. |
| shadcn / Tailwind drift | Baja | Bajo | `npx shadcn init` + componentes pinned commit. |
| MetaMask UX failure en demo en vivo | Media | Alto | Demo grabada como respaldo. Wallet pre-cargada con TSYS antes del evento. |
| Concurrencia 2 devs (Orlando + Sandro si vuelve) en mismo archivo | Media | Bajo | Plan AEGIS asigna bloques disjuntos. Si Sandro vuelve, toma `frontend/` y Orlando toma `blockchain/` + `agents/`. |

---

## 10 · Success criteria (Definition of Done · Sprint 1)

**Funcionales**:
- [ ] `docker compose up` levanta todo en ≤2 minutos en máquina limpia.
- [ ] Happy path end-to-end ejecuta en Anvil local ≤2 minutos sin errores.
- [ ] Mismo happy path ejecuta en zkTanenbaum testnet (con TSYS del faucet).
- [ ] Reporte de Hermes generado contiene: título · proposal id · tally · análisis LLM · tx hash · explorer link · confidence · timestamp.

**Cobertura ≥80% statements en TODAS las capas con código de aplicación** (gate bloqueante en CI):
- [ ] `cd blockchain && npx hardhat coverage` → ≥80% statements + 100% branches en revert paths.
- [ ] `cd backend && npm run test:ci` → ≥80% statements en `routers/`, `services/`, `lib/`.
- [ ] `cd agents && pytest --cov=app --cov-fail-under=80` → ≥80% statements en `app/`.
- [ ] `cd frontend/civicsys && npm run test:ci` → ≥80% statements en `components/`, `lib/`, `hooks/`.
- [ ] `cd frontend/civicsys && npx playwright test` → 1 escenario E2E happy path verde contra Anvil.
- [ ] CI workflow (`.github/workflows/ci.yml`) corre los 4 jobs en paralelo y bloquea merge si alguno baja del 80%.

**Documentación y disciplina AEGIS**:
- [ ] `docs/testing-localhost.md` permite que un dev del equipo levante el demo en ≤30 minutos en máquina limpia.
- [ ] Plan AEGIS escrito + bloques cerrados + devlog + state-sync.
- [ ] Spec (este archivo) movida a `docs/superpowers/specs/executed/` al cierre.

**Seguridad mínima Sprint 1**:
- [ ] No secrets hardcodeados. Todo `.env.example` apunta a placeholders. `gitleaks` corre clean en pre-commit + CI.
- [ ] PUBLIC_SALT documentado como no-secreto en `.env.example` con comentario explicativo.
- [ ] Logs del backend Python NO incluyen el DNI raw bajo ninguna circunstancia (test específico que valida esto).

---

## 11 · Próximo paso

Invocar `superpowers:writing-plans` para descomponer este diseño en un **plan AEGIS táctico** con bloques atómicos en `docs/plans/tactica/sprint1-mvp/00-INDEX.md`. El plan AEGIS define orden de ejecución, owners por bloque, criterios de done verificables, y gate humanos antes/después de cada bloque.

---

> *"La democracia no se delega. Se audita."* — PPT slide 18
