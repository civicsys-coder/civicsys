# Bloque J · Cleanup deuda Sprint 2 (producto equivocado)

**Objetivo**: Borrar las tareas `.md` que Sandro metió en PR #2 que describen el producto equivocado (alertas ciudadanas / sentry nodes / mapa Leaflet / hash verifier) — son del antiguo "Antipereza alertas" que no está en el PPT real. Mantener las task .md que sirven para Sprint 1+ (setup, viem, wagmi, UI base).

**Tareas**: 4
**LOC estimado**: 100 (mayormente eliminaciones)
**Dependencias**: Ninguna explícita — se puede correr en paralelo a otros bloques, pero recomendado al final para que las tareas docs queden de referencia mientras ejecutamos.
**Coverage gate**: no aplica.

---

## Task J.1 — Inventariar tareas a borrar

**Files**: ninguno (auditoría).

- [ ] **Step 1**: Listar tareas backend de alertas/sentry/auditoria

```bash
ls backend/docs/B-0{16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31}-*.md 2>&1
```

Expected: 16 archivos (alertas, sentry, auditoria, cache, rutas, middleware genéricos).

- [ ] **Step 2**: Listar tareas frontend de alertas/mapa/auditoria UI

```bash
ls frontend/docs/F-0{26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50}-*.md 2>&1
```

Expected: 25 archivos (Alerta*, Reporte form, Mapa, Auditoría table, Sensor*, Sistema*).

- [ ] **Step 3**: Decidir qué borrar vs preservar como referencia

| Carpeta | A borrar | A preservar |
|---|---|---|
| `backend/docs/` | B-016 a B-031 (alertas/sentry/auditoria + middleware específico de ese producto) | B-001 a B-015 (setup, viem clients) + B-032 a B-036 (middleware genérico cors/helmet/server) |
| `frontend/docs/` | F-026 a F-050 (Alerta*, Mapa, Auditoría, Sensor*, Reporte form de alertas) | F-001 a F-025 (setup, wallet, hooks generales) + F-051 a F-058 (UI base) |

> **Alternativa más conservadora**: en vez de borrar, mover a `docs/plans/archivado/sprint2-antipereza-alertas/`. Útil si Sandro o el equipo más adelante quiere retomar el producto alertas como un fork/spin-off. Sprint 1 lo recomienda — borrar es destructivo y AEGIS prefiere preservar para auditabilidad.

---

## Task J.2 — Mover (no borrar) tareas a `docs/plans/archivado/`

**Files**:
- Move: 16 + 25 = 41 archivos hacia `docs/plans/archivado/sprint2-antipereza-alertas/{backend,frontend}/`.

- [ ] **Step 1**: Crear destino

```bash
mkdir -p docs/plans/archivado/sprint2-antipereza-alertas/backend
mkdir -p docs/plans/archivado/sprint2-antipereza-alertas/frontend
```

- [ ] **Step 2**: Mover backend (con git mv para preservar historia)

```bash
for f in backend/docs/B-016-*.md \
         backend/docs/B-017-*.md \
         backend/docs/B-018-*.md \
         backend/docs/B-019-*.md \
         backend/docs/B-020-*.md \
         backend/docs/B-021-*.md \
         backend/docs/B-022-*.md \
         backend/docs/B-023-*.md \
         backend/docs/B-024-*.md \
         backend/docs/B-025-*.md \
         backend/docs/B-026-*.md \
         backend/docs/B-027-*.md \
         backend/docs/B-028-*.md \
         backend/docs/B-029-*.md \
         backend/docs/B-030-*.md \
         backend/docs/B-031-*.md; do
  git mv "$f" "docs/plans/archivado/sprint2-antipereza-alertas/backend/$(basename "$f")"
done
```

- [ ] **Step 3**: Mover frontend

```bash
for f in frontend/docs/F-026-*.md \
         frontend/docs/F-027-*.md \
         frontend/docs/F-028-*.md \
         frontend/docs/F-029-*.md \
         frontend/docs/F-030-*.md \
         frontend/docs/F-031-*.md \
         frontend/docs/F-032-*.md \
         frontend/docs/F-033-*.md \
         frontend/docs/F-034-*.md \
         frontend/docs/F-035-*.md \
         frontend/docs/F-036-*.md \
         frontend/docs/F-037-*.md \
         frontend/docs/F-038-*.md \
         frontend/docs/F-039-*.md \
         frontend/docs/F-040-*.md \
         frontend/docs/F-041-*.md \
         frontend/docs/F-042-*.md \
         frontend/docs/F-043-*.md \
         frontend/docs/F-044-*.md \
         frontend/docs/F-045-*.md \
         frontend/docs/F-046-*.md \
         frontend/docs/F-047-*.md \
         frontend/docs/F-048-*.md \
         frontend/docs/F-049-*.md \
         frontend/docs/F-050-*.md; do
  git mv "$f" "docs/plans/archivado/sprint2-antipereza-alertas/frontend/$(basename "$f")"
done
```

- [ ] **Step 4**: Verificar

```bash
ls backend/docs/ | wc -l   # debería bajar de 36 a 20
ls frontend/docs/ | wc -l  # debería bajar de 58 a 33
ls docs/plans/archivado/sprint2-antipereza-alertas/backend/ | wc -l   # 16
ls docs/plans/archivado/sprint2-antipereza-alertas/frontend/ | wc -l  # 25
```

- [ ] **Step 5**: Commit

```bash
git commit -m "cleanup(J.2): mover 41 tareas Sprint 2 alertas/sentry a archivado/sprint2-antipereza-alertas/"
```

---

## Task J.3 — README explicativo en `docs/plans/archivado/`

**Files**: Create `docs/plans/archivado/sprint2-antipereza-alertas/README.md`.

- [ ] **Step 1**: Crear

```bash
cat > docs/plans/archivado/sprint2-antipereza-alertas/README.md <<'EOF'
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
# Si en el futuro hay decisión de retomar:
git mv docs/plans/archivado/sprint2-antipereza-alertas/backend/B-*.md backend/docs/
git mv docs/plans/archivado/sprint2-antipereza-alertas/frontend/F-*.md frontend/docs/
```

## Decisión de no implementar Sprint 1 — quién y cuándo

- Fecha: 2026-05-21
- Decisión tomada en sesión brainstorming con spec aprobada `2026-05-21-ssc-antipereza-sprint1-design.md`.
- Aprobada por: Orlando Vázquez (owner del proyecto).
EOF
```

- [ ] **Step 2**: Commit

```bash
git add docs/plans/archivado/sprint2-antipereza-alertas/README.md
git commit -m "docs(J.3): README en archivado/ explicando por qué se preservaron tareas Sprint 2 alertas"
```

---

## Task J.4 — Update READMEs de `backend/` y `frontend/` referenciando archivado

**Files**:
- Modify: `backend/docs/README.md` (si existe) o agregar.
- Modify: `frontend/docs/README.md` (idem).

- [ ] **Step 1**: Backend docs README

```bash
cat > backend/docs/README.md <<'EOF'
# backend/docs · Sprint 1 vigente

Tareas que aplican al backend Node BFF del SSC ANTIPEREZA Sprint 1.

## Cubiertas por el plan AEGIS

Ver [`../../docs/plans/tactica/sprint1-mvp/00-INDEX.md`](../../docs/plans/tactica/sprint1-mvp/00-INDEX.md).

- **B-001 a B-015**: setup Node + Express + tRPC + viem (clientes zkTanenbaum primario y fallback).
- **B-032 a B-036**: middleware genéricos (cors, helmet, error handler, server).

## Archivadas (producto Sprint 2 distinto)

- **B-016 a B-031** movidas a [`../../docs/plans/archivado/sprint2-antipereza-alertas/backend/`](../../docs/plans/archivado/sprint2-antipereza-alertas/backend/).
EOF

cat > frontend/docs/README.md <<'EOF'
# frontend/docs · Sprint 1 vigente

Tareas que aplican al frontend Next.js del SSC ANTIPEREZA Sprint 1.

## Cubiertas por el plan AEGIS

Ver [`../../docs/plans/tactica/sprint1-mvp/00-INDEX.md`](../../docs/plans/tactica/sprint1-mvp/00-INDEX.md).

- **F-001 a F-025**: setup Next.js + Tailwind + wagmi + viem + detect zkTanenbaum + hooks.
- **F-051 a F-058**: componentes UI base (Button, Modal, Badge, Spinner, EmptyState, ErrorBanner, layout responsive).

## Archivadas (producto Sprint 2 distinto)

- **F-026 a F-050** (Alertas, Mapa Leaflet, Auditoría table, Sensor badges, ReporteForm de alertas) movidas a [`../../docs/plans/archivado/sprint2-antipereza-alertas/frontend/`](../../docs/plans/archivado/sprint2-antipereza-alertas/frontend/).
EOF
```

- [ ] **Step 2**: Commit

```bash
git add backend/docs/README.md frontend/docs/README.md
git commit -m "docs(J.4): READMEs de backend/docs y frontend/docs referenciando vigente vs archivado"
```

---

## Criterios de done del Bloque J

- [ ] 16 tareas backend Sprint 2 movidas a archivado/.
- [ ] 25 tareas frontend Sprint 2 movidas a archivado/.
- [ ] README en archivado/ explica el porqué.
- [ ] READMEs de `backend/docs/` y `frontend/docs/` referencian vigente vs archivado.
- [ ] Sin pérdida de información — todo trackeado en git con `git mv`.

**Gate humano antes de Bloque K**: Orlando verifica que `ls docs/plans/archivado/` tiene la estructura. Aprueba pasar a state-sync AEGIS final.
