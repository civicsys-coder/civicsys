# Sprint 02 — Security Hardening · Plan Táctico

**Fecha**: 2026-05-23
**Plan estratégico**: `docs/plans/executed/estrategia/sprint-02-security-hardening/`
**ADRs**: `docs/plans/executed/arquitectura/ADR-001..005`
**Gate humano 1**: revisión + aprobación de este plan antes de Ejecución.

## Lista de tareas atómicas

| ID | Título | Prio | ADR | Bloqueada por | Archivos esperados |
|---|---|---|---|---|---|
| T-01 | Crear `docs/security/` con SECURITY.md + threat-model.md + known-limitations.md + audit-scope.md + README | infra | — | — | `docs/security/*.md` |
| T-02 | Copiar `CivicSys-Auditoria-Ciberseguridad.docx` a `docs/security/` | infra | — | T-01 | `docs/security/CivicSys-Auditoria-Ciberseguridad.docx` |
| T-03 | Escribir `docs/security/mcp-policy.md` (transcripción de ADR-004) | P0 | ADR-004 | T-01 | `docs/security/mcp-policy.md`, `agents/mcp_server/README.md` |
| T-04 | Rotar `PUBLIC_SALT` en los 3 `.env.example` + comentarios + `docs/security/runbook-rotacion-salt.md` | P0 | ADR-001 | T-01 | `.env.example`, `blockchain/.env.example`, `agents/.env.example`, `docs/security/runbook-rotacion-salt.md` |
| T-05 | Actualizar tests Python que dependen del literal `ssc-antipereza-2026-publico` | P0 | ADR-001 | T-04 | `agents/tests/test_helpers.py` (modificación) |
| T-06 | Limpiar `SIGNER_PRIVATE_KEY` y `LLM_BASE_URL` de `agents/.env.example` + documentar | P1 | — | T-04 (mismo archivo) | `agents/.env.example`, `agents/README.md` |
| T-07 | Implementar `sanitize_untrusted` en `agents/app/security.py` | P1 | ADR-005 | — | `agents/app/security.py` (nuevo) |
| T-08 | Tests de prompt injection (≥10 payloads) | P1 | ADR-005 | T-07 | `agents/tests/test_security.py` (nuevo) |
| T-09 | Integrar `sanitize_untrusted` en `reporter._build_prompt` + delimitadores | P1 | ADR-005 | T-07 | `agents/app/reporter.py` (modificación) |
| T-10 | Implementar HMAC en `agents/app/security.py` (compute/verify) | P1 | ADR-002 | T-07 (mismo archivo) | `agents/app/security.py` |
| T-11 | Tests HMAC (roundtrip, detect mutation, wrong key) | P1 | ADR-002 | T-10 | `agents/tests/test_security.py` (mismo archivo nuevo) |
| T-12 | Añadir `rpc_fallback` a `Settings` + helper `make_rpc_provider` | P1 | ADR-003 | — | `agents/app/settings.py`, `agents/app/rpc.py` (nuevo) |
| T-13 | Tests RPC fallback (con respx mock) | P1 | ADR-003 | T-12 | `agents/tests/test_rpc.py` (nuevo) |
| T-14 | UI warning en página de voto del frontend + link a known-limitations | P2 | — | T-01 | `frontend/civicsys/src/.../VoteWarning.tsx`, integración en vote page |
| T-15 | Test del componente VoteWarning | P2 | — | T-14 | `frontend/civicsys/src/.../VoteWarning.test.tsx` |
| T-16 | Correr slither + solhint sobre contratos + documentar findings | P2 | — | T-01 | `docs/security/sast-findings.md`, script en `blockchain/scripts/scan.sh` (opcional) |
| T-17 | Actualizar `docs/INDEX.md` con referencias a `docs/security/` y devlog | infra | — | T-01..T-16 | `docs/INDEX.md` |
| T-18 | Actualizar `CLAUDE.md` del repo con info de seguridad y ubicación del salt | infra | — | T-01..T-16 | `CLAUDE.md` |
| T-19 | Crear `.pre-commit-config.yaml` con gitleaks (config — no instalar) | infra | — | — | `.pre-commit-config.yaml` |
| T-20 | Verificación cross-stack final: `pnpm test`, `pytest`, coverage gates | guardrails | — | T-01..T-19 | (sin nuevos archivos) |

## Dependencias visualizadas

```
T-01 (docs/security/) ── base
  ├── T-02 (copy docx)
  ├── T-03 (mcp-policy)
  ├── T-04 (rotar salt) ─── T-05 (update tests)
  │                    └── T-06 (cleanup env)
  ├── T-14 (UI warning)
  └── T-16 (slither)

T-07 (sanitize_untrusted) ── T-08 (tests injection)
                          └── T-09 (integrar reporter)
                          └── T-10 (HMAC) ── T-11 (tests HMAC)

T-12 (rpc fallback) ── T-13 (tests rpc)

T-14 ── T-15 (component test)

T-01..T-16 ── T-17 (INDEX) + T-18 (CLAUDE.md)
T-20 (verificación final) ── todos
```

## Estrategia de ejecución

1. **Orden recomendado**: T-01 → T-02 → T-03 → T-07 → T-04 → T-05 → T-06 → T-09 → T-08 → T-10 → T-11 → T-12 → T-13 → T-14 → T-15 → T-16 → T-17 → T-18 → T-19 → T-20.
2. **Paralelismo posible**: T-03 (MCP doc), T-07 (security.py base), T-12 (rpc) son independientes y pueden alternarse.
3. **TDD por defecto**: para T-08, T-11, T-13, T-15 escribir test ANTES de cambiar la implementación.
4. **Commit frequency**: 1 commit por tarea atómica completada (cuando aplique código + test verde).

## Detalle de cada tarea

Cada tarea tiene archivo propio:

| Archivo | ID |
|---|---|
| `T-01-crear-docs-security.md` | T-01 |
| `T-02-copy-auditoria-docx.md` | T-02 |
| `T-03-mcp-policy.md` | T-03 |
| `T-04-rotar-public-salt.md` | T-04 |
| `T-05-actualizar-tests-helpers.md` | T-05 |
| `T-06-cleanup-env-example.md` | T-06 |
| `T-07-sanitize-untrusted.md` | T-07 |
| `T-08-tests-prompt-injection.md` | T-08 |
| `T-09-integrar-sanitize-en-reporter.md` | T-09 |
| `T-10-hmac-helpers.md` | T-10 |
| `T-11-tests-hmac.md` | T-11 |
| `T-12-rpc-fallback.md` | T-12 |
| `T-13-tests-rpc-fallback.md` | T-13 |
| `T-14-ui-vote-warning.md` | T-14 |
| `T-15-test-ui-vote-warning.md` | T-15 |
| `T-16-slither-solhint.md` | T-16 |
| `T-17-update-index.md` | T-17 |
| `T-18-update-claudemd.md` | T-18 |
| `T-19-precommit-gitleaks.md` | T-19 |
| `T-20-verificacion-final.md` | T-20 |

(En este sprint, dado que muchas tareas son cortas y la profundidad ya está en los ADRs, los archivos T-*.md individuales son breves: 1-2 párrafos + comando(s) + criterio de done.)
