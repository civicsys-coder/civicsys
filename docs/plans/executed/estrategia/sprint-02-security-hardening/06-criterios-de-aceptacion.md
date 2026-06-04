# Criterios de aceptación por vulnerabilidad

Cada criterio debe ser **verificable mecánicamente** (comando reproducible) o por revisión visual breve (≤2 min). El equipo (humano) usa esta lista en el **Gate 2**.

## CA-1 — HC-01 / SC-05 (Salt)

**Verificación**:
- [ ] `git grep -n "ssc-antipereza-2026-publico" -- ':!docs/security/' ':!docs/plans/'` → solo encuentra ocurrencias en docs (referencia histórica), nunca en `.env.example` ni en código de runtime ni en tests.
- [ ] Cada `.env.example` (raíz, `blockchain/`, `agents/`) tiene `PUBLIC_SALT=<GENERATE_WITH_OPENSSL>` (placeholder) y comentario explicando cómo generar.
- [ ] Existe `.env` local (no commiteado) con un salt de 256 bits — humano confirma al correr `cat .env | grep PUBLIC_SALT | wc -c` ≥ 70.
- [ ] `pytest agents/tests/` verde con el salt nuevo (los tests no dependen del valor literal viejo).
- [ ] CI verde (no expone salt en logs).

## CA-2 — AI-PI-02 (MCP)

**Verificación**:
- [ ] `docs/security/mcp-policy.md` existe y cubre: auth scheme, allow-list, prohibiciones, logging.
- [ ] `agents/mcp_server/README.md` existe y referencia la policy.
- [ ] (Opcional, si se implementa stub) `agents/mcp_server/server.py` rechaza llamadas sin Bearer token válido — test en `agents/tests/test_mcp_server.py`.
- [ ] ADR-004 firmado en `docs/plans/arquitectura/`.

## CA-3 — SC-07 (Mock TS)

**Verificación** (ya cerrado):
- [ ] `git grep -n "0xHashFalso123" -- 'backend/'` → no encuentra.
- [ ] `git grep -n "Datos simulados" -- 'backend/'` → no encuentra.
- [ ] `backend/src/services/blockchain.service.ts` usa `createPublicClient` viem (verificado).
- [ ] `backend/README.md` (o `AGENTS.md`) menciona explícitamente "backend solo lectura, sin private keys".

## CA-4 — HC-02 / AI-MI-01-02 (Signer)

**Verificación**:
- [ ] `git grep -n "SIGNER_PRIVATE_KEY" -- 'agents/'` → no encuentra ni en `.env.example` ni en código de runtime de `agents/app/`.
- [ ] `git grep -n "LLM_BASE_URL" -- 'agents/'` → no encuentra (a menos que el ADR-004 decida mantenerlo con restricciones, en cuyo caso debe tener test).
- [ ] `docs/security/threat-model.md` o `known-limitations.md` explica que en Sprint 2 no existe signer custodial.

## CA-5 — HC-05 (Anchor L1)

**Verificación**:
- [ ] ADR-002 firmado.
- [ ] Si Opción A (HMAC solo): `agents/app/security.py` o equivalente expone `compute_hmac(content)` y `verify_hmac(content, mac)`. Test `test_report_integrity.py` verifica que mutación detectada.
- [ ] Si Opción B o C (AuditLog.sol): contrato compilado, deployado a Anvil; Hermes llama tras render; test e2e.
- [ ] Si la decisión fue diferir AuditLog.sol: `known-limitations.md` documenta el gap.

## CA-6 — AI-BC-01 (RPC fallback)

**Verificación**:
- [ ] `Settings` Python tiene `rpc_fallback: str | None`.
- [ ] `blockchain/.env.example` mantiene `RPC_FALLBACK=` con comentario.
- [ ] Función `make_rpc_provider(primary, fallback)` o equivalente — test con `respx` mock que primary 500/timeout → fallback responde.
- [ ] Test "ambos down" → error claro al cliente.

## CA-7 — AI-PI-01 (Prompt injection)

**Verificación**:
- [ ] `agents/app/security.py:sanitize_untrusted(text, max_len)` implementado.
- [ ] `agents/app/reporter.py:_build_prompt` usa la función y delimitadores `<UNTRUSTED_INPUT>...</UNTRUSTED_INPUT>`.
- [ ] System prompt en `_build_prompt` declara los delimitadores.
- [ ] `agents/tests/test_prompt_injection.py` con ≥10 payloads. Todos los tests verde: el prompt sanitizado NO contiene los tokens críticos y el delimitador se respeta.

## CA-8 — HC-03 / SC-04 (Votos en calldata)

**Verificación**:
- [ ] Página/componente de voto del frontend incluye banner visible con advertencia y link a `docs/security/known-limitations.md`.
- [ ] `frontend/civicsys/src/.../vote-page.test.tsx` (o equivalente) verifica que el banner está renderizado.
- [ ] `docs/security/known-limitations.md` cubre HC-03/SC-04 con plan Sprint 3.

## CA-9 — SC-01/02/03/BC-BR-01 (SAST contratos)

**Verificación**:
- [ ] `pnpm --filter blockchain run scan` (o equivalente) corre slither + solhint y produce output reproducible.
- [ ] `docs/security/sast-findings.md` lista los findings con clasificación + status (resuelto / aceptado / diferido).
- [ ] Findings High/Critical: 0 (o todos justificados con razón documental).
- [ ] `docs/security/audit-scope.md` describe RFP de auditoría externa post-MVP.

## Criterios cross-sprint (no por vulnerabilidad)

- [ ] Tests cross-stack en verde: `pnpm test` (Solidity + Node + Frontend) + `pytest` (Python).
- [ ] Coverage gates de CI mantienen niveles del Sprint 1 (≥80% statements cross-stack).
- [ ] `pnpm typecheck` + `pnpm lint` + `pytest --cov` verdes localmente y en CI.
- [ ] `git status` limpio antes del state-sync.
- [ ] `docs/INDEX.md` actualizado con nuevo devlog del Sprint 02.
- [ ] `docs/devlogs/2026-05-23-sprint02-security-hardening.md` cubre las 6 secciones del template AEGIS (resumen, cambios, decisiones, incidentes, reproducción, pendiente, uso y costo).
- [ ] Plan movido a `docs/plans/executed/{estrategia,arquitectura,tactica}/sprint-02-security-hardening/`.
- [ ] `CLAUDE.md` del repo actualizado con info nueva (links a `docs/security/`, política MCP, ubicación del salt).

## Gate humano 1 — qué presentar antes de Ejecución

1. Resumen ejecutivo de este plan (≤150 palabras).
2. Lista de las 9 vulnerabilidades con estado.
3. Resumen de los 5 ADRs (1 frase cada uno).
4. Plan táctico (tareas T-01..T-NN) con archivos a tocar y dependencias.
5. Lista de criterios de aceptación.
6. Tabla de deuda diferida (D-01..D-10) para confirmar acuerdo.

## Gate humano 2 — qué presentar antes de State-Sync

1. Diff resumido por archivo (`git diff --stat`).
2. Tests + coverage actuales en cada capa.
3. Output de slither/solhint.
4. Lista de criterios de aceptación marcados como CUMPLIDOS (con evidencia).
5. Lista de pendientes/diferidos confirmados (D-01..D-10).
6. Tabla "Uso y costo" del devlog.
