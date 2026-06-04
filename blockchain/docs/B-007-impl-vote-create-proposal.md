---
id: B-007
title: "Vote.sol — storage, constructor y createProposal"
owner: "Orlando"
backup: "Sandro"
effort: "1 h"
priority: P0
status: pending
depends_on: [B-006]
sprint: 1
layer: blockchain
---

# B-007 · `Vote.sol` — esqueleto + `createProposal`

## Por qué importa
Partimos la implementación de `Vote.sol` en **tres tareas pequeñas** (B-007, B-008, B-009) en lugar de una sola enorme. Razones:

- **PRs más chicos** → review más rápida en hackathon.
- **Conflict-free merges** entre Orlando y Sandro/juniors que van armando tests en paralelo.
- **Errores localizados**: si `castVote` rompe, sabemos en qué PR mirar.

Esta tarea deja el contrato compilando con: dependencia a `ICitizenRegistry`, storage, constructor con roles, y `createProposal` funcional. `castVote` queda como `external` con `revert("not implemented")` que [B-008](./B-008-impl-vote-cast-vote.md) reemplaza.

## Conceptos clave
- **Composición vs herencia**: en lugar de heredar de `CitizenRegistry`, **inyectamos** el address por constructor. Cada contrato tiene una sola responsabilidad.
- **Counter pattern**: `uint256 private _nextProposalId = 1;` empieza en `1` para que `id == 0` signifique "no existe".
- **`memory` arrays**: declarar `string[] calldata options` y guardarlas como `string[] storage` requiere copia. Solidity 0.8 maneja la copia automáticamente.
- **Modifier `onlyRole`**: revertimos antes de cualquier escritura, ahorrando gas en el caso de no autorizado.

## Pre-requisitos
- [ ] [B-006](./B-006-interface-ivote.md) cerrada.
- [ ] [B-005](./B-005-impl-citizenregistry.md) cerrada (necesitamos el address al desplegar, pero no en compile).

## Paso a paso

### 1. Crear `contracts/Vote.sol`
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IVote} from "./interfaces/IVote.sol";
import {ICitizenRegistry} from "./interfaces/ICitizenRegistry.sol";

/// @title Vote — propuestas y votos consultivos
contract Vote is IVote, AccessControl {
    // ---- Roles ----
    bytes32 public constant CURATOR_ROLE = keccak256("CURATOR_ROLE");

    // ---- External dependency ----
    ICitizenRegistry public immutable registry;

    // ---- Storage ----
    uint256 private _nextProposalId = 1;
    mapping(uint256 => Proposal) private _proposals;
    mapping(uint256 => uint256[]) private _tallies;
    mapping(uint256 => mapping(bytes32 => bool)) private _voted;

    // ---- Errors ----
    error InvalidRegistry();
    error InvalidDeadline(uint64 deadline, uint64 now_);
    error InvalidOptionsCount(uint256 count);
    error TitleTooShort(uint256 length);

    constructor(address admin, ICitizenRegistry registry_) {
        if (address(registry_) == address(0)) revert InvalidRegistry();
        if (admin == address(0)) revert InvalidRegistry();
        registry = registry_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(CURATOR_ROLE, admin);
    }

    /// @inheritdoc IVote
    function createProposal(
        string calldata title,
        string calldata description,
        string[] calldata options,
        uint64 deadline
    ) external onlyRole(CURATOR_ROLE) returns (uint256 id) {
        if (bytes(title).length < 5) revert TitleTooShort(bytes(title).length);
        if (options.length < 2 || options.length > 32) {
            revert InvalidOptionsCount(options.length);
        }
        uint64 currentTime = uint64(block.timestamp);
        if (deadline <= currentTime) revert InvalidDeadline(deadline, currentTime);

        id = _nextProposalId++;
        Proposal storage p = _proposals[id];
        p.id = id;
        p.title = title;
        p.description = description;
        for (uint256 i = 0; i < options.length; ++i) {
            p.options.push(options[i]);
        }
        p.createdAt = currentTime;
        p.deadline = deadline;
        p.status = ProposalStatus.Active;
        p.curator = msg.sender;

        // inicializa tally en 0 para cada opción
        _tallies[id] = new uint256[](options.length);

        emit ProposalCreated(id, msg.sender, title, deadline);
    }

    // ---- View helpers ----
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return _proposals[proposalId];
    }

    function tally(uint256 proposalId) external view returns (uint256[] memory) {
        return _tallies[proposalId];
    }

    function hasVoted(uint256 proposalId, bytes32 citizenId)
        external
        view
        returns (bool)
    {
        return _voted[proposalId][citizenId];
    }

    function totalProposals() external view returns (uint256) {
        return _nextProposalId - 1;
    }

    // ---- Placeholders (B-008, B-009) ----
    function castVote(uint256, bytes32, uint8) external pure {
        revert("not implemented: see B-008");
    }

    function closeProposal(uint256) external pure {
        revert("not implemented: see B-009");
    }

    function cancelProposal(uint256) external pure {
        revert("not implemented: see B-009");
    }
}
```

### 2. ¿Por qué `immutable` para `registry`?

- **Seguridad**: si la registry pudiera cambiar, alguien con permiso podría apuntar a un contrato falso que devuelve `true` para todos.
- **Gas**: leer un `immutable` cuesta solo 3 gas vs ~2100 de un slot de storage en cold-read.

### 3. Por qué `_tallies` como mapping (no array dentro de Proposal)

Solidity permite arrays dentro de structs, pero retornarlos con `getProposal` desde un mapping requiere "trucos" (no se pueden devolver dinámicamente arrays nested anidados en algunas versiones). Manteniendo `_tallies` aparte:

- `getProposal` devuelve solo metadatos (más barato de serializar).
- `tally` devuelve el array (cuando se pide).

### 4. Compilar
```bash
cd blockchain
npx hardhat compile
```

Esperado: `Compiled 5 Solidity files successfully`.

### 5. Test smoke local (sin tests aún)
Abrí `npx hardhat console` y probá manual:

```js
const [owner] = await ethers.getSigners();
const Reg = await ethers.getContractFactory("CitizenRegistry");
const reg = await Reg.deploy(owner.address);
await reg.waitForDeployment();

const Vote = await ethers.getContractFactory("Vote");
const vote = await Vote.deploy(owner.address, await reg.getAddress());
await vote.waitForDeployment();

const tx = await vote.createProposal(
  "Aprobar pavimentación en SJL",
  "Descripción breve",
  ["Si", "No", "Abstención"],
  Math.floor(Date.now()/1000) + 86400
);
const r = await tx.wait();
console.log("logs:", r.logs.map(l => l.fragment?.name));
```

Salida esperada:
```
logs: [ 'ProposalCreated' ]
```

### 6. Commit
```bash
git add blockchain/contracts/Vote.sol
git commit -m "feat(blockchain): Vote.sol esqueleto + createProposal (B-007)"
```

## Verificación / Definition of Done

```bash
cd blockchain
npx hardhat compile
node -e "const a=require('./artifacts/contracts/Vote.sol/Vote.json').abi; console.log(a.filter(x=>x.type==='function').map(x=>x.name).sort())"
```

Esperado (subset):
```
['CURATOR_ROLE','cancelProposal','castVote','closeProposal','createProposal',
 'getProposal','hasVoted','registry','tally','totalProposals', ...]
```

## Errores comunes

- **`InternalCompilerError: Stack too deep`**
  Si tu función `createProposal` tiene muchas variables locales, mové código a helpers privados.

- **`TypeError: Storage location must be specified`**
  Olvidaste `storage` en `Proposal storage p = …`. Sin el modificador, Solidity no sabe si copia o referencia.

- **`Member "options" is not a part of "struct Proposal storage pointer"`**
  El nombre del campo está en singular/plural distinto. Verificá que es `options` (plural) en la struct y en la asignación.

- **El push de un loop es caro**
  Sí, agregar 32 opciones cuesta gas. Documentamos límite `options.length <= 32` y cubrimos con tests.

## Lecturas
- [Solidity Docs · Structs](https://docs.soliditylang.org/en/v0.8.24/types.html#structs)
- [Solidity Docs · Immutable](https://docs.soliditylang.org/en/v0.8.24/contracts.html#constant-and-immutable-state-variables)

## Notas para revisor
- Verificar que `castVote`, `closeProposal`, `cancelProposal` están como `pure` con `revert` — esto evita que B-007 quede a medio camino y deje funciones llamables sin lógica.
- Sin warnings de compilación.
- `registry` es `public immutable` (genera getter automático, útil para tests).
