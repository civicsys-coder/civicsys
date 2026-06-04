# T-20 — Verificación cross-stack final (pre-Gate 2)

**Prio**: guardrails · **Bloqueada por**: T-01..T-19 · **ADR**: —

## Qué hacer

Antes de presentar al humano en Gate 2, verificar:

1. **Tests verde por capa**:
   - `cd blockchain && pnpm test` — Solidity (Hardhat). Deben pasar ≥23 tests.
   - `cd backend && pnpm test` — Node (vitest). Deben pasar ≥22 tests.
   - `cd frontend/civicsys && pnpm test` — Frontend (vitest). Deben pasar ≥21 + nuevos de T-15.
   - `cd agents && python -m pytest` — Python (pytest). Deben pasar ≥23 + nuevos de T-08, T-11, T-13.

2. **Coverage gates**:
   - Solidity: ≥100% statements (Sprint 1 baseline).
   - Node: ≥96% statements.
   - Python: ≥80% statements (cubrir `app/security.py`, `app/rpc.py`).
   - Frontend: ≥80% statements.

3. **Lint / typecheck**:
   - `pnpm lint` por capa.
   - `pnpm typecheck` por capa.
   - `cd agents && python -m ruff check .` (si ruff configurado).

4. **Búsquedas de regresión**:
   - `! git grep "ssc-antipereza-2026-publico" -- ':!docs/'` — no encuentra fuera de docs.
   - `! git grep "0xHashFalso123"` — no encuentra.
   - `! git grep "SIGNER_PRIVATE_KEY" -- agents/.env.example` — no encuentra como var activa.

5. **Verificación visual frontend**:
   - Levantar dev server (`cd frontend/civicsys && pnpm dev`).
   - Abrir la página de voto — banner de visibilidad presente.

6. **Slither/solhint**:
   - Output reproducible documentado en `docs/security/sast-findings.md`.

7. **Generar resumen para Gate 2** (presentar al humano):
   - `git diff --stat` resumido.
   - Estado por tarea (T-01..T-19) marcando done/skip/blocked.
   - Tabla "Uso y costo" (tokens/USD aproximados de la sesión).

## Criterio de done

- [ ] Todos los tests verde en las 4 capas.
- [ ] Todos los coverage gates pasan.
- [ ] `pnpm lint` y `pnpm typecheck` verdes.
- [ ] Búsquedas de regresión limpias.
- [ ] Documento resumen Gate 2 listo en formato markdown (puede ser mensaje al humano, no archivo).

## Comando de verificación

```bash
# En orden:
cd blockchain && pnpm test && cd ..
cd backend && pnpm test && cd ..
cd frontend/civicsys && pnpm test && cd ../..
cd agents && python -m pytest && cd ..

# Búsquedas de regresión:
! git grep -q "ssc-antipereza-2026-publico" -- ':!docs/'
! git grep -q "0xHashFalso123"

# Si todo verde:
echo "Gate 2 ready"
```
