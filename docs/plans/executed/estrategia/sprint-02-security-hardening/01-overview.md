# Overview — por qué este sprint

## Origen

Tatiana Portillo (rol: Documentación & Cyber-seguridad del equipo PoB-UCV 2026) realizó una **evaluación integral de amenazas** sobre CivicSys Sprint 1 y entregó:

- Documento DOCX: `CivicSys-Auditoria-Ciberseguridad.docx`, v0.1.0, Mayo 2026.
- Marco: NIST CSF 2.0 · NIST SP 800-53 Rev.5 · ISO/IEC 27001:2022 · ISO/IEC 23894:2023 · NIST AI RMF 1.0 · OWASP SC Top 10.
- Estado declarado: "HALLAZGOS CRÍTICOS IDENTIFICADOS — Acción inmediata requerida".

En su mensaje al equipo (2026-05-23), Tatiana confirma que ya revisó los cambios recientes de Orlando (contratos con tests/coverage, viem real reemplazando el mock, FastAPI + Hermes, CI), y que algunas observaciones bajaron de severidad. Pide que el equipo se enfoque en las **9 vulnerabilidades priorizadas (pp. 20-21)**, mencionando que la **3ª ya quedó corregida** y la **6ª y 9ª están parcialmente mitigadas**.

## Por qué responder ahora

CivicSys es un sistema de **supervisión ciudadana** con datos de identidad (DNI peruano) y votación consultiva. El daño reputacional de una deanonimización del padrón o de un reporte fraudulento es mayor que el de la mayoría de bugs funcionales. La auditoría llegó **antes** de cualquier despliegue público (Sprint 1 corrió localmente y en zkTanenbaum Testnet), lo cual es la ventana correcta.

Las 9 vulnerabilidades priorizadas tienen estas características comunes:

1. **Detectables desde código actual** — no requieren penetration testing en runtime.
2. **Mitigables con cambios localizados** — no implican refactor arquitectural global.
3. **Esfuerzo bajo-medio** — la mayoría se cierran con cambios de configuración + algunas líneas de defensa en código.

## Cómo se conecta con Sprint 1

Sprint 1 cerró 10/12 bloques (E2E quedó deferido). El devlog `2026-05-21-sprint1-mvp.md` documenta el estado: 89 tests verdes, coverage cross-stack >80%, viem real sustituyendo mock, dos backends (Node BFF de lectura + Python Hermes de escritura LLM).

Sprint 02 **no agrega features de producto**. Es un sprint puramente de **hardening**. Cualquier feature de producto (subagentes especializados, bot Telegram, dashboard avanzado) se difiere a Sprint 3+.

## Relación con el principio rector

> "La IA asesora. El ciudadano supervisa. El blockchain firma. Hermes orquesta — y todo queda trazable."

La trazabilidad **requiere integridad**. Una de las premisas filosóficas del proyecto — que la ciudadanía pueda auditar el sistema — es violable si:

- El `citizen_id` no es seudónimo real (HC-01).
- Los reportes se pueden alterar sin huella (HC-05).
- El LLM puede ser dirigido por contenido on-chain malicioso (AI-PI-01).

Cerrar estas vulnerabilidades **es** trabajo de producto en términos del principio rector, aunque no agregue features visibles al ciudadano.

## Restricciones del sprint

- **AEGIS v2.1.0**: todo en consola, sin sub-agentes. Una sola sesión Claude (o varias secuenciales del mismo orquestador).
- **Gate humano 1** después del plan táctico.
- **Gate humano 2** antes del state-sync.
- **Reglas del repo** (de `CLAUDE.md` de Orlando):
  - `pnpm` (no `npm`).
  - Tests obligatorios para cualquier cambio de comportamiento.
  - Coverage gates ya existentes en CI no deben caer (80% cross-stack).
  - El `.docx` final va a `docs/security/`.

## Output mínimo del sprint

1. **Documentación**: `docs/security/` poblado con SECURITY.md, política MCP, known-limitations.md, copia del docx.
2. **Configuración**: `.env.example` rotado en los 3 archivos, `.gitignore` validado, salt nuevo generado en `.env` local (no commiteado).
3. **Código**: sanitización de prompt en `reporter.py`, HMAC para integridad de reportes (cuando se persistan), failover RPC en client Python, UI warning de voto.
4. **Tests**: suite de payloads de prompt injection, tests de HMAC, tests de failover RPC, regression para sanitización.
5. **Tooling**: slither pasado sobre contratos, findings documentados.
6. **ADRs**: 5 ADRs (uno por decisión técnica abierta).
7. **Devlog**: `docs/devlogs/2026-05-23-sprint02-security-hardening.md` con detalle de cambios + tabla de uso/costo.
