---
id: B-005
title: "Implementar CitizenRegistry.sol"
owner: "Orlando"
backup: "junior (pair)"
effort: "1.5 h"
priority: P0
status: pending
depends_on: [B-004]
sprint: 1
layer: blockchain
---

# B-005 · Implementar `CitizenRegistry.sol`

## Por qué importa
Este es **uno de los dos contratos críticos** del Sprint 1 (el otro es `Vote.sol`). `CitizenRegistry` es el sistema de identidad ciudadana on-chain: la API calcula el `citizenId` off-chain (con el DNI normalizado + salt) y lo registra acá. Sin este contrato no podemos verificar quién está habilitado a votar.

El contrato **no** almacena DNI. Si alguien examina los eventos y el storage del contrato no debe poder recuperar DNIs en texto claro. Esto está marcado en [T2 (Tampering) y T4 (Information Disclosure)](../../docs/security/threat-model-sprint1.md) del threat model.

## Conceptos clave
- **AccessControl (OpenZeppelin)**: provee `hasRole`, `grantRole`, `DEFAULT_ADMIN_ROLE`. Usamos un rol `REGISTRAR_ROLE` para que solo la API (signer custodial) pueda registrar — no cualquiera con TSYS.
- **`require` vs `revert` con custom error**: en Solidity 0.8 los **custom errors** son ~50 gas más baratos que `require("string")` y se introspectan mejor desde el front. Vamos a usar custom errors.
- **Reentrancy**: en este contrato no llamamos contratos externos durante writes, así que **no necesitamos `ReentrancyGuard`**. Importante notarlo (NO agregar dependencia innecesaria).
- **`storage` vs `memory`**: cuando devolvemos una struct usamos `memory` (copia). Cuando modificamos una struct guardada usamos `storage`. Lectura: `memory` para "no quiero modificar el original".
- **Inmutabilidad de variables**: `immutable` se inicializa en constructor y nunca cambia. `constant` se fija en compile time.

## Pre-requisitos
- [ ] [B-004](./B-004-interface-icitizenregistry.md) cerrada.
- [ ] OpenZeppelin v5 instalado (parte de B-001).

## Paso a paso

### 1. Borrar `HelloHackathon.sol` (era solo placeholder)
```bash
rm blockchain/contracts/HelloHackathon.sol
```

### 2. Crear `contracts/CitizenRegistry.sol`
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ICitizenRegistry} from "./interfaces/ICitizenRegistry.sol";

/// @title CitizenRegistry — registro inmutable de ciudadanos
/// @notice El DNI nunca se almacena. Solo el hash precomputado off-chain:
///         citizenId = keccak256(dni || normalizedName || PUBLIC_SALT)
contract CitizenRegistry is ICitizenRegistry, AccessControl {
    // ---- Roles ----
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    // ---- Storage ----
    mapping(bytes32 => Citizen) private _citizens;
    bytes32[] private _allIds;

    // ---- Errors ----
    error CitizenAlreadyRegistered(bytes32 id);
    error CitizenNotFound(bytes32 id);
    error NameTooShort(uint256 length);
    error NameTooLong(uint256 length);
    error InvalidId();

    constructor(address admin) {
        if (admin == address(0)) revert InvalidId();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);
    }

    /// @inheritdoc ICitizenRegistry
    function register(bytes32 id, string calldata normalizedName)
        external
        onlyRole(REGISTRAR_ROLE)
    {
        if (id == bytes32(0)) revert InvalidId();
        if (_citizens[id].registeredAt != 0) {
            revert CitizenAlreadyRegistered(id);
        }

        bytes memory nameBytes = bytes(normalizedName);
        if (nameBytes.length < 5)   revert NameTooShort(nameBytes.length);
        if (nameBytes.length > 120) revert NameTooLong(nameBytes.length);

        _citizens[id] = Citizen({
            id: id,
            normalizedName: normalizedName,
            wallet: msg.sender,
            registeredAt: uint64(block.timestamp),
            active: true
        });
        _allIds.push(id);

        emit CitizenRegistered(id, msg.sender, uint64(block.timestamp));
    }

    /// @inheritdoc ICitizenRegistry
    function isRegistered(bytes32 id) external view returns (bool) {
        return _citizens[id].registeredAt != 0 && _citizens[id].active;
    }

    /// @inheritdoc ICitizenRegistry
    function getCitizen(bytes32 id) external view returns (Citizen memory) {
        Citizen memory c = _citizens[id];
        if (c.registeredAt == 0) revert CitizenNotFound(id);
        return c;
    }

    /// @inheritdoc ICitizenRegistry
    function totalCitizens() external view returns (uint256) {
        return _allIds.length;
    }

    /// @notice Desactiva un ciudadano. Solo admin. Sprint 2+ usa esto p/ apelaciones.
    function deactivate(bytes32 id) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Citizen storage c = _citizens[id];
        if (c.registeredAt == 0) revert CitizenNotFound(id);
        c.active = false;
        emit CitizenDeactivated(id, uint64(block.timestamp));
    }
}
```

### 3. Análisis línea por línea (para juniors)

- **`is ICitizenRegistry, AccessControl`** — herencia múltiple. Solidity la permite, pero hay que cuidar el orden (left-to-right). Acá la interface va primero porque no aporta storage.
- **`bytes32 public constant REGISTRAR_ROLE`** — el `public` genera automáticamente un getter `REGISTRAR_ROLE()`. Útil para que los tests puedan consultarlo sin hardcodear el hash.
- **`mapping(bytes32 => Citizen) private _citizens`** — mapping de `id → struct`. Solidity inicializa todo a default; un `Citizen` no inicializado tiene `registeredAt == 0`, por eso lo usamos como flag de existencia.
- **`bytes32[] private _allIds`** — array adicional solo para poder enumerar (`totalCitizens`). Si no nos importara contar, lo borraríamos para ahorrar gas.
- **`onlyRole(REGISTRAR_ROLE)`** — modifier de OpenZeppelin que reverte si `msg.sender` no tiene el rol.
- **`uint64(block.timestamp)`** — castamos `uint256 → uint64` (válido hasta el año 584942417355). El cast es seguro hasta ~2^64 segundos desde 1970.
- **`bytes memory nameBytes = bytes(normalizedName)`** — convertir un `string calldata` a bytes para medir longitud. `string.length` no existe en Solidity, hay que pasar por `bytes(s).length` (que mide bytes, no caracteres unicode).

### 4. Compilar
```bash
cd blockchain
npx hardhat compile
```

Esperado:
```
Compiled 3 Solidity files successfully (evm target: paris).
```

Si tira *"Multiple SPDX license identifiers"* — borrar la línea SPDX redundante.

### 5. Estimar gas (sanity)
```bash
npx hardhat test --grep "gas"     # 0 tests aún, solo para asegurar que arranca
```

> **No mediremos gas serio hasta tener tests (B-010).** Aquí solo confirmamos que el contrato no es absurdamente pesado.

### 6. Commit
```bash
git add blockchain/contracts/CitizenRegistry.sol
git rm blockchain/contracts/HelloHackathon.sol
git commit -m "feat(blockchain): CitizenRegistry.sol con AccessControl (B-005)"
```

## Verificación / Definition of Done

```bash
cd blockchain
npx hardhat compile
test -f artifacts/contracts/CitizenRegistry.sol/CitizenRegistry.json && echo OK
test -f typechain-types/contracts/CitizenRegistry.ts && echo OK
```

Y validación manual del ABI:
```bash
node -e "const a = require('./artifacts/contracts/CitizenRegistry.sol/CitizenRegistry.json').abi; console.log(a.filter(x=>x.type==='function').map(x=>x.name))"
```

Salida esperada (orden puede variar):
```
[
  'DEFAULT_ADMIN_ROLE','REGISTRAR_ROLE','deactivate','getCitizen',
  'getRoleAdmin','grantRole','hasRole','isRegistered','register','renounceRole',
  'revokeRole','supportsInterface','totalCitizens'
]
```

## Errores comunes

- **`TypeError: Contract "CitizenRegistry" should be marked as abstract`**
  Olvidaste implementar alguna función de la interface. Solidity te dice cuál. Releé `ICitizenRegistry`.

- **`Identifier not found or not unique`**
  Importaste `AccessControl` con path mal. La ruta correcta es `@openzeppelin/contracts/access/AccessControl.sol`.

- **`Member "_grantRole" not found in contract`**
  En OpenZeppelin v5 los nombres internos pueden variar. Si compila con `_setupRole` falla, usá `_grantRole` (es la actual). Si dice que no existe, confirmá la versión instalada: `cat node_modules/@openzeppelin/contracts/package.json | grep version`.

- **Gas blow-up al iterar `_allIds`**
  En Sprint 1 no enumeramos en métodos pagados. Si en Sprint 2 agregamos `listCitizens()`, paginamos.

## Lecturas
- [OpenZeppelin AccessControl](https://docs.openzeppelin.com/contracts/5.x/api/access#AccessControl)
- [Solidity Custom Errors](https://docs.soliditylang.org/en/v0.8.24/contracts.html#errors-and-the-revert-statement)
- [`block.timestamp` caveats](https://consensys.github.io/smart-contract-best-practices/development-recommendations/solidity-specific/timestamp-dependence/)

## Notas para revisor
- ¿Hay alguna ruta que **escriba el DNI**? No debería existir. La función `register` recibe `id` (hash) y `normalizedName`. Confirmar grep `dni|DNI` en el contrato.
- Verificar que `_grantRole(DEFAULT_ADMIN_ROLE, admin)` está antes de `_grantRole(REGISTRAR_ROLE, admin)` (el admin puede revocar el otro).
- El constructor recibe `admin` explícito en lugar de usar `msg.sender` — esto permite que `deploy.ts` pase la dirección de la cuenta de la API (no la del deployer).
