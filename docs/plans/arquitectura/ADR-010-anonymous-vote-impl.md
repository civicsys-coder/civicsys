# ADR-010 — Votación anónima: implementación pragmática por nullifier

**Fecha**: 2026-05-30
**Estado**: ACEPTADO
**Decisor**: orquestador AEGIS (autonomía delegada por el usuario para Sprints 04-06)
**Input**: ADR-009 (esqueleto nullifier/ZK), spec §7

## Contexto

ADR-009 definió el approach (nullifier + prueba de membresía ZK, candidato Semaphore) pero
lo dejó como esqueleto. Semaphore completo (árbol de Merkle de Cédulas + circuito Groth16 +
verifier on-chain + trusted setup + prover client-side) es demasiado para el alcance/tiempo y
requiere ceremonia de setup. El proyecto tiene un **patrón establecido** (Sprint 03): entregar
el **flujo real y demoable** con la parte criptográfica pesada **mockeada y honestamente
documentada**.

## Decisión

Implementar el **mecanismo de nullifier real y on-chain**, con la **prueba de membresía
mockeada**:

- **`AnonymousVote.sol`**: `castAnonymous(proposalId, choice, nullifier)`. Mantiene
  `nullifierUsed[proposalId][nullifier]` y un tally por propuesta. Revierte si el nullifier ya
  se usó en esa propuesta. **Esto es real y verificable on-chain.**
- **Nullifier** = `keccak256(identitySecret || proposalId)` derivado **off-chain** por el
  votante. La misma identidad produce el mismo nullifier en una propuesta (→ no puede votar dos
  veces) pero distinto en propuestas distintas (→ no se correlacionan sus votos). El nullifier
  es un hash sin preimagen pública: no revela la identidad.
- **Unlinkability**: el voto se emite desde una address cualquiera (no la wallet de la Cédula),
  así el `msg.sender` no liga el voto a la identidad. El tally es público; los votantes, no.
- **Mockeado (honesto)**: la **prueba ZK de que el nullifier deriva de una Cédula válida**
  (membership). En esta versión, el contrato acepta cualquier nullifier bien formado — es decir,
  **no gatea a ciudadanos** (cualquiera podría votar). Esto es el equivalente al mock biométrico
  del Sprint 03: demuestra el mecanismo (unlinkable + no-doble-voto), no la seguridad completa.

## Qué es real vs. qué es mock

| Propiedad | Estado |
|---|---|
| No doble voto por identidad/propuesta (nullifier único) | **REAL on-chain** |
| Unlinkability voto↔identidad (nullifier opaco + address libre) | **REAL** |
| Tally público y verificable | **REAL** |
| Gating a ciudadanos (solo holders de Cédula votan) | **MOCK** (necesita prueba ZK de membresía) |

## Consecuencias

- Demoable: votás anónimo, no podés votar dos veces, el tally sube, tu identidad no se revela.
- **Limitación crítica (L-17)**: sin la prueba de membresía, no hay Sybil-resistance — cualquiera
  con un nullifier nuevo vota. Producción: integrar Semaphore (Merkle de Cédulas + Groth16) o
  un attestor que firme nullifiers válidos. Documentado en `known-limitations.md`.

## Migración a producción (Semaphore)

`castAnonymous` evolucionaría a `castAnonymous(proposalId, choice, merkleRoot, nullifier, proof)`
con `require(verifier.verifyProof(...))` y el `merkleRoot` del set de Cédulas. La firma actual es
un subconjunto compatible.

## Referencias

- ADR-009 (esqueleto). Semaphore (nullifier + membership). spec §7.
