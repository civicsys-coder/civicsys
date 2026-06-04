---
id: B-008
title: "Vote.sol — castVote con invariantes completas"
owner: "Orlando"
backup: "Sandro"
effort: "1 h"
priority: P0
status: pending
depends_on: [B-007, B-005]
sprint: 1
layer: blockchain
---

# B-008 · `Vote.sol` — `castVote`

## Por qué importa
`castVote` es el método más sensible del contrato porque **es donde mienten los atacantes**: bot que vota mil veces, ciudadano no registrado intentando votar, voto después del deadline, opción inválida. Cada `require`/`revert` que omitamos abre un agujero. La función debe ser corta, legible y con las invariantes ordenadas de **cheap → expensive** para no quemar gas en checks caros si uno barato ya rechaza.

## Conceptos clave
- **Invariantes en orden gas-óptimo**: validá primero lo barato (operaciones aritméticas, comparaciones simples), después lo caro (llamadas externas como `registry.isRegistered`).
- **Llamadas externas en escritura**: cuando llamás otro contrato (`registry.isRegistered`), hay riesgo de reentrancy *si* después modificás storage importante. Acá no hay (la única "modificación" después de la llamada es marcar `_voted` y sumar al tally, ambos sin transferencias). Igual seguimos el patrón **Checks-Effects-Interactions** (CEI).
- **`unchecked { ++_tallies[…] }`**: en Solidity 0.8 hay overflow checks por defecto. Para un counter que **garantizadamente** no overflow, `unchecked` ahorra gas. Cuidado: solo donde sea matemáticamente seguro.
- **Diferencia `==` vs `!=` en enums**: comparar enums se permite directo. `if (p.status != ProposalStatus.Active) revert(...)`.

## Pre-requisitos
- [ ] [B-007](./B-007-impl-vote-create-proposal.md) y [B-005](./B-005-impl-citizenregistry.md) cerradas.

## Paso a paso

### 1. Editar `contracts/Vote.sol`
Reemplazar la versión placeholder de `castVote` (la que tiene `revert("not implemented")`):

```solidity
    // ---- New errors específicos de castVote ----
    error ProposalNotActive(uint256 proposalId, ProposalStatus status);
    error ProposalExpired(uint256 proposalId, uint64 deadline);
    error InvalidOption(uint8 option, uint256 maxOption);
    error CitizenNotInRegistry(bytes32 citizenId);
    error AlreadyVoted(uint256 proposalId, bytes32 citizenId);

    /// @inheritdoc IVote
    function castVote(
        uint256 proposalId,
        bytes32 citizenId,
        uint8 option
    ) external {
        Proposal storage p = _proposals[proposalId];

        // 1) Existencia (cheap)
        if (p.id == 0) revert ProposalNotActive(proposalId, ProposalStatus.Cancelled);

        // 2) Status (cheap)
        if (p.status != ProposalStatus.Active) {
            revert ProposalNotActive(proposalId, p.status);
        }

        // 3) Deadline (cheap)
        if (uint64(block.timestamp) > p.deadline) {
            revert ProposalExpired(proposalId, p.deadline);
        }

        // 4) Option range (cheap)
        uint256 numOptions = p.options.length;
        if (option >= numOptions) {
            revert InvalidOption(option, numOptions - 1);
        }

        // 5) No double-vote (storage read, cheap-ish)
        if (_voted[proposalId][citizenId]) {
            revert AlreadyVoted(proposalId, citizenId);
        }

        // 6) Citizen registrado (EXTERNAL CALL — más caro, último check)
        if (!registry.isRegistered(citizenId)) {
            revert CitizenNotInRegistry(citizenId);
        }

        // ---- Effects ----
        _voted[proposalId][citizenId] = true;
        unchecked {
            _tallies[proposalId][option] += 1;
        }

        // ---- Interactions (none) ----
        emit VoteCast(proposalId, citizenId, option);
    }
```

### 2. Análisis (para juniors)

- **Orden de checks**: probá mentalmente "¿qué pasa si el atacante manda 1000 txs con proposalId=999999?" → el primer `if (p.id == 0)` los rechaza sin tocar el registry. Ahorrás 1000 RPC calls externas que costarían gas.
- **`unchecked` en el tally**: el tally aumenta en 1 cada vez. Para overflow necesitaríamos `2^256` votos. Imposible en Sprint 1. Documentamos el porqué.
- **Sin `nonReentrant`**: no hacemos llamadas externas *después* de modificar storage. La única llamada externa (`registry.isRegistered`) es `view`, y aunque alguien crease una registry maliciosa que reentrase en `castVote`, no podría votar dos veces porque el `_voted` se setea después del check.

### 3. Compilar y probar manual
```bash
cd blockchain
npx hardhat compile
npx hardhat console
```

```js
const [admin, citizen] = await ethers.getSigners();
const Reg = await ethers.getContractFactory("CitizenRegistry");
const reg = await Reg.deploy(admin.address);
await reg.waitForDeployment();

const Vote = await ethers.getContractFactory("Vote");
const vote = await Vote.deploy(admin.address, await reg.getAddress());
await vote.waitForDeployment();

// crear propuesta con deadline en 1 hora
const dl = Math.floor(Date.now()/1000) + 3600;
await vote.createProposal("Test", "Desc", ["A","B"], dl);

// registrar un ciudadano fake
const id = ethers.keccak256(ethers.toUtf8Bytes("11111111|JUAN PEREZ|salt"));
await reg.register(id, "JUAN PEREZ");

// votar
await vote.castVote(1, id, 0);
console.log("tally:", await vote.tally(1));   // [ 1n, 0n ]

// intentar duplicado
try { await vote.castVote(1, id, 1); } catch(e) { console.log("rechazado:", e.shortMessage); }
```

### 4. Commit
```bash
git add blockchain/contracts/Vote.sol
git commit -m "feat(blockchain): Vote.castVote con invariantes (B-008)"
```

## Verificación / Definition of Done

```bash
cd blockchain
npx hardhat compile
```

Y los tests de [B-011](./B-011-tests-vote-unit.md) deben cubrir:
- ✅ Voto exitoso.
- ✅ Reverte si ciudadano no registrado (`CitizenNotInRegistry`).
- ✅ Reverte si vota dos veces (`AlreadyVoted`).
- ✅ Reverte si propuesta cerrada (`ProposalNotActive`).
- ✅ Reverte si pasó deadline (`ProposalExpired`).
- ✅ Reverte si option fuera de rango (`InvalidOption`).

## Errores comunes

- **`Error: VM Exception while processing transaction: reverted with custom error 'ProposalNotActive(1, 0)'`**
  Está bien: el revert es esperado en test. Asegurate de que el test usa `await expect(vote.castVote(...)).to.be.revertedWithCustomError(vote, "ProposalNotActive")`.

- **`call revert exception (transaction reverted without a reason string)`**
  El contrato externo (`registry`) reverteó por algún lado. Probá `registry.isRegistered(id)` antes para confirmar que el id está bien.

- **`Slot collision`**
  Si en alguna refactorización moviste el orden de variables de estado y rompiste storage, no aplica acá porque el contrato no es upgradeable. Pero tenelo en mente para Sprint 2.

- **Confusión `>= deadline` vs `> deadline`**
  Decidimos `> deadline` (estricto) — el voto al segundo exacto del deadline cuenta. Cambialo a `>=` solo si lo discutimos en review.

## Lecturas
- [Reentrancy attacks](https://consensys.github.io/smart-contract-best-practices/attacks/reentrancy/)
- [Checks-Effects-Interactions](https://docs.soliditylang.org/en/v0.8.24/security-considerations.html#use-the-checks-effects-interactions-pattern)
- [Custom errors vs require strings — Gas comparison](https://soliditylang.org/blog/2021/04/21/custom-errors/)

## Notas para revisor
- Confirmar el **orden** de los `revert`. Si un junior reordena por estética y mueve `registry.isRegistered` al principio, el gas en el caso de error sube — pedir corrección.
- Verificar que el evento `VoteCast` se emite **una sola vez** por voto.
- El `unchecked` solo cubre el incremento del tally, NO cubre operaciones aritméticas en la sección de checks.
