---
id: B-006
title: "Definir interface IVote.sol"
owner: "junior"
backup: "Orlando"
effort: "30 min"
priority: P0
status: pending
depends_on: [B-001]
sprint: 1
layer: blockchain
---

# B-006 · Interface `IVote.sol`

## Por qué importa
`IVote` define el **contrato deliberativo**: cómo se crean propuestas, cómo se votan, cómo se cuentan votos, cómo se cierra una propuesta. Es el corazón del demo: sin esta interface no podemos exponer ni un endpoint en la API. Igual que con `ICitizenRegistry`, fijar la interface antes de implementar permite paralelizar tests, frontend y agentes.

## Conceptos clave
- **Enum**: tipo numérico restringido. `ProposalStatus { Active, Closed, Cancelled }` se compila a `uint8`.
- **`calldata` vs `memory`**: para parámetros `external`, `calldata` es **gratis-de-leer** (no copia). Usamos `calldata` siempre que no necesitemos mutar.
- **Eventos compuestos**: `ProposalClosed` lleva el `tally` (array de uint256). Hermes va a parsear este array. Pasar arrays en eventos no es indexado pero es trazable.
- **Idempotencia de votos**: la interface NO permite cambiar voto. Una propuesta + un citizenId = un solo voto, final.
- **Deadlines**: `uint64` para timestamps. Limita hasta el año 584 mil millones. Suficiente.

## Pre-requisitos
- [ ] [B-001](./B-001-setup-hardhat-typescript.md) completada.
- [ ] Lectura del flujo end-to-end en [`docs/architecture/sprint1-overview.md`](../../docs/architecture/sprint1-overview.md).

## Paso a paso

### 1. Crear `contracts/interfaces/IVote.sol`
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IVote — propuestas y votos consultivos firmados on-chain
/// @notice Cada ciudadano vota una sola vez por propuesta.
///         El voto NO es vinculante — es deliberación auditable.
interface IVote {
    enum ProposalStatus {
        Active,
        Closed,
        Cancelled
    }

    struct Proposal {
        uint256 id;
        string title;
        string description;
        string[] options;
        uint64 createdAt;
        uint64 deadline;
        ProposalStatus status;
        address curator;
    }

    // ---- Events ----
    event ProposalCreated(
        uint256 indexed id,
        address indexed curator,
        string title,
        uint64 deadline
    );

    event VoteCast(
        uint256 indexed proposalId,
        bytes32 indexed citizenId,
        uint8 option
    );

    event ProposalClosed(
        uint256 indexed proposalId,
        uint256[] tally,
        uint64 timestamp
    );

    event ProposalCancelled(uint256 indexed proposalId, uint64 timestamp);

    // ---- Functions ----

    /// @notice Crea una nueva propuesta. Solo curadores autorizados.
    /// @return id Identificador autogenerado de la propuesta
    function createProposal(
        string calldata title,
        string calldata description,
        string[] calldata options,
        uint64 deadline
    ) external returns (uint256 id);

    /// @notice Emite voto. Reverte si:
    ///  - propuesta no Active
    ///  - bloque > deadline
    ///  - citizenId no registrado
    ///  - option fuera de rango
    ///  - citizenId ya votó
    function castVote(
        uint256 proposalId,
        bytes32 citizenId,
        uint8 option
    ) external;

    /// @notice Cierra una propuesta (admin/curador). Emite ProposalClosed con tally.
    function closeProposal(uint256 proposalId) external;

    /// @notice Cancela una propuesta. Sprint 2+ requiere razón.
    function cancelProposal(uint256 proposalId) external;

    /// @notice Devuelve la struct completa.
    function getProposal(uint256 proposalId) external view returns (Proposal memory);

    /// @notice Devuelve el conteo actual de votos por opción.
    function tally(uint256 proposalId) external view returns (uint256[] memory);

    /// @notice Devuelve true si el citizenId ya votó en esa propuesta.
    function hasVoted(uint256 proposalId, bytes32 citizenId) external view returns (bool);

    /// @notice Total de propuestas existentes (incluyendo cerradas/canceladas).
    function totalProposals() external view returns (uint256);
}
```

### 2. Análisis de decisiones

- **`uint8 option`**: limita a 256 opciones por propuesta. Si una propuesta necesita más, partila en varias.
- **No incluimos `voter address`** en `VoteCast`: nos basta con `citizenId` (es lo que importa). Esto reduce la cantidad de datos y evita correlacionar wallet ↔ ciudadano cuando en Sprint 2 movamos a self-custody.
- **`ProposalClosed.tally`** se incluye en el evento aunque también se puede leer con `tally()`. **Por qué duplicar**: Hermes consume eventos y nos ahorramos un RPC extra. El gas adicional vale la pena.
- **No retornamos `option` de `hasVoted`**: ocultamos *qué* votó cada uno mientras la propuesta está activa para no influenciar. Sprint 1 no es secreto-perfecto pero al menos no facilita el "vote nudging".

### 3. Compilar
```bash
cd blockchain
npx hardhat compile
```

Esperado: ahora compila 4 archivos (ICitizenRegistry, CitizenRegistry, IVote, y el toolbox internals).

### 4. Generar TypeChain types
TypeChain se ejecuta automáticamente con `compile`. Verificá:
```bash
ls typechain-types/contracts/interfaces/IVote.ts
```

### 5. Commit
```bash
git add blockchain/contracts/interfaces/IVote.sol
git commit -m "feat(blockchain): IVote interface (B-006)"
```

## Verificación / Definition of Done

```bash
cd blockchain
npx hardhat compile
test -f artifacts/contracts/interfaces/IVote.sol/IVote.json && echo OK
node -e "const a=require('./artifacts/contracts/interfaces/IVote.sol/IVote.json').abi; console.log(a.filter(x=>x.type==='event').map(x=>x.name))"
```

Salida esperada:
```
[ 'ProposalCreated', 'VoteCast', 'ProposalClosed', 'ProposalCancelled' ]
```

## Errores comunes

- **`This contract type requires the abstract keyword`**
  El error es típico cuando intentás *desplegar* una interface por error. Las interfaces no se despliegan; se implementan.

- **`Tuple components cannot be empty`**
  Olvidaste el `[]` en `string[] calldata options`. Solidity necesita el tipo explícito.

- **`Indexed parameter type must be elementary or fixed-size`**
  No podés marcar un `string` como `indexed` (sí podés, pero guarda solo el keccak del string — no recuperable). Evitalo.

## Lecturas
- [Solidity Docs · Enums](https://docs.soliditylang.org/en/v0.8.24/types.html#enums)
- [Solidity Docs · Events](https://docs.soliditylang.org/en/v0.8.24/contracts.html#events)
- [`docs/architecture/sprint1-overview.md`](../../docs/architecture/sprint1-overview.md)

## Notas para revisor
- Confirmar que el evento `VoteCast` tiene `citizenId` indexed pero NO `option` — esto permite filtrar por ciudadano sin revelar el voto en el filtro RPC.
- `closeProposal` y `cancelProposal` están separados a propósito: cerrar es "tally final"; cancelar es "esto no debió existir".
- `IVote` NO conoce `ICitizenRegistry`. La dependencia se inyecta vía constructor en `Vote.sol` ([B-007](./B-007-impl-vote-create-proposal.md)).
