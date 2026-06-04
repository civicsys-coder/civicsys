# Devlog · 2026-05-30 · Sprints 04-06 — los 3 subsistemas restantes

> Ejecutados en autonomía delegada por el usuario ("continua con todos los sprints sin
> parar"). Patrón del proyecto: **funcional y demoable, con los mocks honestamente
> documentados** (igual que la identidad del Sprint 03). Cada sprint: diseño (ADR) → TDD →
> tests → security note → merge a main.

## Sprint 04 — Votación anónima por nullifier

- **`AnonymousVote.sol`** (reemplaza el stub): `castAnonymous(proposalId, choice, nullifier)`.
  Mecanismo de **nullifier REAL on-chain** — previene el doble voto y desliga al votante de su
  identidad (el voto lo emite un relayer; el `msg.sender` no identifica). Tally público. 6 tests.
- **`lib/nullifier.ts`** — `keccak256(identitySecret || proposalId)`; secreto local por
  navegador. 3 tests.
- **`/votacion`** funcional: vota, ves el tally en vivo, no podés votar dos veces.
- **Mock honesto (L-17, ADR-010)**: la prueba ZK de membresía (que el nullifier deriva de una
  Cédula válida) está mockeada → no hay gating a ciudadanos. Producción: Semaphore.

## Sprint 05 — Hermes multicanal

- **`ChannelCoordinator`** — unicidad de registro **compartida cross-canal** (registrate una
  vez, bloqueado en Telegram/Discord/WhatsApp). Lógica real y testeada (5 tests).
- **Adaptadores** Telegram/Discord/WhatsApp — transporte **mock in-memory** (colas), la
  conexión live necesita tokens del operador.
- Endpoints `POST /agents/channels/register`, `GET /agents/channels/status`.
- **Mock honesto (L-18)**: transporte mockeado + dedupe por `person_ref` (handle), no por
  identidad canónica.

## Sprint 06 — Hermes «La Tóxica»

- **`toxica.py`** funcional: `LaToxica.analyze_session(proposal_id, transcript, tally)` →
  `GapReport`. Deriva la posición ciudadana del tally, compara con el acta de sesión
  (sanitizada, anti prompt-injection), y redacta un **post público de accountability** con
  Gemini (fallback simulado). 3 tests + endpoint.
- **Human-in-the-loop**: `approved=False` — el post es un borrador; publicar es una acción
  humana explícita. La Tóxica no publica sola (decisión D8).
- Endpoint `POST /agents/toxica/analyze`. Página **`/toxica`** funcional (analizar → borrador →
  aprobar y publicar).

## Verificación

- blockchain **40** · backend **24** · frontend **48** (cov 86%) · agents **87** (cov 89.7%).
- `pnpm build` del frontend OK: rutas `/registro`, `/votacion`, `/toxica`, `/hermes`, `/sistema`.
- Hermes (Docker) con Gemini real verificado en los 3 endpoints nuevos.

## Estado del producto

Los **4 subsistemas del hackathon** están demoables end-to-end:
1. Identidad única (Cédula Cívica soulbound) — Sprint 03.
2. Registro multicanal — Sprint 05.
3. Votación anónima 1-persona-1-voto — Sprint 04.
4. Accountability legislativo (La Tóxica) — Sprint 06.

Todo en `main`. Las limitaciones aceptadas (mocks) están en `docs/security/known-limitations.md`
(L-11..L-18). Honestidad arquitectónica: esto demuestra los **flujos**; varias piezas
criptográficas/de integración pesadas (ZK membership, biometría real, bots con tokens, attestor
+ multisig) quedan documentadas como deuda de producción.
