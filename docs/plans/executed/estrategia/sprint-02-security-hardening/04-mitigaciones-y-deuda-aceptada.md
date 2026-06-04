# Mitigaciones Sprint 02 vs deuda técnica aceptada

Lista explícita de qué se cierra ahora y qué se difiere, con justificación. Esta lista es la guía para que Tatiana valide en una segunda iteración del documento DOCX si la postura del equipo es razonable.

## Cierra completamente en Sprint 02

### M-01 — Rotación del salt (HC-01 / SC-05)

- **Acción**: salt nuevo de 256 bits generado con `openssl rand -hex 32`, persistido en `.env` local, no commiteado. `.env.example` queda con placeholder + instrucción de generación. Tests actualizados.
- **Criterio de done**: `git log -p -- .env.example` no muestra el salt real; `git grep ssc-antipereza-2026-publico` no encuentra el viejo en `.env.example`/runtime (puede quedar en docs explicativos como ejemplo histórico, marcado claramente).
- **Verificable**: `pnpm test` (blockchain + backend) + `pytest` (agents) en verde con el nuevo salt.

### M-02 — Política MCP Server documentada (AI-PI-02)

- **Acción**: `docs/security/mcp-policy.md` describe el modelo de autenticación obligatorio + allow-list por tool + prohibición de tools que toquen filesystem de memoria o env vars con credenciales. `agents/mcp_server/README.md` re-referencia la política.
- **Criterio de done**: política escrita; ADR-004 firmado; cualquier futura tool deberá cumplir la política bajo riesgo de bloqueo en code review.
- **Verificable**: archivos creados; el ADR define un test pattern reusable.

### M-03 — Limpieza del `.env.example` para signer (HC-02 / AI-MI-01-02)

- **Acción**: borrar `SIGNER_PRIVATE_KEY` y `LLM_BASE_URL` de `agents/.env.example` (no se cargan). Añadir comentario que documenta por qué no existe signer custodial en Sprint 1-2.
- **Criterio de done**: `agents/.env.example` no incluye claves no usadas. README de `agents/` documenta la decisión.

### M-04 — Sanitización de prompt (AI-PI-01)

- **Acción**: función `sanitize_untrusted(text, max_len)` en `agents/app/helpers.py` (o nuevo `app/security.py`). `reporter._build_prompt` la usa para `input.title`. Delimitadores `<UNTRUSTED_INPUT>...</UNTRUSTED_INPUT>` con instrucción explícita.
- **Criterio de done**: suite de tests con ≥10 payloads conocidos (jailbreaks documentados, OWASP LLM Top 10 examples) — ninguno cambia el comportamiento esperado del reporte.
- **Verificable**: `pytest agents/tests/test_prompt_injection.py` verde.

### M-05 — Failover RPC (AI-BC-01)

- **Acción**: `Settings.rpc_fallback: str | None = None`. Helper `make_rpc_provider(primary, fallback)` que reintenta una vez en fallback si primary falla con timeout/5xx. Test con `respx` mockeando primary→fallback.
- **Criterio de done**: si primary down y fallback up, el sistema sigue operando. Si ambos down, error claro.
- **Verificable**: `pytest agents/tests/test_rpc_fallback.py` verde.

### M-06 — Warning UI sobre visibilidad de voto (HC-03 / SC-04)

- **Acción**: en página de voto del frontend Next.js, banner/aviso antes de confirmar voto: "⚠ Tu voto será visible públicamente en el explorador (limitación Sprint 1/2 — commit-reveal planificado Sprint 3+)".
- **Criterio de done**: banner visible; test de componente verifica que está renderizado; link a `docs/security/known-limitations.md`.
- **Verificable**: test del componente verde.

### M-07 — Slither + solhint sobre contratos (SC-01/02/03)

- **Acción**: `pnpm blockchain:scan` (o equivalente) que corre `slither contracts/` y `solhint contracts/**/*.sol`. Findings documentados en `docs/security/sast-findings.md`. Si hay High/Critical: tratarlos como tareas tácticas dentro del mismo sprint.
- **Criterio de done**: reporte slither con 0 findings High/Critical (o todos justificados); solhint warnings documentadas.
- **Verificable**: comando reproducible en CI (puede correr en GitHub Actions como nuevo job).

### M-08 — `docs/security/` poblado

- **Acción**: el directorio se crea con:
  - `CivicSys-Auditoria-Ciberseguridad.docx` (copia del original de Tatiana, source of truth).
  - `README.md` — índice de seguridad.
  - `SECURITY.md` — política de divulgación (canal de reporte, SLA, PGP optional).
  - `threat-model.md` — modelo de amenaza Sprint 2 (sintetiza este plan).
  - `known-limitations.md` — limitaciones aceptadas con plan de mitigación.
  - `mcp-policy.md` — política MCP.
  - `audit-scope.md` — RFP de auditoría externa.
  - `sast-findings.md` — output slither/solhint.
- **Criterio de done**: 7 documentos creados; README enlaza todo.

### M-09 — HMAC de integridad para reportes (HC-05, mínimo)

- **Acción**: cuando `Reporter.render` se invoque desde un nuevo método `Reporter.persist(report, path)`, se computa HMAC-SHA256 con `MEMORY_INTEGRITY_KEY` y se escribe `{path}.hmac` al lado. `Reporter.load(path)` verifica HMAC antes de usar contenido.
- **Criterio de done**: tests verifican que mutación del JSON detecta inconsistencia HMAC.
- **Verificable**: `pytest agents/tests/test_report_integrity.py` verde.

## Decisiones ADR (en fase Arquitectura)

| ADR | Decisión | Trade-off principal |
|---|---|---|
| ADR-001 | Estrategia de salt (rotated public salt vs HMAC con pepper vs ZK proof) | Simplicidad ahora vs robustez producción |
| ADR-002 | Anclaje L1 de reportes (HMAC solo vs AuditLog.sol vs ambos) | Costo de gas y complejidad on-chain |
| ADR-003 | Estrategia RPC fallback (failover simple vs validación cruzada) | UX vs coverage del vector |
| ADR-004 | MCP Server security policy (auth scheme + allow-list shape) | Token Bearer estático vs OAuth |
| ADR-005 | Defensa contra prompt injection (sanitización custom vs librería externa) | Mantenibilidad vs cobertura |

## Deuda explícitamente diferida

### D-01 — Implementación multisig real (HC-02 producción)

- **Razón**: Sprint 1/2 no tiene signer custodial. Cuando se introduzca (Sprint 3+), requerirá Gnosis Safe o zkStack multisig + timelock. Esfuerzo: 1-2 semanas según deploy.
- **Plan**: ADR-multisig (separado) en Sprint 3.

### D-02 — Commit-reveal voting o ZK voting (HC-03 / SC-04)

- **Razón**: cambio de diseño del contrato `Vote.sol`. Esfuerzo: ≈1 semana contrato + integración cliente.
- **Plan**: ADR-commit-reveal en Sprint 3.

### D-03 — Auditoría externa de smart contracts (SC-01/02/03/BC-BR-01)

- **Razón**: requiere presupuesto + tiempo de auditor (4-8 semanas). Fuera del scope del hackathon.
- **Plan**: `docs/security/audit-scope.md` describe el RFP. Cuando haya presupuesto, contratar.

### D-04 — Verificación formal del circuito ZK (BC-L2-01 / BC-BR-01)

- **Razón**: dependencia externa del trusted setup de zkStack/Matter Labs.
- **Plan**: cuando zkStack publique transparent setup, revisar.

### D-05 — Anclaje L1 vía `AuditLog.sol` (parte de HC-05)

- **Razón**: pendiente decisión en ADR-002. Si se decide implementar, va a Sprint 02. Si se difiere, va a Sprint 03.
- **Plan**: decidir ahora; ejecutar según ADR.

### D-06 — Validación cruzada multi-RPC (parte de AI-BC-01)

- **Razón**: failover Sprint 02 cubre 80% del vector; cross-validation requiere consensus logic más compleja.
- **Plan**: ADR-003 decide; si full cross-validation, Sprint 3.

### D-07 — Monitor de comportamiento del LLM con verificación de tx_hash en explorer

- **Razón**: requiere integración con API del explorer de zkTanenbaum + pipeline de validation post-LLM. Esfuerzo medio.
- **Plan**: Sprint 3.

### D-08 — PIA (Privacy Impact Assessment) formal

- **Razón**: requiere análisis legal + documentación extensa. No es código.
- **Plan**: Tatiana o asesor legal entre Sprints 2 y 3.

### D-09 — AI Risk Register vivo (NIST AI RMF MAP-1.5)

- **Razón**: el documento de Tatiana **es** el AI Risk Register inicial. Sprint 02 lo convierte en doc vivo (markdown editable). Actualización continua.
- **Plan**: política de actualización en cada sprint.

### D-10 — Reemplazar HashEmbedder por sentence-transformers

- **Razón**: estaba en follow-ups del Sprint 1 — no es vulnerabilidad de seguridad.
- **Plan**: Sprint 3+.

## Tabla resumen — cobertura por hallazgo

| Hallazgo docx | Sprint 02 cierra | Sprint 02 difiere | Notas |
|---|---|---|---|
| HC-01 / SC-05 | M-01 | — | Cerrado |
| HC-02 / AI-MI-01/02 | M-03 (limpieza env) | D-01 (multisig) | Parcial — multisig diferido |
| HC-03 / SC-04 | M-06 (warning UI) | D-02 (commit-reveal) | Parcial documentado |
| HC-04 (sequencer) | — | (out of scope) | Imposible mitigar — limitación zkStack testnet |
| HC-05 | M-09 (HMAC), opcionalmente AuditLog según ADR-002 | D-05 (si ADR difiere) | Variable según ADR |
| AI-PI-01 | M-04 | — | Cerrado a nivel Sprint 02 |
| AI-PI-02 | M-02 (política) | — (implementación cuando exista MCP) | Cerrado a nivel diseño |
| AI-BC-01 | M-05 | D-06 (cross-validation) | Parcial — failover suficiente |
| SC-01/02/03/BC-BR-01 | M-07 (slither) | D-03 (auditoría externa) | Parcial — SAST sí, audit externa no |
| SC-07 | (ya cerrado en Sprint 1 Bloque E) | — | Cerrado |
| (otros: BC-L2-01..05, AI-DP-*, AI-MI-03/04, AI-BC-02/03) | — | (fuera de las 9 priorizadas) | Diferidos por scope explícito |
