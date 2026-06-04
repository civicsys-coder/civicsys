# Plan táctico AEGIS · Sprint 1 MVP · SSC ANTIPEREZA

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal**: Entregar un MVP demoable end-to-end del SSC ANTIPEREZA en zkTanenbaum (con Anvil local como surrogate de iteración rápida) en 5 días, con cobertura ≥80% statements hard-gated en CI a través de las 4 capas con código de aplicación (Solidity · Node · Python · Frontend).

**Arquitectura** (resumen, ver spec): mixta — contratos Solidity (`CitizenRegistry` + `Vote`) deployados a Anvil + zkTanenbaum · backend Node (Express + tRPC + viem) como BFF · backend Python (FastAPI + Hermes runtime) que escucha eventos y genera reportes · frontend Next.js 14 + Tailwind + shadcn · Supabase Postgres + pgvector · todo orquestado por Docker Compose.

**Tech Stack**: Solidity 0.8.24 · Hardhat 2.x · ethers v6 · viem 2.x · TypeScript 5 · Node 20 · Express 5 · tRPC 11 · Python 3.11 · FastAPI · web3.py · pytest · Next.js 14 (App Router) · Tailwind 4 · shadcn-ui · Vitest · @testing-library/react · Playwright · Postgres 17 + pgvector · Foundry Anvil · Docker Compose · GitHub Actions.

**Fecha**: 2026-05-21
**Estado**: Táctica escrita, ejecución pendiente (Gate 1 abierto · esperando OK humano antes de Bloque A).
**Pre-requisitos**: spec aprobada en [`../../../superpowers/specs/2026-05-21-ssc-antipereza-sprint1-design.md`](../../../superpowers/specs/2026-05-21-ssc-antipereza-sprint1-design.md). Working tree de CivicSys con los cambios pendientes de Rollux→zkTanenbaum de la sesión 2026-05-20 (commitearlos o stashearlos antes de Bloque A).

---

## Bloques

| # | Bloque | Capa | Tareas | LOC est. | Dependencias | Coverage gate |
|---|---|---|---|---|---|---|
| 0 | Prep · cleanup + commit base | repo-wide | 4 | ~50 | — | n/a |
| A | Infra Docker Compose + Supabase init | infra | 8 | ~250 | 0 | n/a |
| B | Contratos Solidity + tests | blockchain | 14 | ~600 | 0 | 80% Solidity |
| C | Scripts de deploy + ABIs a `shared/` | blockchain | 6 | ~250 | B | n/a |
| D | Shared types + zod schemas | shared | 4 | ~150 | C | n/a |
| E | Backend Node BFF (Express + tRPC + viem) | backend | 14 | ~550 | C, D, A | 80% Node |
| F | Backend Python (FastAPI + Hermes runtime) | agents | 16 | ~600 | C, D, A | 80% Python |
| G | Frontend Next.js · setup + páginas | frontend | 18 | ~700 | D, E | 80% Frontend unit |
| H | Frontend E2E Playwright | frontend | 3 | ~150 | G, B, E, F | 1 escenario verde |
| I | CI workflow + coverage gate | infra | 5 | ~200 | B, E, F, G | n/a (gate del gate) |
| J | Cleanup deuda Sprint 2 (alertas/sentry/mapa) | repo-wide | 4 | ~100 | — | n/a |
| K | Docs · testing-localhost + state-sync AEGIS | docs | 5 | ~300 | A-J | n/a |
| **Total** | | | **101** | **~3850** | | |

**Notas sobre orden**:

- Bloque 0 limpia state local (commit lo pendiente o stash). Pre-requisito de todo lo demás.
- Bloque A levanta la infra antes que cualquier capa que la use (Supabase es dep de E, F; Anvil es dep de B testing on-chain).
- Bloques B → C → D forman el camino crítico inicial. Una vez D termina, **E y F pueden ejecutarse en paralelo** (si hubiera 2 devs) o secuencial si Orlando va solo.
- Bloque G arranca cuando D esté listo (los types/schemas son la interfaz). G puede arrancar contra E mockeado si E aún no terminó.
- H requiere todo el pipeline arriba (B + E + F + G).
- I (CI) puede arrancar en paralelo con G una vez que B, E, F tienen suites de test (no necesitan estar al 80%, basta con que corran).
- J es limpieza de deuda — defer al final, no bloquea progreso.
- K es state-sync AEGIS final, va al cierre del Sprint.

---

## Bloques detallados

Cada bloque vive en su propio archivo `bloque-X-<slug>.md` en este directorio. Cada uno tiene tareas atómicas de 2-5 minutos con código completo, comandos exactos y criterios de done verificables. Apertura/cierre de cada bloque es un **gate humano** (commit + push + cuenta visible del coverage en la capa correspondiente antes de avanzar).

- [Bloque 0 — Prep](./bloque-0-prep.md) · commit/stash de la deuda 2026-05-20 · bootstrap del plan AEGIS.
- [Bloque A — Infra](./bloque-a-infra.md) · `docker-compose.yml` con anvil + supabase-postgres + supabase-meta · scripts `infra/up.sh`/`infra/down.sh` · seed SQL.
- [Bloque B — Contratos](./bloque-b-contratos.md) · `CitizenRegistry.sol` + `Vote.sol` con TDD · `solidity-coverage` configurado · gate 80% + 100% branches en reverts.
- [Bloque C — Deploy](./bloque-c-deploy.md) · `deploy-local.ts` + `deploy-zktanenbaum.ts` · ABI copy script · `deployments/{red}.json`.
- [Bloque D — Shared](./bloque-d-shared.md) · `shared/types/index.ts` · `shared/schemas/zod.ts` · re-exports cross-stack.
- [Bloque E — Backend Node](./bloque-e-backend-node.md) · routers tRPC · `blockchain.service.ts` real · `supabase.service.ts` · Vitest cobertura 80%.
- [Bloque F — Backend Python](./bloque-f-backend-python.md) · listener web3.py · reporter template · LLM dual provider · memory pgvector · pytest cobertura 80%.
- [Bloque G — Frontend](./bloque-g-frontend.md) · setup shadcn · 4 páginas (home/registro/propuesta/dashboard) · componentes (`ConnectWallet`, `NetworkBadge`, `RegisterCitizenForm`) · Vitest + RTL cobertura 80%.
- [Bloque H — E2E](./bloque-h-e2e.md) · Playwright · 1 happy path completo contra Anvil.
- [Bloque I — CI](./bloque-i-ci.md) · `.github/workflows/ci.yml` · 4 jobs paralelos · coverage gate hard-bloqueante.
- [Bloque J — Cleanup deuda Sprint 2](./bloque-j-cleanup.md) · borrar `frontend/docs/F-026 a F-050` + `backend/docs/B-016 a B-031` (producto equivocado).
- [Bloque K — Docs + state-sync](./bloque-k-docs-state-sync.md) · `docs/testing-localhost.md` · devlog AEGIS · mover plan a `executed/` · cost-ledger append.

---

## Criterios de cierre del Sprint

Todos verde antes de tag `sprint1-mvp`:

- [ ] **Funcional**: demo happy path corre en Anvil local en ≤2 min · mismo flow en zkTanenbaum testnet (con TSYS faucet).
- [ ] **Cobertura cross-stack ≥80% statements**:
  - [ ] Solidity: `pnpm exec hardhat coverage` ≥80% + 100% branches en reverts.
  - [ ] Node: `pnpm test:ci` en `backend/` ≥80%.
  - [ ] Python: `pytest --cov=app --cov-fail-under=80` en `agents/` ≥80%.
  - [ ] Frontend unit: `pnpm test:ci` en `frontend/civicsys/` ≥80%.
- [ ] **E2E**: 1 escenario Playwright verde.
- [ ] **CI**: workflow corre 4 jobs en paralelo, bloquea merge si <80%.
- [ ] **Docs**: `docs/testing-localhost.md` permite levantar el demo en ≤30 min en máquina limpia (probado).
- [ ] **Seguridad mínima**: `gitleaks` clean, `.env.example` con placeholders, sin DNI raw en logs (test específico).
- [ ] **AEGIS**: devlog escrito · plan en `executed/` · cost-ledger appended · `CLAUDE.md` del repo actualizado si aplica.

---

## Sub-skill recomendado para ejecución

**`superpowers:subagent-driven-development`** (un subagente fresco por bloque · review humano entre bloques). Razón: cada bloque toca una capa diferente con su propio stack — un subagente con contexto limpio por bloque rinde mejor que uno único arrastrando contexto cross-stack.

Alternativa: **`superpowers:executing-plans`** (todo en la misma sesión con checkpoints). Más liviano operacionalmente pero el contexto se infla rápido cruzando Solidity → Node → Python → React.

---

## Referencias

- Spec: [`../../../superpowers/specs/2026-05-21-ssc-antipereza-sprint1-design.md`](../../../superpowers/specs/2026-05-21-ssc-antipereza-sprint1-design.md)
- PPT pitch: `C:\Users\Orlando\OneDrive\Desktop\Syscoin Hackathon Blockchain\SSC_ANTIPEREZA_Project_Speech_v3.pptx` (18 slides)
- AEGIS protocol: `C:\dev\protocols\AEGIS\AEGIS-PROTOCOL.md`
- zkTanenbaum: Chain ID 57057 · RPC `https://rpc-zk.tanenbaum.io` · Explorer `https://explorer-zk.tanenbaum.io` · símbolo TSYS · L1 Syscoin
