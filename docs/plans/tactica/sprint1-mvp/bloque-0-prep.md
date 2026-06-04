# Bloque 0 · Prep

**Objetivo**: Dejar el working tree limpio y commitear (o stashear) la deuda pre-existente antes de arrancar el plan. Sin esto, los cambios de Bloque A en adelante se mezclarán con cambios viejos y los diffs van a estar confusos.

**Tareas**: 4
**LOC estimado**: ~50
**Dependencias**: ninguna.
**Coverage gate**: no aplica.

---

## Task 0.1 — Auditar working tree pendiente

**Files**: ninguno (solo lectura).

- [ ] **Step 1**: Confirmar qué hay sin commitear

Run:
```bash
git status -s
```

Expected output (resultado al cierre de la sesión 2026-05-20):
```
 M backend/docs/B-007-configurar-env.md
RM backend/docs/B-011-crear-rollux-client.md -> backend/docs/B-011-crear-zktanenbaum-client.md
RM backend/docs/B-012-crear-nevm-client.md -> backend/docs/B-012-crear-zktanenbaum-fallback-client.md
 M frontend/docs/F-005-configurar-env-local.md
RM frontend/docs/F-018-detectar-red-rollux.md -> frontend/docs/F-018-detectar-red-zktanenbaum.md
?? docs/plans/tactica/sprint1-mvp/00-INDEX.md
?? docs/plans/tactica/sprint1-mvp/bloque-0-prep.md
?? docs/superpowers/specs/2026-05-21-ssc-antipereza-sprint1-design.md
```

Si difiere significativamente, pausar y entender por qué antes de seguir.

---

## Task 0.2 — Commit deuda Rollux→zkTanenbaum

**Files**: los 5 archivos modificados/renombrados del 2026-05-20.

- [ ] **Step 1**: Stage solo los archivos de la corrección

Run:
```bash
git add backend/docs/B-007-configurar-env.md \
        backend/docs/B-011-crear-zktanenbaum-client.md \
        backend/docs/B-012-crear-zktanenbaum-fallback-client.md \
        frontend/docs/F-005-configurar-env-local.md \
        frontend/docs/F-018-detectar-red-zktanenbaum.md
```

- [ ] **Step 2**: Verificar staging area

Run:
```bash
git status -s
```

Expected: las 5 líneas con `M` o `R` arriba (sin espacio leading = staged), y solo los 3 archivos del plan/spec sin trackear (`??`).

- [ ] **Step 3**: Commit con mensaje contextual

Run:
```bash
git commit -m "$(cat <<'EOF'
fix(docs): corregir red blockchain a zkTanenbaum

Sandro asumió Rollux L2 + Syscoin NEVM L1 en PR #2 (Sprint 2). El pitch
oficial (PPT slide 13) y el README raíz especifican zkTanenbaum
(Chain ID 57057, RPC rpc-zk.tanenbaum.io). Estas son redes diferentes
del mismo ecosistema Syscoin (Rollux=570, NEVM=5700, zkTanenbaum=57057).

- backend/B-007: env vars apuntan a RPC zkTanenbaum + fallback
- backend/B-011: renombrado a 'crear-zktanenbaum-client' · primario
- backend/B-012: renombrado a 'zktanenbaum-fallback-client' · resiliencia
- frontend/F-005: NEXT_PUBLIC_RPC_URL + NEXT_PUBLIC_CHAIN_ID=57057
- frontend/F-018: detectar 57057 con useChainId + useSwitchChain (wagmi)

Cada doc tiene una advertencia explícita 'Rollux es 570, NEVM es 5700,
zkTanenbaum es 57057' para evitar la confusión a futuro.
EOF
)"
```

- [ ] **Step 4**: Verificar el commit

Run:
```bash
git log --oneline -3
git status -s
```

Expected: el commit aparece en HEAD. `git status -s` muestra solo los 3 archivos del plan AEGIS sin trackear.

---

## Task 0.3 — Commit spec y plan AEGIS

**Files**:
- Add: `docs/superpowers/specs/2026-05-21-ssc-antipereza-sprint1-design.md`
- Add: `docs/plans/tactica/sprint1-mvp/00-INDEX.md`
- Add: `docs/plans/tactica/sprint1-mvp/bloque-0-prep.md`

- [ ] **Step 1**: Stage los nuevos docs

Run:
```bash
git add docs/superpowers/specs/2026-05-21-ssc-antipereza-sprint1-design.md \
        docs/plans/tactica/sprint1-mvp/00-INDEX.md \
        docs/plans/tactica/sprint1-mvp/bloque-0-prep.md
```

- [ ] **Step 2**: Commit el bootstrap del plan

Run:
```bash
git commit -m "$(cat <<'EOF'
docs(aegis): spec + plan táctico Sprint 1 MVP SSC ANTIPEREZA

Spec en docs/superpowers/specs/2026-05-21-ssc-antipereza-sprint1-design.md
(594 líneas) define el slice mínimo demoable: registro DNI hash on-chain →
voto en propuesta preseeded → Hermes lee evento → reporte firmado.

Plan táctico AEGIS en docs/plans/tactica/sprint1-mvp/ con 12 bloques
(0-K, ~101 tareas, ~3850 LOC estimadas). Hard-gate 80% statements
coverage cross-stack: Solidity + Node + Python + Frontend.

Stack: Hardhat/Solidity 0.8.24 + Express/tRPC/viem + FastAPI/Hermes +
Next.js 14/Tailwind/shadcn + Supabase Postgres/pgvector + Anvil local +
zkTanenbaum testnet. Docker Compose orquesta todo.

Source of truth del concepto: SSC_ANTIPEREZA_Project_Speech_v3.pptx
(18 slides). Roadmap: día 7 PPT = ~2026-05-25.

Bloque 0 (este commit) cierra; Bloque A (infra Docker) abre Gate 1.
EOF
)"
```

- [ ] **Step 3**: Push opcional a una rama de feature

Si Orlando quiere trabajar en una rama (recomendado para que el equipo pueda revisar):

```bash
git checkout -b feat/sprint1-mvp
git push -u origin feat/sprint1-mvp
```

Si prefiere trabajar directo en `main` (es el owner del repo), saltear este step.

---

## Task 0.4 — Crear estructura de directorios base

**Files**:
- Create: `infra/` (vacía por ahora · Bloque A la rellena)
- Create: `shared/abis/.gitkeep`, `shared/types/.gitkeep`, `shared/schemas/.gitkeep` (las carpetas existen vacías; agregamos `.gitkeep` para que git las trackee mientras el contenido llega en bloques posteriores).

- [ ] **Step 1**: Crear infra/ y rellenar .gitkeep en shared/

Run:
```bash
mkdir -p infra
touch shared/abis/.gitkeep shared/types/.gitkeep shared/schemas/.gitkeep
```

- [ ] **Step 2**: Confirmar estructura

Run:
```bash
ls -la infra shared shared/abis shared/types shared/schemas
```

Expected: `infra/` existe vacío. `shared/abis|types|schemas/` tienen un `.gitkeep` cada uno.

- [ ] **Step 3**: Stage + commit

Run:
```bash
git add infra shared/abis/.gitkeep shared/types/.gitkeep shared/schemas/.gitkeep
git commit -m "chore(scaffold): crear infra/ + .gitkeep en shared/ para trackear directorios"
```

---

## Criterios de done del Bloque 0

- [ ] `git status` reporta working tree clean.
- [ ] `git log --oneline -5` muestra los 3 commits del Bloque 0 (deuda Rollux→zkTanenbaum, spec+plan, scaffold).
- [ ] Spec y plan AEGIS persistidos.
- [ ] Estructura `infra/`, `shared/{abis,types,schemas}/` existente.

**Gate humano antes de Bloque A**: Orlando verifica el árbol y aprueba arrancar la infra Docker. Si hay observaciones al plan, este es el momento.
