# ADR-009 — Votación anónima por nullifier (ESQUELETO Sprint 04)

**Fecha**: 2026-05-29
**Estado**: PROPUESTO — **no implementado** (esqueleto Sprint 04)
**Decisor**: Orlando (orquestador AEGIS)
**Input**: spec §7 (esqueletos), decisión D1 (identidad + esqueletos)

> Este ADR documenta el **approach futuro**. No hay implementación en Sprint 03. El
> contrato `AnonymousVote.sol` existe solo como stub que revierte (`NotImplemented`).

## Contexto

`Vote.sol` (Sprint 01) es **consultivo y no anónimo**: `castVote` está gateado por
`isRegistered(msg.sender)` y el voto queda asociado a la address. Con la Cédula Cívica
(ADR-006) ya hay 1-persona-1-identidad, pero el voto sigue siendo **público** (se sabe
quién votó qué). El objetivo del subsistema 3 es **votación anónima 1-persona-1-voto**:
que nadie pueda votar dos veces **sin revelar quién es cada votante**.

## El problema central

Dos requisitos en tensión:
1. **No doble voto** — necesito saber que esta persona no votó ya.
2. **Anonimato** — no debo saber quién es esta persona.

Un mapping `address => bool voted` resuelve (1) pero rompe (2). Se necesita una marca que
pruebe "no repetí" sin identificar al votante.

## Approach propuesto: nullifier + prueba ZK

- **Nullifier**: marca única determinista derivada de `(identidad, propuesta)` —
  ej. `nullifier = H(secret_identidad, proposalId)`. La misma persona en la misma
  propuesta produce **siempre el mismo** nullifier; en propuestas distintas, distinto.
- El contrato mantiene `mapping(bytes32 => bool) nullifierUsed`. Al votar:
  1. El votante envía `(proposalId, choice, nullifier, proof)`.
  2. La **prueba ZK** acredita: "conozco un secreto de identidad asociado a una Cédula
     válida, y este `nullifier` se deriva correctamente de él y de `proposalId`" — **sin
     revelar** el secreto ni qué Cédula.
  3. El contrato verifica la prueba y revierte si `nullifierUsed[nullifier]`.
  4. Marca el nullifier como usado y cuenta el voto.

Resultado: doble voto imposible (mismo nullifier) y votante no identificable (la prueba no
revela la identidad; el nullifier es un hash sin preimagen pública).

## Opciones de implementación (a decidir en Sprint 04)

- **Membership proof**: árbol de Merkle de Cédulas válidas + prueba de pertenencia (estilo
  Semaphore), vs. firma ciega, vs. signal de un set de identidades.
- **Stack ZK**: Semaphore (ya resuelve nullifier+membership para "1 persona 1 señal"),
  Circom/snarkjs a medida, o Noir. → candidato fuerte: **Semaphore** (probado para
  exactamente este caso).
- **Verifier on-chain**: verificador del esquema elegido (Groth16/PLONK) desplegado en la red.

## Consecuencias (cuando se implemente)

- Privacidad real del voto; el tally es público y verificable, los votantes no.
- Coste: circuito + prover client-side + verifier on-chain + gas de verificación.
- Requiere que la Cédula (ADR-006) exponga un compromiso de identidad apto para el árbol de
  membresía (posible extensión del `IdentitySBT`).

## Estado

**No implementado.** `blockchain/contracts/AnonymousVote.sol` es un stub:
`castAnonymous(...)` revierte con `NotImplemented()`. La página `/votacion` del frontend es
un placeholder que explica este modelo en lenguaje llano. Sin circuito, sin verifier.

## Referencias

- Semaphore (nullifier + Merkle membership). EIP-/patrones de "private set membership".
- spec §7. ADR-006 (identidad sobre la que se construye el nullifier).

## Cuándo retomar

- Sprint 04: elegir stack (probable Semaphore), diseñar el compromiso de identidad en la
  Cédula, implementar circuito + verifier + UI de prueba.
