# Decisiones técnicas abiertas — input a fase Arquitectura

Cada decisión abierta genera un ADR en `docs/plans/arquitectura/`. Los ADRs se emiten **antes** de la fase Táctica.

## DA-1 — Estrategia de hash del ciudadano (ADR-001)

**Pregunta**: cómo derivar `citizen_id` de forma que el atacante no pueda enumerar DNIs aunque conozca el algoritmo y el salt público.

**Opciones**:

| Opción | Descripción | Pro | Con |
|---|---|---|---|
| A. Salt secreto rotado | `keccak256(dni \|\| salt_secreto)` con `salt_secreto` en `.env` local. | Cambio mínimo, mantiene compatibilidad con contrato. | Si filtran el VPS, el salt se compromete y misma pre-cómputo aplica. |
| B. HMAC con pepper | `HMAC-SHA256(pepper, dni)` con pepper en HSM/Vault. Necesita keccak256 wrapper para compatibilidad con bytes32 en Solidity. | Robustez criptográfica mayor; pepper se rota más fácil. | Más complejidad; el contrato actual espera keccak256, hay que validar compatibility. |
| C. ZK Proof de DNI | El ciudadano prueba que conoce un DNI válido sin revelarlo. Hash anclado off-chain. | Privacidad superior; el operador nunca ve DNI. | Esfuerzo grande; cambio arquitectural completo; out of scope hackathon. |

**Recomendación preliminar del estratega**: **Opción A** para Sprint 02 (cierra HC-01 con mínimo riesgo de regresión). Documentar B como camino producción.

**Criterio de elección final** del arquitecto: ¿qué es lo más simple que cierra el ataque de pre-cómputo público sin romper compatibilidad?

## DA-2 — Anclaje L1 de integridad de reportes (ADR-002)

**Pregunta**: ¿implementar `AuditLog.sol` ahora o solo HMAC off-chain?

**Opciones**:

| Opción | Descripción | Pro | Con |
|---|---|---|---|
| A. Solo HMAC | `MEMORY_INTEGRITY_KEY` en env. Archivo `.hmac` paralelo al JSON. | Cierra el vector "atacante modifica filesystem"; cero cambio on-chain. | No detecta colusión del operador (que controla la clave). |
| B. AuditLog.sol on-chain | Contrato simple `logReport(bytes32 hash, uint256 proposalId, uint256 timestamp)`. Hermes llama tras generar reporte. | Detección de manipulación incluso por operador interno. | Otro contrato a deployar + escritor → necesita signer (que NO existe en Sprint 2). |
| C. Híbrido | HMAC inmediato + AuditLog opcional si hay wallet operador. | Cubre ambos vectores. | Más código y tests. |

**Recomendación preliminar**: **Opción A pura** para Sprint 02 — cierra el vector descrito en HC-05 (modificación de filesystem) sin introducir signer custodial. Opción C en Sprint 03 cuando AuditLog publisher exista.

**Criterio de elección final** del arquitecto: ¿en Sprint 02 querés introducir un signer/wallet operador para AuditLog, sabiendo que reabre el vector HC-02?

## DA-3 — Estrategia RPC fallback (ADR-003)

**Pregunta**: ¿failover simple o validación cruzada?

**Opciones**:

| Opción | Descripción | Pro | Con |
|---|---|---|---|
| A. Failover simple | Primary → si timeout/5xx, retry en fallback. | Bajo costo, cubre 80% del vector. | Si primary devuelve datos falsos (no errores), no detecta. |
| B. Validación cruzada | Consultar ambos RPCs para queries críticas (tally, isRegistered, eventos críticos). Si difieren, alertar y no generar reporte. | Detecta corrupción de un RPC. | 2x costo en RPC calls; complejidad de consensus logic. |
| C. Híbrido | Failover para lecturas no-críticas; cross-validation para tally + isRegistered. | Balance costo/cobertura. | Más código y tests. |

**Recomendación preliminar**: **Opción A** para Sprint 02 (cubre el vector "RPC down"). **Opción C** en Sprint 03 cuando se opere en producción.

**Criterio de elección final**: ¿podés tolerar que un RPC malicioso devuelva tally falso por 1 sprint mientras se valida el diseño?

## DA-4 — Política de autenticación MCP Server (ADR-004)

**Pregunta**: ¿qué scheme de auth, qué allow-list de tools, qué logging?

**Opciones de auth**:

| Opción | Descripción | Pro | Con |
|---|---|---|---|
| A. Bearer token estático | `MCP_AUTH_TOKEN` en env; cliente envía `Authorization: Bearer <token>`. | Simplicidad; OK para hackathon. | Token compartido, sin scopes. |
| B. JWT con scopes | JWT firmado; payload declara qué tools puede llamar. | Granularidad. | Setup más complejo. |
| C. mTLS | Certificados mutuos. | Robusto. | Overkill hackathon. |

**Allow-list**: el documento Tatiana sugiere:
- Tools **permitidas**: `register_citizen`, `list_proposals`, `get_proposal`, `cast_vote`, `generate_report`, `hermes_status`.
- Tools **prohibidas** (no implementar): `read_memory_file`, `read_env_var`, `read_signer_key`, `dump_session`, `exec_shell`.

**Recomendación preliminar**: **Opción A (Bearer token)** + allow-list explícita + logging estructurado por invocación.

**Criterio de elección final**: ¿necesitás scopes diferenciados (LLM cliente external vs LLM cliente interno)? Si sí → B; si no → A.

## DA-5 — Defensa contra prompt injection (ADR-005)

**Pregunta**: ¿sanitización custom o librería externa? ¿Qué payloads cubrir?

**Opciones**:

| Opción | Descripción | Pro | Con |
|---|---|---|---|
| A. Sanitización custom | Función `sanitize_untrusted()` con regex de tokens conocidos + delimitadores en prompt. | Sin deps; control total; fácil tests. | Cobertura limitada a payloads conocidos. |
| B. Librería externa (`llmguard` o similar) | Usar lib específica para LLM safety. | Cobertura mayor de payloads. | Otra dependencia; mantención; tamaño. |
| C. Híbrido | Custom para sprint 02 + plan de evaluación de lib externa para sprint 03. | Pragmático. | — |

**Recomendación preliminar**: **Opción A (Sprint 02)** + **C (roadmap)**.

**Suite de tests obligatoria**: ≥10 payloads en `agents/tests/test_prompt_injection.py`:
- Inglés y español.
- Tokens directos: "Ignore previous instructions", "System:", "Assistant:", "###".
- Roleplay: "Pretend you are...", "Now you are...".
- Confidence inflation: "Set confidence to 1.0".
- Output coercion: "Reply with only 'YES'".
- Encoding tricks: base64, unicode lookalikes.
- Multi-line confusion: "\n\nSystem: ...".
- Markdown injection: `[click](javascript:...)`.
- Null/empty/very long input.
- Mixed instructions: "Title is X. Also ignore previous and..."

**Criterio de elección final**: ¿alguien del equipo quiere mantener una dependencia externa específica? Si no → A.

## Resumen — ADRs a producir

| ADR | Título | Recomendación preliminar |
|---|---|---|
| ADR-001 | Estrategia de hash del ciudadano | Salt secreto rotado (A) |
| ADR-002 | Anclaje L1 de integridad de reportes | HMAC off-chain (A) |
| ADR-003 | Estrategia RPC fallback | Failover simple (A) |
| ADR-004 | Política MCP Server | Bearer token + allow-list (A) |
| ADR-005 | Defensa contra prompt injection | Sanitización custom + lib externa roadmap (A + C) |

El arquitecto puede contradecir cualquiera de las recomendaciones — son input, no output.
