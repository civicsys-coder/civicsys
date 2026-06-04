# T-17 — Actualizar `docs/INDEX.md` con referencias al Sprint 02

**Prio**: infra · **Bloqueada por**: T-01..T-16 · **ADR**: —

## Qué hacer

Verificar si existe `docs/INDEX.md`. Si no:

1. Crear `docs/INDEX.md` con índice navegable de toda la documentación del repo:
   - Planes (`docs/plans/`)
   - Devlogs (`docs/devlogs/` y `docs/aegis/devlogs/`)
   - Seguridad (`docs/security/`)
   - Otros (`docs/testing-localhost.md`, etc.)

2. Si ya existe: añadir entradas para:
   - `docs/security/README.md` (índice de seguridad)
   - `docs/security/CivicSys-Auditoria-Ciberseguridad.docx` (auditoría Tatiana)
   - Plan estratégico Sprint 02: `docs/plans/executed/estrategia/sprint-02-security-hardening/00-INDEX.md`
   - ADRs 001-005 en `docs/plans/arquitectura/`
   - Plan táctico Sprint 02: `docs/plans/executed/tactica/sprint-02-security-hardening/00-INDEX.md`
   - Devlog Sprint 02: `docs/devlogs/2026-05-23-sprint02-security-hardening.md` (creado en T-20 state-sync)

## Criterio de done

- [ ] `docs/INDEX.md` existe.
- [ ] Lista todas las nuevas entradas.
- [ ] Links relativos correctos (probar uno o dos manualmente).

## Comando de verificación

```bash
test -f docs/INDEX.md && grep -q "sprint-02-security-hardening" docs/INDEX.md && echo OK
```
