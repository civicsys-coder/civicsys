# `blockchain/docs/` — Tareas atómicas del Sprint 1 (capa blockchain)

> Este directorio contiene **tareas atómicas tipo tutorial** pensadas para que el equipo de hackathon (incluyendo perfiles junior) pueda tomar una tarea, leerla de principio a fin, y completarla sin necesidad de contexto externo más allá de lo enlazado.

## Cómo usar este directorio

1. Mirá el [Tablero (orden de ejecución)](#tablero-orden-de-ejecución) más abajo.
2. Elegí una tarea **B-XXX** cuyas dependencias estén `done` o que sean `none`.
3. Abrila — tiene la estructura: *contexto · conceptos · pasos · verificación · errores comunes*.
4. Marcala como `in_progress` en el daily, hacé commit por archivo cuando termines.
5. Antes de cerrarla, corré la sección **Verificación / Definition of Done** y pegá la salida en el PR.

> Convención: una tarea = un PR pequeño. Si una tarea se está volviendo enorme, partila — abrí una nueva `B-XXXa`, `B-XXXb`.

## Glosario de roles

| Rol | Owner principal | Backup |
|-----|-----------------|--------|
| Smart contract dev | **Orlando** | Sandro (pair) |
| QA / Testing | **Gabriel** | Tatiana |
| DevOps / Deploy | **Orlando** | Sandro |
| Documentación | **Tatiana** | Eduardo |

## Tablero (orden de ejecución)

Las dependencias se leen así: `B-002 ← B-001` significa "B-002 está bloqueada por B-001".

### Bloque 0 · Setup (Día 4, mañana)

| # | Tarea | Owner | Esfuerzo | Bloqueada por |
|---|-------|-------|----------|----------------|
| [B-001](./B-001-setup-hardhat-typescript.md) | Inicializar proyecto Hardhat + TypeScript | Orlando + junior | 1 h | — |
| [B-002](./B-002-hardhat-config-zktanenbaum.md) | Configurar `hardhat.config.ts` con red zkTanenbaum | Orlando | 45 min | B-001 |
| [B-003](./B-003-env-y-gitignore.md) | `.env` + `.gitignore` seguros (sin claves) | Tatiana | 30 min | B-001 |

### Bloque 1 · Contratos (Día 4 tarde – Día 5)

| # | Tarea | Owner | Esfuerzo | Bloqueada por |
|---|-------|-------|----------|----------------|
| [B-004](./B-004-interface-icitizenregistry.md) | Interface `ICitizenRegistry.sol` | junior + Orlando | 30 min | B-001 |
| [B-005](./B-005-impl-citizenregistry.md) | Implementar `CitizenRegistry.sol` | Orlando | 1.5 h | B-004 |
| [B-006](./B-006-interface-ivote.md) | Interface `IVote.sol` | junior + Orlando | 30 min | B-001 |
| [B-007](./B-007-impl-vote-create-proposal.md) | `Vote.sol` — `createProposal` + storage | Orlando | 1 h | B-006 |
| [B-008](./B-008-impl-vote-cast-vote.md) | `Vote.sol` — `castVote` + invariantes | Orlando | 1 h | B-007, B-005 |
| [B-009](./B-009-impl-vote-tally-close.md) | `Vote.sol` — `tally` + `closeProposal` | Orlando | 45 min | B-008 |

### Bloque 2 · Tests (Día 5 – Día 6)

| # | Tarea | Owner | Esfuerzo | Bloqueada por |
|---|-------|-------|----------|----------------|
| [B-010](./B-010-tests-citizenregistry.md) | Tests unitarios `CitizenRegistry` | Gabriel | 1.5 h | B-005 |
| [B-011](./B-011-tests-vote-unit.md) | Tests unitarios `Vote` | Gabriel | 2 h | B-009 |
| [B-012](./B-012-tests-e2e.md) | Test E2E completo en hardhat local | Gabriel | 2 h | B-011 |
| [B-013](./B-013-cobertura-80.md) | Coverage ≥ 80 % + reporte | Gabriel | 45 min | B-012 |

### Bloque 3 · Deploy y operación (Día 6 – Día 7)

| # | Tarea | Owner | Esfuerzo | Bloqueada por |
|---|-------|-------|----------|----------------|
| [B-014](./B-014-script-deploy.md) | `scripts/deploy.ts` — deploy + escribir JSON | Orlando | 1.5 h | B-005, B-009 |
| [B-015](./B-015-script-deploy-copy-abis.md) | `scripts/deploy.ts` — copiar ABIs a `shared/abis/` | Orlando | 30 min | B-014 |
| [B-016](./B-016-script-seed-proposals.md) | `scripts/seed-proposals.ts` | Orlando + junior | 45 min | B-014 |
| [B-017](./B-017-script-verify.md) | `scripts/verify.ts` (verificar en explorer) | Orlando | 1 h | B-014 |
| [B-018](./B-018-solicitar-faucet-tsys.md) | Solicitar fondos TSYS (faucet / foundation) | Eduardo + Orlando | 30 min + espera | B-003 |
| [B-019](./B-019-deploy-zktanenbaum.md) | Deploy real en zkTanenbaum (57057) | Orlando | 1 h | B-014, B-018 |
| [B-020](./B-020-smoke-test-onchain.md) | Smoke test on-chain manual (curl + cast) | Gabriel + Orlando | 1 h | B-019 |

### Bloque 4 · Documentación de cierre

| # | Tarea | Owner | Esfuerzo | Bloqueada por |
|---|-------|-------|----------|----------------|
| [B-021](./B-021-readme-post-deploy.md) | Actualizar `blockchain/README.md` con direcciones reales | Tatiana | 30 min | B-019 |
| [B-022](./B-022-runbook-rollback.md) | Mini-runbook de rollback / redeploy | Tatiana + Orlando | 45 min | B-019 |

## Estructura de cada tarea

Cada archivo `B-XXX-*.md` sigue la plantilla [`_PLANTILLA_TAREA.md`](./_PLANTILLA_TAREA.md) con las secciones:

1. **Front matter** — id, owner, esfuerzo, prioridad, dependencias.
2. **Por qué importa** — contexto del producto.
3. **Conceptos clave** — glosario.
4. **Pre-requisitos** — qué tener listo.
5. **Paso a paso** — tutorial detallado.
6. **Snippets de código** — copy-paste seguro.
7. **Verificación / DoD** — comandos para confirmar.
8. **Errores comunes** — qué hacer cuando algo falla.
9. **Lecturas** — links a docs externos / ADRs.

## Documentos de referencia

- [`docs/sprints/sprint1.md`](../../docs/sprints/sprint1.md) — plan ejecutivo del sprint.
- [`docs/adr/0001-zkTanenbaum-as-target-chain.md`](../../docs/adr/0001-zkTanenbaum-as-target-chain.md) — por qué elegimos zkTanenbaum.
- [`docs/security/threat-model-sprint1.md`](../../docs/security/threat-model-sprint1.md) — amenazas y mitigaciones que tocan a esta capa.
- [`blockchain/README.md`](../README.md) — quick start y especificación de contratos.

> *Recordá:* DNI **nunca** se almacena en claro, solo `keccak256(dni || nombre_normalizado || PUBLIC_SALT)`.
