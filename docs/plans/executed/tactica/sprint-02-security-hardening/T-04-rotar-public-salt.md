# T-04 — Rotar `PUBLIC_SALT` en los 3 `.env.example`

**Prio**: P0 · **Bloqueada por**: T-01 · **ADR**: ADR-001

## Qué hacer

1. En los 3 archivos:
   - `.env.example` (raíz, línea ~25)
   - `blockchain/.env.example` (línea ~9)
   - `agents/.env.example` (línea ~7)

   Reemplazar:
   ```env
   PUBLIC_SALT=ssc-antipereza-2026-publico
   ```

   Por:
   ```env
   # PUBLIC_SALT — secreto compartido entre frontend, backend y deploy de contratos.
   # GENERAR localmente con `openssl rand -hex 32` y persistir en `.env` (gitignored).
   # NO commitear el valor real. NO compartirlo en canales públicos.
   # Cambio de valor invalida el padrón ciudadano registrado — re-registrar tras rotación.
   PUBLIC_SALT=<GENERATE_WITH_OPENSSL_RAND_HEX_32>
   ```

   También actualizar los comentarios viejos en `.env.example` raíz líneas 22-24 que decían "NO ES SECRETO".

2. Crear `docs/security/runbook-rotacion-salt.md`:
   - Pasos exactos para rotar el salt en producción.
   - Comando de generación: `openssl rand -hex 32`.
   - Lista de archivos `.env` a actualizar: `.env` (raíz si aplica), `blockchain/.env`, `agents/.env`, deployment env del frontend.
   - Advertencia: rotar **invalida** los hashes ciudadanos ya registrados; coordinar con anuncio público de re-registro.

3. **No** generar ni commitear un `.env` con valor real — eso lo hace el operador local.

## Criterio de done

- [ ] `git grep ssc-antipereza-2026-publico -- ':!docs/'` → no encuentra (no en `.env.example`, no en código de runtime).
- [ ] Los 3 `.env.example` tienen el placeholder + comentario nuevo.
- [ ] `docs/security/runbook-rotacion-salt.md` existe.

## Comando de verificación

```bash
! git grep -q "ssc-antipereza-2026-publico" -- ':!docs/' && grep -q "GENERATE_WITH_OPENSSL_RAND_HEX_32" .env.example blockchain/.env.example agents/.env.example && test -f docs/security/runbook-rotacion-salt.md && echo OK
```
