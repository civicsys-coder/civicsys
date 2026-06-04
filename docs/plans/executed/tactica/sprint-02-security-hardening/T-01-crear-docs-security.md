# T-01 — Crear `docs/security/`

**Prio**: infra · **Bloqueada por**: ninguna · **ADR**: —

## Qué hacer

Crear directorio `docs/security/` con los siguientes archivos base:

- `README.md` — índice de seguridad del repo, links a todos los demás docs.
- `SECURITY.md` — política de divulgación (canal de reporte, scope, SLA, PGP opcional).
- `threat-model.md` — modelo de amenaza Sprint 02 (sintetiza estrategia 03).
- `known-limitations.md` — limitaciones aceptadas con plan de mitigación futura.
- `audit-scope.md` — RFP para auditoría externa post-MVP.

Contenido detallado:
- `README.md`: tabla con archivos del directorio, descripción 1 frase, plus referencia a la auditoría de Tatiana.
- `SECURITY.md`: usar template GitHub estándar; reporte a `security@civicsys.org` (placeholder) o equivalente; SLA: ack 48h, fix critical 1 semana.
- `threat-model.md`: copiar tabla de actores y vectores S1-S7 del `docs/plans/estrategia/.../03-actores-flujos-superficie.md`.
- `known-limitations.md`: copiar tabla D-01..D-10 del `04-mitigaciones-y-deuda-aceptada.md` + entry específica para HC-03/SC-04 votos visibles.
- `audit-scope.md`: scope, methodology requested (slither + manual review + zkStack-specific), entregables, timeline esperado.

## Criterio de done

- [ ] `ls docs/security/` lista los 5 archivos `.md`.
- [ ] Ningún archivo tiene TODOs.
- [ ] El README enlaza a todos los demás.

## Comando de verificación

```bash
ls docs/security/
test -f docs/security/README.md && test -f docs/security/SECURITY.md && test -f docs/security/threat-model.md && test -f docs/security/known-limitations.md && test -f docs/security/audit-scope.md && echo OK
```
