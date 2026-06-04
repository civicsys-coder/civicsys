---
id: B-004
title: "Definir interface ICitizenRegistry.sol"
owner: "junior"
backup: "Orlando"
effort: "30 min"
priority: P0
status: pending
depends_on: [B-001]
sprint: 1
layer: blockchain
---

# B-004 · Interface `ICitizenRegistry.sol`

## Por qué importa
Una **interface** es el contrato (en el sentido literal) entre el contrato y todo lo que lo consume: tests, scripts, otros contratos y la API. Si fijamos primero la interface, podemos:

- Implementar el contrato en paralelo a los tests ([B-010](./B-010-tests-citizenregistry.md)).
- Construir mocks para que Sandro pueda avanzar con `agents/services/blockchain_client.py` sin esperar la implementación.
- Cambiar la implementación interna sin romper a los consumidores.

Es exactamente lo mismo que en Python o TypeScript: programá contra la interface, no contra la implementación.

## Conceptos clave
- **Interface en Solidity**: declara funciones sin cuerpo. Solo firmas. No tiene constructor ni state.
- **`external`**: significa "solo se puede llamar desde fuera del contrato"; las interfaces siempre usan `external`.
- **`bytes32`**: tipo de tamaño fijo de 32 bytes (256 bits) — exactamente el output de `keccak256`. Lo usamos para `citizenId`.
- **`indexed` en eventos**: hasta 3 parámetros pueden marcarse `indexed` para hacer el evento *filtrable* (Hermes los va a filtrar con `eth_getLogs`).
- **Naming**: convención `I<Nombre>` (ej. `ICitizenRegistry`), igual que C# / TypeScript.

## Pre-requisitos
- [ ] [B-001](./B-001-setup-hardhat-typescript.md) completada.
- [ ] Haber leído la sección "CitizenRegistry" del [`blockchain/README.md`](../README.md).

## Paso a paso

### 1. Crear el directorio `contracts/interfaces/`
```bash
cd blockchain
mkdir -p contracts/interfaces
```

### 2. Crear `contracts/interfaces/ICitizenRegistry.sol`
Pegar exactamente este contenido:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ICitizenRegistry — registro inmutable de ciudadanos
/// @notice El DNI nunca se almacena en claro. Solo guardamos el hash:
///         citizenId = keccak256(dni || normalizedName || PUBLIC_SALT)
interface ICitizenRegistry {
    struct Citizen {
        bytes32 id;             // hash precomputado off-chain
        string  normalizedName; // UPPER, sin tildes
        address wallet;         // direccion que firmó el registro
        uint64  registeredAt;   // block.timestamp del registro
        bool    active;
    }

    /// @notice Emitido al registrar un nuevo ciudadano
    event CitizenRegistered(
        bytes32 indexed id,
        address indexed wallet,
        uint64 timestamp
    );

    /// @notice Marca un ciudadano como inactivo (Sprint 2+ admin only)
    event CitizenDeactivated(bytes32 indexed id, uint64 timestamp);

    /// @notice Registra un ciudadano. Falla si `id` ya existe.
    /// @param id hash precomputado off-chain
    /// @param normalizedName nombre en mayúsculas, sin acentos
    function register(bytes32 id, string calldata normalizedName) external;

    /// @notice Devuelve true si el id está registrado y activo.
    function isRegistered(bytes32 id) external view returns (bool);

    /// @notice Devuelve toda la struct del ciudadano. Reverte si no existe.
    function getCitizen(bytes32 id) external view returns (Citizen memory);

    /// @notice Cantidad total de ciudadanos registrados (activos + inactivos).
    function totalCitizens() external view returns (uint256);
}
```

### 3. Compilar para validar sintaxis
```bash
npx hardhat compile
```

Salida esperada:
```
Compiled 2 Solidity files successfully (evm target: paris).
```

Si aparece un warning del tipo *"Function state mutability can be restricted"*, ignorá — es porque la interface no tiene cuerpo y no hay nada que ajustar.

### 4. Comentar líneas críticas con NatSpec
Las anotaciones `///` que empiezan con `@notice`, `@param`, `@dev` se llaman **NatSpec** (Natural Specification). Son lo que aparece en el explorer, en los front-ends y lo que devuelve `getFunctionDocumentation`. Tomate 5 minutos extra para verificar que cada función tiene `@notice`.

### 5. Commit
```bash
git add blockchain/contracts/interfaces/ICitizenRegistry.sol
git commit -m "feat(blockchain): ICitizenRegistry interface (B-004)"
```

## Verificación / Definition of Done

```bash
cd blockchain
npx hardhat compile
ls contracts/interfaces/ICitizenRegistry.sol artifacts/contracts/interfaces/ICitizenRegistry.sol/ICitizenRegistry.json
```

Resultado esperado:
- ✅ El archivo Solidity existe.
- ✅ El ABI `ICitizenRegistry.json` se generó en `artifacts/`.
- ✅ `typechain-types/contracts/interfaces/ICitizenRegistry.ts` se generó.
- ✅ El JSON ABI contiene las funciones `register`, `isRegistered`, `getCitizen`, `totalCitizens` y los eventos `CitizenRegistered`, `CitizenDeactivated`.

```bash
cat artifacts/contracts/interfaces/ICitizenRegistry.sol/ICitizenRegistry.json | grep -E '"name"\s*:\s*"(register|isRegistered|getCitizen|CitizenRegistered)"'
```

## Errores comunes

- **`ParserError: Expected identifier but got 'normalizedName'`**
  Olvidaste el tipo del parámetro. En Solidity es `tipo nombre`, ej. `string calldata normalizedName`. **Nunca** `string normalizedName` sin location: `calldata` o `memory`.

- **`TypeError: Indexed expression has to be a state variable, mapping or struct field`**
  Usaste `indexed` en un parámetro de función — solo aplica a eventos.

- **`Identifier already declared`**
  Solidity case-sensitive. `Citizen` (struct) y `citizen` (variable) NO entran en conflicto, pero si tenés dos cosas con el mismo nombre exacto sí.

## Lecturas
- [Solidity Docs · Interfaces](https://docs.soliditylang.org/en/v0.8.24/contracts.html#interfaces)
- [NatSpec Format](https://docs.soliditylang.org/en/v0.8.24/natspec-format.html)
- [Solidity Style Guide · Interfaces](https://docs.soliditylang.org/en/v0.8.24/style-guide.html)

## Notas para revisor
- Verificar que `CitizenRegistered` tiene **2** parámetros indexed (`id` y `wallet`). Más de 3 indexed no compila; menos, dificulta filtrar.
- El campo `wallet` permite saber "qué firmante registró este ciudadano" — útil para auditar.
- Si en Sprint 2 metemos zkSNARK, esta interface sigue valiendo (cambiamos `id` por otro tipo y mantenemos las firmas).
