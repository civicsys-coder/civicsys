# ADR-008 — Dedupe facial off-chain (cosine + umbral)

**Fecha**: 2026-05-29
**Estado**: ACEPTADO
**Decisor**: Orlando (orquestador AEGIS)
**Input**: spec §6.3 (dedupe Hermes), §8 (privacidad), §11.4 · decisiones D2/D6

## Contexto

La unicidad on-chain (`usedDni`/`usedFace` en `IdentitySBT`) bloquea reutilizar un
`dniHash` o un `faceCommitment` **exactos**. Pero una persona podría intentar registrarse
con un documento distinto y la misma cara: el commitment cambia, on-chain no lo detecta.
Se necesita un **dedupe por similitud de rostro** que detecte "la misma cara" aunque el
commitment difiera. Esto es off-chain por naturaleza (comparar vectores, no hashes).

## Opciones evaluadas

### Dónde corre
- **Hermes (agents), off-chain (RECOMENDADA)** — Hermes ya lee, no firma; encaja con el
  rol "lee on-chain / sirve API / no custodia".
- On-chain — inviable: comparar embeddings en Solidity es prohibitivo en gas y expone biometría.

### Métrica e índice
- **Similitud coseno sobre embeddings, umbral configurable (default 0.92)
  (RECOMENDADA)** — estándar para embeddings faciales; umbral ajustable por el caller.
- Distancia euclídea / L2 — válida, pero coseno es robusto a magnitud y es lo que pgvector
  soporta nativamente (`<=>`).

### Almacenamiento
- **In-memory para el hackathon, interfaz lista para pgvector (RECOMENDADA)** — el repo ya
  tiene pgvector cableado (`memory.py`); el `FaceIndex` expone `add`/`query` para migrar sin
  tocar callers.
- pgvector vivo desde ya — más infra; se difiere (la interfaz queda lista).

## Decisión

`FaceIndex` en `agents/`: índice **in-memory** de `(embedding[384], faceCommitment)` con
**similitud coseno** y umbral configurable (default **0.92**). `IdentityService` lo
encapsula y expone `register_face` (idempotente por commitment) y `dedupe`. Endpoints
`POST /agents/identity/{dedupe-face, register-face}`. Hermes **no firma** on-chain. Se
persiste **solo el embedding** (dato biométrico derivado), nunca la imagen.

## Justificación

- **Detecta el mismo rostro** aunque cambie el documento → cierra el flanco que la unicidad
  on-chain no cubre.
- **Coseno + umbral** es simple, explicable y portable a pgvector (`1 - (a <=> b)`).
- **Privacidad**: nunca se guarda la foto; el embedding es un derivado; consentimiento
  explícito en la UI. Para el mock, los embeddings son sintéticos (riesgo real bajo), pero
  el diseño respeta el principio para cuando sea real.
- **Idempotencia por commitment** evita duplicar entradas si se reintenta el registro.

## Consecuencias

### Positivas
- 1-persona-1-identidad reforzado en la dimensión biométrica.
- Interfaz `add`/`query` → swap a pgvector sin tocar el wizard ni los endpoints.

### Negativas / límites honestos
- **El mock NO es reconocimiento facial real**: el embedding se deriva por hash de los
  bytes de la imagen (determinista), no por una red neuronal. No detecta la misma cara en
  dos fotos distintas — solo la misma imagen. Es una **demostración del flujo**, no
  seguridad biométrica. Documentado en `docs/security/known-limitations.md`.
- El umbral 0.92 es arbitrario para el mock; con embeddings reales hay que calibrarlo con
  un dataset (trade-off falsos positivos/negativos).
- In-memory: el índice se pierde al reiniciar Hermes (aceptable para demo; pgvector lo
  resuelve).

## Implementación (referencia)

- `agents/app/face_index.py` — `cosine_similarity`, `FaceIndex(add/query)`, `DedupeResult`.
- `agents/app/identity.py` — `IdentityService(register_face/dedupe)`.
- `agents/app/main.py` — endpoints `/agents/identity/dedupe-face` y `/register-face`.
- Frontend `lib/identity-api.ts` consume estos endpoints en `StepVerify`/`StepMint`.

## Referencias

- pgvector (operador `<=>` coseno). spec §6.3, §8. ADR-002 (memoria/HMAC).

## Cuándo revisar este ADR

- Al integrar un modelo facial real (face-api.js / MediaPipe / server-side): recalibrar
  umbral, migrar a pgvector, revisar consentimiento y retención del dato biométrico.
