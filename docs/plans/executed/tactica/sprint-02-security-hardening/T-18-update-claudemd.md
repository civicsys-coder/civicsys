# T-18 — Actualizar `CLAUDE.md` del repo

**Prio**: infra · **Bloqueada por**: T-01..T-16 · **ADR**: —

## Qué hacer

Verificar si existe `CLAUDE.md` en la raíz del repo. Si no, crearlo con contenido base + sección de seguridad. Si existe, añadir/actualizar las secciones:

1. **Seguridad** (referencia a `docs/security/` como source of truth):
   - Política MCP: `docs/security/mcp-policy.md`.
   - Modelo de amenaza: `docs/security/threat-model.md`.
   - Limitaciones conocidas: `docs/security/known-limitations.md`.
   - Auditoría externa: `docs/security/audit-scope.md`.
   - Salt: vive en `.env` local (gitignored). Ver `docs/security/runbook-rotacion-salt.md`.

2. **Modelo Sprint 1/2**:
   - **Sin signer custodial**. Hermes no firma transacciones. Frontend ciudadano firma con MetaMask. Backend Node solo lee.
   - Cuando Sprint 3+ introduzca AuditLog publisher u otro signer, será con multisig 2-de-3.

3. **Prompt injection defense**:
   - `agents/app/security.py:sanitize_untrusted` envuelve cualquier dato no confiable antes del prompt LLM.
   - Cualquier nuevo dato on-chain que se inyecte al prompt debe pasar por la función.
   - Suite de tests en `agents/tests/test_security.py`.

4. **Tooling check** (recordatorios):
   - `pnpm` no `npm`.
   - Coverage gates en CI: ≥80% statements cross-stack.
   - Antes de commit: `pnpm test`, `pytest`, `pnpm lint`, `pnpm typecheck`.

5. **AEGIS protocol**: este repo adhiere a AEGIS v2.1.0. Ver `C:/dev/protocols/AEGIS/AEGIS-PROTOCOL.md`. Planes en `docs/plans/`, devlogs en `docs/devlogs/` y `docs/aegis/devlogs/`.

## Criterio de done

- [ ] `CLAUDE.md` existe en la raíz.
- [ ] Contiene la sección "Seguridad".
- [ ] Contiene la sección "Modelo Sprint 1/2".
- [ ] Linkea a `docs/security/` y a los ADRs.

## Comando de verificación

```bash
test -f CLAUDE.md && grep -q "docs/security" CLAUDE.md && grep -q "sanitize_untrusted" CLAUDE.md && echo OK
```
