# docs/ — índice navegable

## Planificación (AEGIS)

### Estrategia

- [`plans/executed/estrategia/sprint-02-security-hardening/00-INDEX.md`](plans/executed/estrategia/sprint-02-security-hardening/00-INDEX.md) — Sprint 02 Security Hardening, plan macro.

### Arquitectura — ADRs

- [`plans/executed/arquitectura/ADR-001-salt-strategy.md`](plans/executed/arquitectura/ADR-001-salt-strategy.md) — Estrategia de hash del ciudadano.
- [`plans/executed/arquitectura/ADR-002-audit-log-l1.md`](plans/executed/arquitectura/ADR-002-audit-log-l1.md) — Anclaje L1 de integridad de reportes.
- [`plans/executed/arquitectura/ADR-003-rpc-fallback.md`](plans/executed/arquitectura/ADR-003-rpc-fallback.md) — RPC fallback simple.
- [`plans/executed/arquitectura/ADR-004-mcp-server-policy.md`](plans/executed/arquitectura/ADR-004-mcp-server-policy.md) — Política MCP Server.
- [`plans/executed/arquitectura/ADR-005-prompt-injection-defense.md`](plans/executed/arquitectura/ADR-005-prompt-injection-defense.md) — Defensa prompt injection.
- [`plans/executed/arquitectura/ADR-006-soulbound-identity.md`](plans/executed/arquitectura/ADR-006-soulbound-identity.md) — Identidad soulbound «Cédula Cívica» (ERC-5192 + burn).
- [`plans/executed/arquitectura/ADR-007-noncustodial-wallet-keystore.md`](plans/executed/arquitectura/ADR-007-noncustodial-wallet-keystore.md) — Wallet no-custodial + cifrado PBKDF2/AES-GCM.
- [`plans/executed/arquitectura/ADR-008-face-dedupe-offchain.md`](plans/executed/arquitectura/ADR-008-face-dedupe-offchain.md) — Dedupe facial off-chain (cosine + umbral).
- [`plans/executed/arquitectura/ADR-009-anonymous-vote-nullifier.md`](plans/executed/arquitectura/ADR-009-anonymous-vote-nullifier.md) — Votación anónima por nullifier (esqueleto Sprint 04).

### Táctica

- [`plans/executed/tactica/sprint-02-security-hardening/00-INDEX.md`](plans/executed/tactica/sprint-02-security-hardening/00-INDEX.md) — Sprint 02, 20 tareas atómicas.
- [`plans/executed/tactica/sprint-03-identidad-soberana/00-PLAN.md`](plans/executed/tactica/sprint-03-identidad-soberana/00-PLAN.md) — Sprint 03 Identidad Soberana «Cédula Cívica».
- [`plans/tactica/sprint1-mvp/00-INDEX.md`](plans/tactica/sprint1-mvp/00-INDEX.md) — Sprint 1 MVP (cerrado).

### Planes archivados / executed

- [`plans/archivado/sprint2-antipereza-alertas/README.md`](plans/archivado/sprint2-antipereza-alertas/README.md) — Sprint 2 alertas/sentry archivado (no aplica al producto actual).

## Devlogs

- [`aegis/devlogs/2026-05-21-sprint1-mvp.md`](aegis/devlogs/2026-05-21-sprint1-mvp.md) — Sprint 1 MVP cierre.
- `devlogs/2026-05-23-sprint02-security-hardening.md` — Sprint 02 Security Hardening (creado en state-sync).
- [`devlogs/2026-05-30-sprint03-identidad-cedula-civica.md`](devlogs/2026-05-30-sprint03-identidad-cedula-civica.md) — Sprint 03 Identidad Soberana «Cédula Cívica».

## Seguridad

- [`security/README.md`](security/README.md) — índice de seguridad.
- [`security/CivicSys-Auditoria-Ciberseguridad.docx`](security/CivicSys-Auditoria-Ciberseguridad.docx) — auditoría de Tatiana Portillo (Mayo 2026, v0.1.0).
- [`security/SECURITY.md`](security/SECURITY.md) — política pública de divulgación responsable.
- [`security/threat-model.md`](security/threat-model.md) — modelo de amenaza vigente.
- [`security/known-limitations.md`](security/known-limitations.md) — limitaciones aceptadas + plan futuro.
- [`security/mcp-policy.md`](security/mcp-policy.md) — política MCP Server (vinculante).
- [`security/runbook-rotacion-salt.md`](security/runbook-rotacion-salt.md) — procedimiento de rotación de `PUBLIC_SALT`.
- [`security/audit-scope.md`](security/audit-scope.md) — RFP de auditoría externa profesional.
- [`security/sast-findings.md`](security/sast-findings.md) — output slither/solhint + findings.
- [`security/2026-05-30-sprint03-mnema-audit.md`](security/2026-05-30-sprint03-mnema-audit.md) — auditoría MNEMA Sprint 03 (4 auditores adversarios + veredicto; fixes vs. limitaciones aceptadas).

## Specs / superpowers

- [`superpowers/specs/2026-05-21-ssc-antipereza-sprint1-design.md`](superpowers/specs/2026-05-21-ssc-antipereza-sprint1-design.md) — diseño Sprint 1 vía superpowers.

## Otros

- [`testing-localhost.md`](testing-localhost.md) — guía para levantar el stack local.
- [`testing-cedula-civica.md`](testing-cedula-civica.md) — guía e2e del registro Cédula Cívica (Sprint 03).

## Cómo se mantiene este índice

Cada vez que se cree un plan nuevo, ADR, devlog o doc de seguridad → agregar entrada acá. Cada cierre AEGIS deja una línea nueva en la sección "Devlogs". Si una entrada queda obsoleta, marcarla con `(deprecated)` antes de eliminarla.
