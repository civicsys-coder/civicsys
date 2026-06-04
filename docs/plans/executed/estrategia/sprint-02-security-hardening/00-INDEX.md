# Sprint 02 — Security Hardening · Plan Estratégico

**Fecha**: 2026-05-23
**Origen**: Auditoría de Tatiana Portillo (`docs/security/CivicSys-Auditoria-Ciberseguridad.docx`, v0.1.0, Mayo 2026)
**Sprint anterior**: `docs/aegis/devlogs/2026-05-21-sprint1-mvp.md` (Sprint 1 MVP cerrado)
**Protocolo**: AEGIS v2.1.0 — todo en consola, sin sub-agentes
**Gate 1**: revisión humana del plan táctico antes de Ejecución
**Gate 2**: aprobación humana del cierre antes de State-Sync

## Documentos del plan estratégico

| Archivo | Contenido |
|---|---|
| `00-INDEX.md` | (este archivo) — índice navegable |
| `01-overview.md` | Por qué este sprint, contexto, narrativa |
| `02-alcance-9-vulnerabilidades.md` | Las 9 priorizadas (pp. 20-21 del docx), estado real vs auditoría |
| `03-actores-flujos-superficie.md` | Quién toca qué, dónde están los vectores de ataque hoy |
| `04-mitigaciones-y-deuda-aceptada.md` | Qué se cierra Sprint 2, qué queda diferido y por qué |
| `05-decisiones-abiertas-para-arquitecto.md` | 5 decisiones técnicas → 5 ADRs |
| `06-criterios-de-aceptacion.md` | Cómo se verifica que cada vulnerabilidad quedó mitigada |

## Resumen ejecutivo (≤150 palabras)

Sprint 02 — Security Hardening responde directamente a la auditoría de ciberseguridad de Tatiana sobre CivicSys Sprint 1. Tatiana priorizó **9 vulnerabilidades** (pp. 20-21 del documento DOCX); de esas, **1 ya está cerrada** (SC-07: mock TypeScript reemplazado por viem real en Bloque E de Sprint 1) y **2 están parcialmente mitigadas** (AI-BC-01 RPC tiene `RPC_FALLBACK` declarado pero no implementado; auditoría externa de contratos está parcialmente cubierta por tests al 100% statements). Las **6 restantes** se atacan en este sprint: rotación de `PUBLIC_SALT` (HC-01/SC-05), política de seguridad para MCP Server aún no implementado (AI-PI-02), limpieza del signer custodial inactivo (HC-02), anclaje HMAC + AuditLog.sol opcional para integridad de reportes (HC-05), failover RPC (AI-BC-01), sanitización de prompts en `reporter.py` (AI-PI-01), advertencia UI sobre visibilidad de voto (HC-03/SC-04) y barrido SAST con slither (parcial de SC-01/02/03).

## Estado vs auditoría — síntesis

| # | Vuln. priorizada | Sev | Estado real Mayo 2026 | Acción Sprint 02 |
|---|------------------|-----|----------------------|------------------|
| 1 | HC-01 + SC-05 — `PUBLIC_SALT` hardcoded | P0 | **Abierto** (3 archivos `.env.example`, repo público MIT) | Rotar + mover a `.env`, actualizar tests, doc |
| 2 | AI-PI-02 — MCP Server sin auth | P0 | **Latente** (dir `agents/mcp_server/` vacío) | Documentar política antes de implementar tools |
| 3 | SC-07 — Mock TS stub | P0 | **CERRADO** (Bloque E sprint1 — viem real, sin private keys backend) | Verificar y dejar nota |
| 4 | HC-02 + AI-MI-01/02 — Signer custodial | P1 | **No aplica runtime** (`SIGNER_PRIVATE_KEY` solo en `.env.example`, no cargado por `Settings`) | Limpiar `.env.example`, doc multisig para Sprint 3 |
| 5 | HC-05 — Reportes sin anclaje L1 | P1 | **Abierto** (in-memory, no persisten aún) | HMAC + diseño AuditLog.sol (ADR) |
| 6 | AI-BC-01 — RPC único | P1 | **Parcial** (`RPC_FALLBACK` declarativo) | Failover real en client Python |
| 7 | AI-PI-01 — Prompt injection | P1 | **Abierto** (`reporter._build_prompt` sin sanitización) | Sanitize + delimitadores + test suite |
| 8 | HC-03 + SC-04 — Votos en calldata | P2 | **Abierto por diseño Sprint 1** | UI warning + doc known-limitations |
| 9 | SC-01/02/03/BC-BR-01 — Auditoría externa | P2 | **Parcial** (tests 100% statements/96.88% branches) | Slither + RFP auditoría externa |

## Lo que NO está en alcance Sprint 02

Citado por Tatiana en el documento pero **fuera de scope** de este sprint:

- Implementación de **multisig real** (Gnosis Safe / zkStack multisig) — sólo se documenta como ADR para Sprint 3+.
- **AuditLog.sol on-chain**: si el ADR-002 concluye que es viable, se implementa; sino, sólo HMAC off-chain queda en Sprint 02.
- **Commit-reveal voting**: contrato para Sprint 3 (sólo warning UI ahora).
- **Verificación formal del circuito ZK PLONK**: dependencia externa, no del equipo.
- **HSM / AWS Nitro Enclaves**: producción VPS, no Sprint 02.
- **AI Risk Register formalizado** como entregable independiente (se incorpora como sección en `docs/security/`).
- **Política PIA y SECURITY.md**: se crea SECURITY.md mínimo, PIA completa post-Sprint.

Justificación: el documento de Tatiana mismo dice "**podemos enfocarnos principalmente en las 9 vulnerabilidades priorizadas, nada más (págs. 20-21)**". Las 9 se respetan; lo no priorizado se difiere documentadamente.

## Tags y referencias

- Auditoría origen: `docs/security/CivicSys-Auditoria-Ciberseguridad.docx` (copia a guardar acá)
- Auditor: Tatiana Portillo
- Branch destino: continuar en `feat/sprint1-mvp` o crear `feat/sprint2-security`
- PR final: cuando Sprint 02 quede aprobado por humano, merge a `main`
