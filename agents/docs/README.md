# `agents/docs/` — Tareas atómicas del Sprint 1 (capa agentes + API + MCP + Hermes)

> Tareas tutorial-grade para que cualquier integrante del equipo (incluyendo perfiles junior) pueda tomar una `A-XXX`, leerla de cabo a rabo, y completarla sin contexto externo.

## Cómo usar este directorio

1. Mirá el [Tablero (orden de ejecución)](#tablero-orden-de-ejecución).
2. Tomá una tarea `A-XXX` cuyas dependencias estén `done`.
3. Abrila — sigue la estructura: *contexto · conceptos · pasos · verificación · errores comunes*.
4. Un PR pequeño por tarea. Si crece, partila.

## Roles principales

| Rol | Owner | Backup |
|-----|-------|--------|
| Lead backend / Hermes / MCP | **Sandro** | Orlando |
| Smart contract integration | **Orlando** | Sandro |
| QA / Testing | **Gabriel** | Tatiana |
| Docs / Seguridad | **Tatiana** | Eduardo |
| Demo / Storytelling | **Eduardo** | Mario / Grecia |

## Tablero (orden de ejecución)

Las dependencias se leen así: `A-002 ← A-001` significa "A-002 está bloqueada por A-001".

### Bloque 0 · Setup (Día 4)

| # | Tarea | Owner | Esfuerzo | Bloqueada por |
|---|-------|-------|----------|----------------|
| [A-001](./A-001-setup-pyproject.md) | `pyproject.toml` / `requirements.txt` + venv | Sandro | 1 h | — |
| [A-002](./A-002-config-pydantic-settings.md) | `config.py` centralizado (Pydantic Settings) | junior | 45 min | A-001 |
| [A-003](./A-003-citizen-hash-helper.md) | `services/citizen_hash.py` (keccak256 + normalize) | junior | 1 h | A-001 |
| [A-004](./A-004-tests-citizen-hash.md) | Tests de `citizen_hash` (edge cases) | Gabriel | 1 h | A-003 |

### Bloque 1 · Modelos (Día 4 tarde)

| # | Tarea | Owner | Esfuerzo | Bloqueada por |
|---|-------|-------|----------|----------------|
| [A-005](./A-005-modelo-auth.md) | `models/auth.py` (RegisterRequest, AuthStatus) | junior | 45 min | A-001 |
| [A-006](./A-006-modelo-proposal.md) | `models/proposal.py` (Proposal, ProposalCreate, ProposalResult) | junior | 1 h | A-001 |
| [A-007](./A-007-modelo-vote.md) | `models/vote.py` (VoteRequest, VoteResult) | junior | 30 min | A-001 |
| [A-008](./A-008-modelo-report.md) | `models/report.py` (Report) | junior | 45 min | A-001 |

### Bloque 2 · Cliente blockchain (Día 5)

| # | Tarea | Owner | Esfuerzo | Bloqueada por |
|---|-------|-------|----------|----------------|
| [A-009](./A-009-blockchain-client-setup.md) | `services/blockchain_client.py` — base con web3.py + ABIs | Sandro + junior | 2 h | A-002, B-015 |
| [A-010](./A-010-blockchain-client-register.md) | `blockchain_client.register_citizen()` | Sandro + junior | 1 h | A-009, A-003 |
| [A-011](./A-011-blockchain-client-proposals.md) | `blockchain_client.create_proposal/get_proposal/list_active` | junior | 1.5 h | A-009 |
| [A-012](./A-012-blockchain-client-vote-tally.md) | `blockchain_client.cast_vote/tally/has_voted/close` | Sandro + junior | 1.5 h | A-009 |
| [A-013](./A-013-blockchain-client-event-listener.md) | `services/event_listener.py` (poll de `ProposalClosed`) | Sandro | 2 h | A-009, A-012 |

### Bloque 3 · API REST FastAPI (Día 5–6)

| # | Tarea | Owner | Esfuerzo | Bloqueada por |
|---|-------|-------|----------|----------------|
| [A-014](./A-014-route-auth.md) | `routes/auth.py` (POST /auth/register, GET /auth/status) | junior + Sandro | 2 h | A-005, A-010 |
| [A-015](./A-015-route-proposals.md) | `routes/proposals.py` (GET list, POST, GET /{id}/results) | junior + Sandro | 2.5 h | A-006, A-011 |
| [A-016](./A-016-route-votes.md) | `routes/votes.py` (POST /{id}/vote) | junior | 1.5 h | A-007, A-012 |
| [A-017](./A-017-route-reports.md) | `routes/reports.py` (GET /reports/{id}) | junior | 1.5 h | A-008, A-024 |
| [A-018](./A-018-route-health-status.md) | `routes/health.py` + `/hermes/status` | junior | 1 h | A-009 |
| [A-019](./A-019-middleware-logging-pii.md) | Middleware: logging filtra PII (DNI, secret, key) | Tatiana | 1.5 h | A-001 |
| [A-020](./A-020-middleware-cors.md) | Middleware CORS configurable | junior | 30 min | A-001 |
| [A-021](./A-021-api-main.md) | `api/main.py` (FastAPI app factory + rutas + middleware) | Sandro | 1 h | A-014, A-015, A-016, A-017, A-018, A-019, A-020 |

### Bloque 4 · Hermes (Día 6)

| # | Tarea | Owner | Esfuerzo | Bloqueada por |
|---|-------|-------|----------|----------------|
| [A-022](./A-022-hermes-llm-client.md) | `hermes/llm_client.py` (Anthropic + OpenRouter base_url) | Sandro | 1.5 h | A-002 |
| [A-023](./A-023-hermes-reporter.md) | `hermes/reporter.py` (SOUL+INSTINCT+datos → markdown) | Sandro | 2.5 h | A-022, A-012 |
| [A-024](./A-024-hermes-runtime.md) | `hermes/runtime.py` (loop principal: listener → reporter → API) | Sandro | 2 h | A-013, A-023 |
| [A-025](./A-025-hermes-memory-templates.md) | `hermes/memory/MEMORY.md` y `USER.md` (templates Sprint 1) | Tatiana | 45 min | — |

### Bloque 5 · MCP Server (Día 6–7)

| # | Tarea | Owner | Esfuerzo | Bloqueada por |
|---|-------|-------|----------|----------------|
| [A-026](./A-026-mcp-tool-register-citizen.md) | MCP tool `register_citizen` | Sandro + junior | 1 h | A-010 |
| [A-027](./A-027-mcp-tool-list-get-proposals.md) | MCP tool `list_proposals` + `get_proposal` | junior | 1 h | A-011 |
| [A-028](./A-028-mcp-tool-cast-vote.md) | MCP tool `cast_vote` | junior | 1 h | A-012 |
| [A-029](./A-029-mcp-tool-generate-report.md) | MCP tool `generate_report` | Sandro | 1 h | A-023 |
| [A-030](./A-030-mcp-tool-hermes-status.md) | MCP tool `get_hermes_status` | junior | 45 min | A-024 |
| [A-031](./A-031-mcp-transports.md) | `mcp_server/transports.py` (stdio + SSE) | Sandro | 1.5 h | A-001 |
| [A-032](./A-032-mcp-server-entrypoint.md) | `mcp_server/server.py` (registro de tools + arranque) | Sandro | 1.5 h | A-026, A-027, A-028, A-029, A-030, A-031 |

### Bloque 6 · Testing (Día 6–7)

| # | Tarea | Owner | Esfuerzo | Bloqueada por |
|---|-------|-------|----------|----------------|
| [A-033](./A-033-tests-blockchain-client.md) | Tests `blockchain_client` con mocks | Gabriel | 2 h | A-012 |
| [A-034](./A-034-tests-api-integration.md) | Tests integration API (httpx + AsyncClient) | Gabriel | 2.5 h | A-021 |
| [A-035](./A-035-tests-hermes.md) | Tests Hermes (reporter con fixtures LLM) | Gabriel | 2 h | A-024 |
| [A-036](./A-036-tests-mcp-tools.md) | Tests MCP tools | Gabriel | 1.5 h | A-032 |
| [A-037](./A-037-tests-e2e-fullstack.md) | E2E fullstack: API → blockchain (hardhat local) | Gabriel + Sandro | 2 h | A-034, B-014 |

### Bloque 7 · Seguridad y entrega (Día 7)

| # | Tarea | Owner | Esfuerzo | Bloqueada por |
|---|-------|-------|----------|----------------|
| [A-038](./A-038-pre-commit-gitleaks.md) | Pre-commit hook (`gitleaks`, `ruff`, `mypy`) | Tatiana | 1 h | A-001 |
| [A-039](./A-039-no-pii-tests.md) | Tests aserción: respuestas NO incluyen DNI ni PII | Tatiana + Gabriel | 1 h | A-014 |
| [A-040](./A-040-demo-script-grabacion.md) | Demo script + grabación final | Eduardo | 2 h | A-037, B-020 |

## Estructura de cada tarea

Cada `A-XXX-*.md` sigue la plantilla [`_PLANTILLA_TAREA.md`](./_PLANTILLA_TAREA.md):

1. Front matter (id, owner, esfuerzo, prioridad, dependencias).
2. **Por qué importa** — contexto del producto.
3. **Conceptos clave** — glosario.
4. **Pre-requisitos** — qué tener listo.
5. **Paso a paso** — tutorial detallado.
6. **Snippets de código** — copy-paste seguro.
7. **Verificación / DoD** — comandos para confirmar.
8. **Errores comunes** — qué hacer cuando algo falla.
9. **Lecturas** — links a docs y skills relacionadas.

## Documentos de referencia

- [`agents/README.md`](../README.md) — overview + endpoints + tools MCP.
- [`agents/hermes/soul/SOUL.md`](../hermes/soul/SOUL.md) — identidad de Hermes.
- [`agents/hermes/soul/INSTINCT.md`](../hermes/soul/INSTINCT.md) — reflejos por defecto.
- [`agents/hermes/PLAN.md`](../hermes/PLAN.md) — sprint actual.
- [`agents/hermes/VISION.md`](../hermes/VISION.md) — North star a 2030.
- [`docs/sprints/sprint1.md`](../../docs/sprints/sprint1.md) — DoD y plan.
- [`docs/architecture/sprint1-overview.md`](../../docs/architecture/sprint1-overview.md) — flujo E2E.
- [`docs/security/threat-model-sprint1.md`](../../docs/security/threat-model-sprint1.md) — amenazas.
- [`blockchain/docs/README.md`](../../blockchain/docs/README.md) — contrapartida blockchain.

> **Recordatorio crítico de privacidad:** El DNI **nunca** se loguea, persiste, retorna o pasa a Hermes. La API recibe DNI, calcula `keccak256(dni||nombre_normalizado||PUBLIC_SALT)` y lo descarta en el mismo request handler. Cualquier path donde quede el DNI vivo = bug bloqueante.
