# T-16 — Slither + solhint sobre contratos + documentar findings

**Prio**: P2 · **Bloqueada por**: T-01 · **ADR**: — (SC-01/02/03 partial mitigation)

## Qué hacer

1. Verificar si slither está instalado: `slither --version`. Si no:
   - Documentar en `docs/security/sast-findings.md` que slither requiere Python+pip install: `pip install slither-analyzer`.
   - Como instalación tiene dependencias del sistema en Windows, alternativa: `solhint` (Node) + análisis manual.

2. Correr (con cualquiera disponible):
   - `cd blockchain && npx solhint 'contracts/**/*.sol'` (siempre disponible — usa pnpm/npm).
   - `cd blockchain && slither contracts/` (si está instalado).

3. Capturar output a `docs/security/sast-findings.md`:

   ```markdown
   # SAST Findings — CivicSys contratos

   **Fecha**: 2026-05-23
   **Herramientas**: solhint vX.Y.Z + slither vA.B.C (si disponible)
   **Comando**: `pnpm --filter blockchain run scan` (ver T-16)

   ## Severity High/Critical

   (Lista o "0 findings.")

   ## Severity Medium

   ## Severity Low / Info

   ## Findings descartados (con justificación)
   ```

4. Si hay findings High/Critical: crear subtareas dentro del mismo sprint (sub-T-16a, T-16b) para resolverlos.

5. (Opcional) Agregar script `scan` al `blockchain/package.json`:

   ```json
   "scripts": {
     "scan": "solhint 'contracts/**/*.sol'"
   }
   ```

   Y a CI como nuevo job (no bloquear merge si solhint warning, sí bloquear si error).

## Criterio de done

- [ ] `docs/security/sast-findings.md` existe con findings reales o "0 findings".
- [ ] Script `pnpm --filter blockchain run scan` corre en local.
- [ ] No quedan findings High/Critical sin resolver o justificar.

## Comando de verificación

```bash
cd blockchain && pnpm run scan 2>&1 | tee /tmp/scan-output.txt
test -f ../docs/security/sast-findings.md && echo OK
```
