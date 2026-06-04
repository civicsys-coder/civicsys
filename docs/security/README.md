# Seguridad — CivicSys

Documentación de seguridad del Sistema de Supervisión Ciudadana Antipereza.

## Origen

Esta carpeta nace tras la auditoría integral de amenazas realizada por **Tatiana Portillo** (Documentación & Cyber-seguridad del equipo PoB-UCV 2026) sobre CivicSys Sprint 1.

## Contenido

| Archivo | Para qué sirve |
|---|---|
| [`CivicSys-Auditoria-Ciberseguridad.docx`](./CivicSys-Auditoria-Ciberseguridad.docx) | Auditoría original de Tatiana (Mayo 2026, v0.1.0). Fuente de verdad. |
| [`SECURITY.md`](./SECURITY.md) | Política pública de divulgación responsable (cómo reportar una vulnerabilidad). |
| [`threat-model.md`](./threat-model.md) | Modelo de amenaza Sprint 02 — actores, flujos, vectores. |
| [`known-limitations.md`](./known-limitations.md) | Limitaciones aceptadas con plan de mitigación futura. |
| [`mcp-policy.md`](./mcp-policy.md) | Política obligatoria para implementaciones del MCP Server (ADR-004). |
| [`runbook-rotacion-salt.md`](./runbook-rotacion-salt.md) | Pasos para rotar `PUBLIC_SALT` en producción. |
| [`audit-scope.md`](./audit-scope.md) | RFP de auditoría externa profesional post-MVP. |
| [`sast-findings.md`](./sast-findings.md) | Output de slither/solhint sobre los contratos + findings. |

## Cómo se mantiene

- **Auditoría DOCX**: cuando Tatiana suba una versión revisada, se sobrescribe el archivo y se anota fecha aquí.
- **Threat-model y known-limitations**: vivos. Se actualizan en cada sprint con cambios de superficie.
- **ADRs de seguridad**: viven en `docs/plans/arquitectura/` (no acá) — esta carpeta linkea cuando aplique.

## Referencias internas

- Plan estratégico Sprint 02: [`docs/plans/executed/estrategia/sprint-02-security-hardening/00-INDEX.md`](../plans/executed/estrategia/sprint-02-security-hardening/00-INDEX.md)
- ADRs de seguridad: [`docs/plans/executed/arquitectura/ADR-001..005`](../plans/arquitectura/)
- Devlog del sprint de hardening: `docs/devlogs/2026-05-23-sprint02-security-hardening.md` (creado al cierre).

## Última actualización

2026-05-23 — Sprint 02 Security Hardening (inicio).
