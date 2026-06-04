# archivado/sprint2-antipereza-alertas/

Tareas del PR #2 (Sandro · 2026-05-20) que describen un producto distinto al
SSC ANTIPEREZA del PPT oficial.

## Contexto

El PR #2 mezcló dos conceptos:
- "Antipereza alertas" — alertas ciudadanas + nodos sentry + mapa Leaflet
- SSC ANTIPEREZA original (cámara cívica + voto consultivo + Hermes)

La PPT `SSC_ANTIPEREZA_Project_Speech_v3.pptx` (18 slides) define el segundo.
El primero quedó fuera de scope para Sprint 1 MVP del hackathon.

## Qué archivamos acá

- `backend/B-016 a B-031` (16 tareas) — servicios + rutas REST para alertas, sentry nodes, auditoría.
- `frontend/F-026 a F-050` (25 tareas) — componentes UI para alertas, mapa, hash verifier, sensor badges.

## Por qué no borrar

1. **Auditabilidad AEGIS** — el plan original está preservado.
2. **Fork futuro** — si el equipo decide en post-hackathon revisitar el concepto alertas como producto separado, las tareas siguen ahí.
3. **Crédito al trabajo de Sandro** — el plan fue cuidadoso (descripción + DoD + lecturas por cada tarea); no se descarta, se archiva.

## Cómo restaurar

```bash
git mv docs/plans/archivado/sprint2-antipereza-alertas/backend/B-*.md backend/docs/
git mv docs/plans/archivado/sprint2-antipereza-alertas/frontend/F-*.md frontend/docs/
```

## Decisión de no implementar Sprint 1 — quién y cuándo

- Fecha: 2026-05-21
- Decisión tomada en sesión brainstorming con spec aprobada `2026-05-21-ssc-antipereza-sprint1-design.md`.
- Aprobada por: Orlando Vázquez (owner del proyecto).
