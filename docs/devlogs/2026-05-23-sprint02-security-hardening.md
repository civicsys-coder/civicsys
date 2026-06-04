# Sprint 02 — Security Hardening (respuesta a auditoría Tatiana)

**Fecha**: 2026-05-23
**Fases ejecutadas**: Estrategia → Arquitectura → Táctica → Gate Humano 1 → Ejecución → Guardrails → Gate Humano 2 → State-Sync.
**Protocolo**: AEGIS v2.1.0 (consola, sin sub-agentes).
**Plan origen**: `docs/plans/executed/estrategia/sprint-02-security-hardening/`
**ADRs producidos**: ADR-001..ADR-005 en `docs/plans/executed/arquitectura/`.
**Plan táctico**: `docs/plans/executed/tactica/sprint-02-security-hardening/` (20 tareas T-01..T-20).
**Repos afectados**: `agents/`, `blockchain/`, `backend/` (mínimo), `frontend/civicsys/`, raíz.
**Migraciones**: ninguna (sin DB schema changes).
**Tests cross-stack**: **136/136** verde (era 89). +47 tests nuevos.
**Build**: OK localmente. CI sin correr (queda para push).
**Branch**: continuación de `feat/sprint1-mvp`.

## Resumen

Sprint puramente de seguridad. Atacó las 9 vulnerabilidades priorizadas por Tatiana Portillo en su auditoría (`docs/security/CivicSys-Auditoria-Ciberseguridad.docx`, pp. 20-21). De las 9: 1 ya estaba cerrada en Sprint 1 (SC-07 mock TS), 2 quedaban parcialmente mitigadas (AI-BC-01 RPC y SC-01/02/03 auditoría externa), 6 estaban abiertas. Este sprint cerró las 6 abiertas + reforzó las 2 parciales + dejó política documentada para componentes aún no construidos (MCP server, AuditLog.sol).

El sprint **no agregó features de producto**. Solo hardening. Cualquier feature nueva queda diferida a Sprint 3+.

## Las 9 vulnerabilidades — estado final

| # | ID | Severidad docx | Estado final | Cómo se cerró |
|---|---|---|---|---|
| 1 | HC-01 / SC-05 | CRÍTICO | ✅ Cerrado | Rotación de `PUBLIC_SALT` a placeholder en 3 `.env.example`; nuevo runbook + ADR-001. |
| 2 | AI-PI-02 (MCP) | CRÍTICO | ✅ Diseño documentado | `docs/security/mcp-policy.md` + ADR-004 + `agents/mcp_server/README.md`. Implementación pendiente (server vacío); cualquier futura tool pasa code review contra la policy. |
| 3 | SC-07 | ALTO | ✅ Cerrado (Sprint 1 Bloque E) | Verificado: `backend/src/services/blockchain.service.ts` usa viem real, sin private keys. |
| 4 | HC-02 / AI-MI-01-02 | CRÍTICO | ✅ No aplica Sprint 2 | `SIGNER_PRIVATE_KEY` y `LLM_BASE_URL` removidos de `agents/.env.example`. Doc: multisig 2-de-3 cuando se introduzca AuditLog publisher (Sprint 3+). ADR-002. |
| 5 | HC-05 | ALTO | ✅ HMAC listo | `compute_hmac`/`verify_hmac` + 12 tests en `agents/app/security.py`. AuditLog.sol on-chain documentado en ADR-002 para Sprint 3+. |
| 6 | AI-BC-01 | ALTO | ✅ Failover | `agents/app/rpc.py:fetch_with_failover` + 7 tests con respx. Cross-validation multi-RPC documentada para Sprint 3+. ADR-003. |
| 7 | AI-PI-01 | ALTO | ✅ Sanitize | `sanitize_untrusted` en `agents/app/security.py` + 18 tests de payloads + delimitadores `<UNTRUSTED_INPUT>` en `reporter._build_prompt`. ADR-005. |
| 8 | HC-03 / SC-04 | ALTO/CRÍTICO | ✅ Warning UI (mitigación parcial documentada) | Componente `VoteVisibilityWarning` integrado en `app/propuesta/[id]/page.tsx` + tests. Commit-reveal deferido a Sprint 3+. Doc L-01. |
| 9 | SC-01/02/03/BC-BR-01 | CRÍTICO/ALTO | ✅ SAST + RFP audit externa | Solhint corrido (0 errors, 52 warnings de gas/docs aceptadas) + `docs/security/sast-findings.md` + `docs/security/audit-scope.md` para auditoría externa post-MVP. |

## Cambios entregados (agrupados por capa)

### Documentación de seguridad (`docs/security/`) — nuevo

- `README.md` — índice navegable.
- `CivicSys-Auditoria-Ciberseguridad.docx` — copia del documento original de Tatiana.
- `SECURITY.md` — política de divulgación responsable (canal, SLA).
- `threat-model.md` — modelo de amenaza Sprint 02 (actores S1-S7).
- `known-limitations.md` — L-01 a L-10 (limitaciones aceptadas con plan futuro).
- `mcp-policy.md` — política obligatoria para futuro MCP server (transcribe ADR-004).
- `runbook-rotacion-salt.md` — procedimiento de rotación.
- `audit-scope.md` — RFP para auditoría externa profesional.
- `sast-findings.md` — output solhint + categorización.

### Planes AEGIS (`docs/plans/`)

- **Estrategia** (`executed/estrategia/sprint-02-security-hardening/`): 7 archivos (00-INDEX + 01-overview + 02..06).
- **Arquitectura** (`executed/arquitectura/`): ADR-001..ADR-005.
- **Táctica** (`executed/tactica/sprint-02-security-hardening/`): 00-INDEX + T-01..T-20.

### Código — `agents/` (Python)

- `app/security.py` — **nuevo**. `sanitize_untrusted` + HMAC helpers. 100% coverage.
- `app/rpc.py` — **nuevo**. `fetch_with_failover` con httpx + respx-friendly. 100% coverage.
- `app/reporter.py` — integra `sanitize_untrusted` + delimitadores en `_build_prompt`.
- `app/settings.py` — añade `rpc_fallback`, `rpc_timeout_seconds`, `memory_integrity_key`.
- `tests/test_security.py` — **nuevo**. 29 tests (18 sanitize + 11 hmac).
- `tests/test_rpc.py` — **nuevo**. 7 tests (failover scenarios).
- `tests/test_reporter.py` — añade 2 tests (delimitadores + sanitización integrada).
- `tests/test_helpers.py` — quita literal salt comprometido, usa constante de test.
- `.env.example` — rota salt a placeholder, elimina `SIGNER_PRIVATE_KEY` y `LLM_BASE_URL`, agrega `RPC_FALLBACK`, `MEMORY_INTEGRITY_KEY`, `MCP_AUTH_TOKEN`. Comentarios documentan por qué.
- `README.md` — nueva sección "Modelo de seguridad" + actualiza ejemplo `.env`.
- `mcp_server/README.md` — **nuevo**. Stub que advierte sobre la policy obligatoria.

### Código — `blockchain/`

- `.env.example` — rota salt a placeholder + comentario nuevo.
- `.solhint.json` — **nuevo**. Config con `extends: solhint:recommended` + reglas custom.
- `package.json` — agrega script `scan`.
- `test/CitizenRegistry.test.ts`, `test/Vote.test.ts`, `test/E2E.test.ts` — quitan literal salt comprometido, usan constante de test.

### Código — `backend/` (Node)

Sin cambios funcionales — `blockchain.service.ts` ya usaba viem real desde Sprint 1.

### Código — `frontend/civicsys/`

- `components/VoteVisibilityWarning.tsx` — **nuevo**. Banner sobre votos visibles en explorador.
- `components/VoteVisibilityWarning.test.tsx` — **nuevo**. 5 tests.
- `components/RegisterCitizenForm.tsx` — fail-safe sin salt configurado (no usa fallback al salt comprometido).
- `components/RegisterCitizenForm.test.tsx` — duplica test suites (con/sin salt) usando `vi.stubEnv`. +4 tests.
- `lib/dni-hash.test.ts` — quita literal salt comprometido.
- `app/propuesta/[id]/page.tsx` — integra `<VoteVisibilityWarning />` antes de los botones de voto.

### Raíz del repo

- `CLAUDE.md` — **nuevo**. Reglas operativas, modelo de seguridad, ubicación de docs.
- `docs/INDEX.md` — **nuevo**. Índice navegable de toda la documentación.
- `.pre-commit-config.yaml` — **nuevo**. Config gitleaks para activación opcional local.
- `.env.example` — rota salt a placeholder.

## Decisiones técnicas tomadas

Capturadas formalmente en ADRs:

1. **ADR-001**: salt secreto rotado vs HMAC con pepper vs ZK proof → elegimos **salt secreto rotado** para Sprint 02 (mínimo cambio, cierra el ataque de pre-cómputo público). HMAC con pepper en HSM queda para producción mainnet.

2. **ADR-002**: HMAC off-chain vs AuditLog.sol vs híbrido → **HMAC off-chain Sprint 02; AuditLog.sol on-chain en Sprint 3+** cuando exista wallet operador. Evita reabrir HC-02 introduciendo signer ahora.

3. **ADR-003**: failover simple vs validación cruzada vs híbrido → **failover simple Sprint 02; cross-validation Sprint 3+**.

4. **ADR-004**: Bearer token vs JWT scopes vs mTLS → **Bearer token estático + allow-list + lista negra absoluta**. JWT scopes cuando se necesite multi-cliente.

5. **ADR-005**: sanitización custom vs librería externa vs híbrido → **custom Sprint 02; evaluación de lib externa Sprint 03** según tráfico real.

## Incidentes durante la ejecución

- **Linker rompió tests del frontend**: al refactorizar `RegisterCitizenForm` para fail-safe sin salt, los tests existentes fallaban porque no seteaban `NEXT_PUBLIC_PUBLIC_SALT`. Solución: usar `vi.stubEnv` en `beforeEach` + agregar test suite específico para el caso "sin salt".

- **Solhint sin config**: la primera corrida falló con "Failed to load a solhint's config file". Solución: crear `blockchain/.solhint.json` con `extends: solhint:recommended` + 5 reglas custom.

- **`process.env` lectura en module-level**: el componente leía el salt a nivel de módulo, lo que hacía imposible que vitest stubeara la env después del import. Solución: mover la lectura adentro del componente.

- **Sin instalación de slither en Windows**: el orquestador no tiene slither instalado. Solo corrió solhint. Slither queda documentado para CI Linux en sprint próximo.

- **No hay `typecheck` script en package.jsons**: intentamos correr `pnpm typecheck` por capa y no existe el script. No es bloqueante; los tests cubren la mayoría de los tipos.

## Cómo reproducir / verificar

```bash
# Tests cross-stack (deberían ser 136/136 verde):
cd blockchain && pnpm test           # 23 ok
cd ../backend && pnpm test --run     # 22 ok
cd ../frontend/civicsys && pnpm test --run  # 30 ok
cd ../../agents && ./.venv/Scripts/python.exe -m pytest  # 61 ok

# SAST contratos:
cd blockchain && pnpm scan
# Esperado: 52 problems (0 errors, 52 warnings)

# Buscar regresiones de secreto:
git grep "ssc-antipereza-2026-publico" -- ':!docs/'
# Esperado: solo hits en docs/ históricos, ninguno en código activo.

# Verificar plan archivado:
ls docs/plans/executed/{estrategia,arquitectura,tactica}/
```

## Pendiente (Sprint 3+)

1. **Multisig real** para AuditLog publisher (cuando se introduzca). ADR-002 + ADR-multisig.
2. **AuditLog.sol on-chain** — contrato simple, integración Hermes con wallet operador.
3. **Commit-reveal voting** o ZK voting (cierra HC-03/SC-04). ADR-commit-reveal.
4. **Auditoría externa profesional** según `docs/security/audit-scope.md` antes de mainnet.
5. **Slither en CI Linux** (`pip install slither-analyzer` en GitHub Actions job).
6. **Cross-validation multi-RPC** (Opción C de ADR-003).
7. **Monitor de comportamiento del LLM** (verificación de `tx_hashes` en explorer, anomaly detection).
8. **Implementación de MCP server** siguiendo `docs/security/mcp-policy.md` + emitir ADR-004B con detalles.
9. **HMAC con pepper en HSM** o ZK proof of DNI para producción (Opción B de ADR-001).
10. **PIA legal formal** (Tatiana o asesor legal).
11. **Notspec tags completos** en interfaces Solidity (warnings de solhint).
12. **gitleaks pre-commit instalado** localmente por todos los devs.

## Reconocimientos

- **Tatiana Portillo** — auditoría base que motivó este sprint completo. Excelente documento de referencia.
- **AEGIS v2.1.0** — protocolo seguido fase por fase.

## Uso y costo

| Modelo | Input tokens | Output tokens | Total | USD | Duración |
|---|---|---|---|---|---|
| claude-opus-4-7 | ≈900,000 | ≈55,000 | ≈955,000 | ≈$17.6 | ≈80m |

Estimación basada en sesión Opus 4.7 (1M context). Pricing referencia: $15/M input + $75/M output. Cifras exactas en `cost-ledger.jsonl` cuando se actualice (TBD).

## Referencias

- Plan estratégico: `docs/plans/executed/estrategia/sprint-02-security-hardening/00-INDEX.md`
- ADRs: `docs/plans/executed/arquitectura/ADR-001..005`
- Plan táctico: `docs/plans/executed/tactica/sprint-02-security-hardening/00-INDEX.md`
- Auditoría origen: `docs/security/CivicSys-Auditoria-Ciberseguridad.docx`
- Devlog Sprint anterior: `docs/aegis/devlogs/2026-05-21-sprint1-mvp.md`
- Protocolo: `C:/dev/protocols/AEGIS/AEGIS-PROTOCOL.md` (v2.1.0)

## Estado AEGIS

- [x] Plan estratégico escrito.
- [x] ADRs emitidos (5).
- [x] Plan táctico escrito.
- [x] Gate humano 1 ✅ aprobado.
- [x] Ejecución completa (T-01..T-19).
- [x] Verificación (T-20): 136 tests verde + solhint 0 errors.
- [x] Gate humano 2 ✅ aprobado.
- [x] Plan movido a `executed/`.
- [x] Devlog escrito (este archivo).
- [x] CLAUDE.md creado.
- [x] `docs/INDEX.md` creado.
- [ ] Memoria persistente actualizada (en curso).
- [ ] Commit creado (pendiente).
- [ ] Push / PR (humano decide).
