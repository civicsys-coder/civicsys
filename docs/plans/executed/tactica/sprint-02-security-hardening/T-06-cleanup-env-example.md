# T-06 — Limpiar `SIGNER_PRIVATE_KEY` y `LLM_BASE_URL` de `agents/.env.example`

**Prio**: P1 · **Bloqueada por**: T-04 (mismo archivo) · **ADR**: — (HC-02 cleanup)

## Qué hacer

En `agents/.env.example`:

1. Eliminar líneas:
   ```env
   SIGNER_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000
   LLM_BASE_URL=
   ```

2. Agregar bloque al final del archivo:

   ```env
   # ─────────────────────────────────────────────────────────────────────────
   # NO custodial signer en Sprint 1/2
   # ─────────────────────────────────────────────────────────────────────────
   # SIGNER_PRIVATE_KEY ha sido eliminado deliberadamente. Hermes no firma
   # transacciones — el ciudadano firma desde su wallet (MetaMask) y el backend
   # Node solo lee on-chain. Ver:
   # - docs/security/threat-model.md (modelo HC-02)
   # - docs/plans/executed/arquitectura/ADR-002-audit-log-l1.md (cuando se introduzca
   #   AuditLog publisher en Sprint 3+, será con multisig — no signer único)
   #
   # LLM_BASE_URL ha sido eliminado: el LLMClient usa endpoints hardcoded
   # (api.anthropic.com, openrouter.ai). Re-introducir requiere ADR específico
   # (vector AI-PI-04 — proxy man-in-the-middle).
   ```

3. Editar `agents/README.md` añadiendo sección "Modelo de seguridad Sprint 1/2":

   ```markdown
   ## Modelo de seguridad

   Sprint 1/2 NO tiene signer custodial. Hermes:
   - Lee eventos on-chain (sin firmar).
   - Llama LLM con su API key (Anthropic/OpenRouter).
   - Sirve API HTTP (sin escrituras on-chain).

   El ciudadano firma todas las txs desde su wallet (MetaMask) en el frontend.
   El backend Node es solo-lectura.

   Cuando Sprint 3+ introduzca AuditLog.sol o similar, el signer será multisig
   2-de-3, no una EOA única. Ver `docs/plans/executed/arquitectura/ADR-002-audit-log-l1.md`.
   ```

## Criterio de done

- [ ] `agents/.env.example` no contiene `SIGNER_PRIVATE_KEY` ni `LLM_BASE_URL` como variables activas.
- [ ] `agents/README.md` tiene sección "Modelo de seguridad".

## Comando de verificación

```bash
! grep -E "^SIGNER_PRIVATE_KEY|^LLM_BASE_URL" agents/.env.example && grep -q "Modelo de seguridad" agents/README.md && echo OK
```
