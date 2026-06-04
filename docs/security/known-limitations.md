# Limitaciones conocidas — CivicSys Sprint 02

Catalogo de limitaciones de seguridad **aceptadas y documentadas** para esta versión, con su plan de mitigación. Refleja el principio de honestidad arquitectónica: lo que no se mitiga, se declara explícitamente.

## L-01 — Voto visible en calldata del explorador

**Origen**: HC-03 / SC-04 (auditoría Tatiana).

**Descripción**: el contrato `Vote.sol::castVote(uint256 proposalId, Choice choice)` emite `choice` en claro. Cualquier observador del explorer de zkTanenbaum o de la mempool puede correlacionar la wallet del votante con su elección.

**Severidad**: ALTA.

**Por qué se acepta en Sprint 02**: la solución (commit-reveal o ZK voting) requiere refactor del contrato y del cliente. No cabe en el sprint de hardening.

**Mitigación parcial Sprint 02**:
- Banner visible en la UI de voto: "Tu voto será visible en el explorador hasta que se implemente commit-reveal".
- Documentación pública de la limitación (este archivo).

**Mitigación futura (Sprint 3+)**: ADR-006 (TBD) sobre commit-reveal en dos fases o ZK voting con circuit PLONK.

---

## L-02 — Sequencer centralizado de zkTanenbaum

**Origen**: HC-04 / BC-L2-02 (auditoría Tatiana).

**Descripción**: zkTanenbaum es una testnet con sequencer centralizado operado por Matter Labs / equipo zkStack. Forced transactions no están activas. El sequencer puede censurar transacciones de voto sin recurso.

**Severidad**: ALTA en testnet pública. CRÍTICA si se opera con datos ciudadanos reales.

**Por qué se acepta**: limitación de diseño del protocolo subyacente, no controlable por CivicSys.

**Mitigación**: ninguna en testnet. Migrar a mainnet con forced transactions activas para producción. Documentar visiblemente en la UI ciudadana ("opera sobre testnet con sequencer centralizado").

---

## L-03 — Verificador PLONK on-chain confiable

**Origen**: BC-L2-01 / BC-BR-01 (auditoría Tatiana).

**Descripción**: la garantía ZK del sistema es tan fuerte como la corrección del verificador PLONK desplegado en Syscoin NEVM. Cualquier bug en el verificador permite que pruebas falsas actualicen el stateRoot.

**Severidad**: CRÍTICA si hay bug. BAJA en condiciones normales (verificador auditado por Matter Labs).

**Por qué se acepta**: dependencia externa.

**Mitigación**: monitorear comunicaciones oficiales de Matter Labs / zkStack sobre actualizaciones del verificador. Documentación pública de esta dependencia.

---

## L-04 — Bug bounty / auditoría externa de smart contracts pendiente

**Origen**: SC-01/02/03/BC-BR-01 (auditoría Tatiana, P2 de las 9 priorizadas).

**Descripción**: los contratos `CitizenRegistry.sol` y `Vote.sol` tienen tests al 100% statements y 96.88% branches, pero no han pasado auditoría externa profesional (Trail of Bits, ConsenSys Diligence, OpenZeppelin u otros).

**Severidad**: MEDIA. Los contratos son simples (≈30 y ≈90 líneas).

**Por qué se acepta**: presupuesto + tiempo de auditor externo fuera del scope del hackathon (4-8 semanas, ~USD 20-80k para contratos de este tamaño).

**Mitigación Sprint 02**: `slither` + `solhint` corridos. Findings documentados en `sast-findings.md`. RFP de auditoría externa en `audit-scope.md`.

**Mitigación futura**: cuando se decida operar mainnet, contratar auditoría profesional.

---

## L-05 — Salt único secreto (no en HSM)

**Origen**: HC-01 / SC-05 mitigación parcial.

**Descripción**: tras rotar el `PUBLIC_SALT` (ADR-001), el valor secreto vive en `.env` local de cada componente. Si el VPS de Hermes o del frontend es comprometido, el salt se filtra.

**Severidad**: MEDIA. La rotación cierra el ataque de pre-cómputo público; no cierra el ataque de VPS comprometido.

**Mitigación futura**: HMAC con pepper en HSM / AWS KMS / HashiCorp Vault. ADR-001 lo deja documentado.

---

## L-06 — Sin signer custodial (Sprint 1/2)

**Origen**: ausencia activa de HC-02 en este sprint.

**Descripción**: Hermes no firma transacciones. Cualquier feature que requiera escritura on-chain por parte del agente (ej. `AuditLog.sol::logReport`) requiere introducir un signer.

**Severidad**: BAJA en Sprint 02 (no aplica). Vuelve a MEDIA-ALTA cuando se introduzca signer.

**Mitigación cuando se reactive**: multisig 2-de-3 + timelock + signer en proceso aislado (ADR-002 documenta el camino).

---

## L-07 — Confianza en un único RPC para queries críticas

**Origen**: AI-BC-01 mitigación parcial.

**Descripción**: el failover RPC (ADR-003) cubre el caso "RPC primary down". NO cubre el caso "RPC primary devuelve datos falsos sin error". Si dos RPCs independientes responden cosas diferentes, el sistema no lo detecta en Sprint 02.

**Severidad**: BAJA en hackathon (operadores neutros). MEDIA en producción.

**Mitigación futura**: cross-validation multi-RPC en Sprint 3+ (ADR-003 Opción C).

---

## L-08 — Defensa contra prompt injection no exhaustiva

**Origen**: AI-PI-01 mitigación incompleta por estado del arte.

**Descripción**: `sanitize_untrusted` cubre payloads conocidos. Ataques novedosos (encoding tricks, multi-turn, prompt-injection-as-data-poisoning) pueden pasar el filtro.

**Severidad**: MEDIA. Depende del tráfico real y del valor del contenido manipulable.

**Mitigación futura**:
- Sprint 3+: evaluar libs externas (`llmguard`, `rebuff`, `nemo-guardrails`).
- Sprint 3+: monitor de comportamiento del LLM con verificación de `tx_hashes` en explorer.
- Revisión humana obligatoria en deliberaciones de alto impacto (política operativa).

---

## L-09 — Sin anclaje on-chain de integridad de reportes (Sprint 02)

**Origen**: HC-05 mitigación parcial.

**Descripción**: HMAC off-chain (ADR-002 Opción A) cierra el vector "atacante externo modifica filesystem". No cierra el vector "operador interno colude para alterar reportes y rota el HMAC".

**Severidad**: BAJA en hackathon. MEDIA cuando haya múltiples operadores con acceso al VPS.

**Mitigación futura**: `AuditLog.sol` on-chain (ADR-002 Opción C) en Sprint 03 cuando exista wallet operador.

---

## L-10 — Sin programa de respuesta a incidentes formal

**Origen**: NIST SP 800-53 IR-3/IR-4/IR-8 (recomendación de la auditoría).

**Descripción**: no existe runbook formal con SLAs por tipo de incidente.

**Severidad**: BAJA en hackathon. ALTA en producción.

**Mitigación Sprint 02**: SECURITY.md establece SLAs básicos de divulgación responsable. No es plan completo de respuesta a incidente.

**Mitigación futura**: cuando avancemos a producción, formalizar runbooks por tipo: COMPROMISO_KEY, MANIPULACION_REPORTE, INJECTION_DETECTADA. Borrador en `04-mitigaciones-y-deuda-aceptada.md` D-09 del plan estratégico.

---

# Sprint 03 — Identidad Soberana «Cédula Cívica»

> Limitaciones surgidas de la auditoría MNEMA del Sprint 03 (4 auditores adversarios:
> contratos, cripto/appsec, privacidad, red-team Sybil). Ver
> `docs/security/2026-05-30-sprint03-mnema-audit.md` para el reporte completo y qué se
> corrigió vs. qué se acepta. Honestidad arquitectónica: el subsistema de identidad es
> una **demostración de flujo** con mocks, NO seguridad biométrica de producción.

## L-11 — `mint()` sin binding al dedupe facial (anti-Sybil biométrico no exigible on-chain)

**Origen**: auditoría MNEMA Sprint 03 (red-team V1, CRÍTICA).

**Descripción**: la unicidad on-chain de `IdentitySBT` (`usedDni`/`usedFace`) solo impide
**reutilizar el mismo commitment exacto**. El dedupe facial (única defensa contra "misma
persona, otro documento") vive en Hermes/cliente y **NO es precondición de `mint()`**: un
atacante puede llamar `mint()` directo con un DNI nuevo + cualquier embedding desde N
wallets y obtener N Cédulas → N votos. La unicidad dual cierra el *replay exacto*, no el
Sybil de un atacante que controla sus inputs.

**Severidad**: CRÍTICA para producción. Aceptada en hackathon (mock, sin attestor — spec §12).

**Mitigación futura**: `mint()` debe exigir firma de un **attestor** (EIP-712) emitida solo
tras pasar dedupe+registro, con **multisig 2-de-3** (ya previsto en CLAUDE.md / ADR-002,
ADR-006). Convierte el dedupe en precondición criptográfica del alta.

## L-12 — Padrón biométrico off-chain: best-effort, sin binding ni persistencia

**Origen**: auditoría MNEMA Sprint 03 (red-team V3/V4/V5).

**Descripción**: (a) `registerFace` en `StepMint` es best-effort (try/catch): si falla, el
mint igual queda y el rostro nunca entra al índice → el próximo no lo detecta. (b) Hermes no
verifica que el `faceCommitment` registrado corresponda al `embedding` ni a un mint on-chain.
(c) El `FaceIndex` es in-memory: un reinicio de Hermes borra el padrón.

**Severidad**: ALTA producción. Aceptada en hackathon.

**Mitigación futura**: derivar el padrón de los eventos `CedulaMinted` on-chain (fuente de
verdad), no de un POST del cliente; persistir en pgvector (interfaz ya lista, ADR-008);
validar el binding `faceCommitment ⇔ embedding ⇔ holder`.

## L-13 — Embedding facial mock (no es reconocimiento facial real)

**Origen**: ADR-008 + auditoría MNEMA (red-team V2).

**Descripción**: `embedFace` es un hash determinista de bytes, no un descriptor facial. No
reconoce la misma cara en dos fotos distintas; el umbral 0.92 es irrelevante. Además
`StepFaceCapture` siembra los bytes con `performance.now()` (cada captura es única) — elegido
para que la **demo** muestre registros distintos, pero degrada incluso el determinismo-por-imagen.

**Severidad**: por diseño (mock). Documentada.

**Mitigación futura**: integrar face-api.js/MediaPipe o modelo server-side + template
protection (no guardar el embedding crudo reversible); recalibrar umbral con dataset.

## L-14 — `dniHash`/`faceCommitment` reversibles: `PUBLIC_SALT` expuesto al cliente

**Origen**: auditoría MNEMA Sprint 03 (cripto + privacidad, ALTA). Relacionada con L-05.

**Descripción**: el hash del DNI se calcula client-side con `NEXT_PUBLIC_PUBLIC_SALT`, que se
embebe en el bundle JS → es público. Con el salt conocido y el espacio de DNI = 10^8,
cualquiera precomputa la tabla y **revierte cualquier `dniHash` on-chain a un DNI**. "Hash de
PII con sal pública" ≠ "no PII". (Sprint 03 mitigó parcialmente quitando `dniHash`/
`faceCommitment` del `tokenURI` público — ya no están en la metadata.)

**Severidad**: ALTA (privacidad del padrón).

**Mitigación futura**: mover el hashing del DNI a un servicio server-side con **pepper
secreto** (HMAC, clave que nunca toca el cliente); el cliente envía el DNI sobre TLS. El salt
client-side no puede ser secreto por construcción.

## L-15 — Endpoints de identidad sin autenticación ni rate limiting

**Origen**: auditoría MNEMA Sprint 03 (privacidad MEDIA).

**Descripción**: `/agents/identity/{dedupe-face,register-face}` son públicos (CORS a
localhost). Sprint 03 mitigó el oráculo de enumeración (dedupe ahora devuelve **solo**
`{duplicate}`, sin `topMatch`/`similarity`; `threshold` ya no es cliente-controlable;
`faceCommitment` se valida como hex). Falta autenticación de sesión y rate limiting:
`register-face` aún podría spammearse para envenenar el índice.

**Severidad**: MEDIA.

**Mitigación futura**: autenticar `register-face` en el flujo de registro; rate limiting por
IP/sesión en ambos endpoints (`slowapi`).

## L-16 — Clave privada en memoria del wizard durante toda la sesión

**Origen**: auditoría MNEMA Sprint 03 (cripto MEDIA).

**Descripción**: la private key en claro se guarda en el contexto global de React
(`WizardProvider`) desde `StepWallet` hasta `reset()` (fin del mint). Ventana amplia para robo
vía XSS o dependencia comprometida. Inherente a una wallet web no-custodial, pero la
exposición es más larga de lo necesario.

**Severidad**: MEDIA.

**Mitigación futura**: no propagar `privateKey` al contexto global; re-derivarla del keystore
cifrado + contraseña solo en el instante de firmar; limpiar el estado tras `writeContract`.
Endurecer CSP.

---

# Sprint 04 — Votación anónima

## L-17 — Votación anónima: prueba de membresía mockeada (sin Sybil-resistance)

**Origen**: ADR-010 (decisión de implementación pragmática).

**Descripción**: `AnonymousVote.sol` implementa el mecanismo de **nullifier real** (no doble
voto + unlinkability del votante) pero **NO verifica que el nullifier derive de una Cédula
válida** — acepta cualquier nullifier no-cero. El voto es anónimo y no-repetible por nullifier,
pero **no está gateado a ciudadanos**: cualquiera con un nullifier nuevo vota. Equivalente al
mock biométrico del Sprint 03: demuestra el flujo (anonimato + no-doble-voto), no la seguridad
completa.

**Severidad**: CRÍTICA para producción. Aceptada en hackathon (demo del mecanismo).

**Mitigación futura**: integrar **Semaphore** (Merkle de Cédulas + Groth16 de pertenencia) o un
attestor que firme nullifiers válidos. La firma de `castAnonymous` ya es subconjunto de
`castAnonymous(proposalId, choice, merkleRoot, nullifier, proof)`.

---

# Sprint 05 — Hermes multicanal

## L-18 — Canales con transporte mock + dedupe por person_ref (no por identidad canónica)

**Origen**: Sprint 05 (implementación pragmática).

**Descripción**: la unicidad cross-canal del `ChannelCoordinator` es real y testeada, pero
(a) el transporte de cada canal es **mock in-memory** — la conexión live a Telegram/Discord/
WhatsApp necesita **tokens/bot credentials del operador** + verificación de webhook; (b) el
dedupe es por `person_ref` normalizado (id del canal), no por una **identidad canónica**
verificada — un mismo humano con handles distintos en cada plataforma no se detecta.

**Severidad**: por diseño (mock de transporte) + MEDIA (dedupe por handle).

**Mitigación futura**: adaptadores reales con verificación de firma de webhook; mapear cada
`person_ref` a la identidad canónica (Cédula / `IdentityService` facial) para dedupe por
humano, no por handle; rate limiting y anti-spam por canal.

---

## Cómo revisar estas limitaciones

Cada sprint subsecuente debe revisar este archivo:
- ¿Se cerró alguna L-NN? → moverla a `CHANGELOG.md` con commit que la cerró.
- ¿Apareció una nueva limitación aceptada? → agregarla con número siguiente.
- ¿Cambió la severidad por cambio de contexto (deploy producción, etc.)? → actualizar.
