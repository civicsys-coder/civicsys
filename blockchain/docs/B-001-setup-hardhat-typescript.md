---
id: B-001
title: "Inicializar proyecto Hardhat + TypeScript en blockchain/"
owner: "Orlando"
backup: "junior (pair)"
effort: "1 h"
priority: P0
status: pending
depends_on: []
sprint: 1
layer: blockchain
---

# B-001 · Inicializar proyecto Hardhat + TypeScript

## Por qué importa
Esta es la **piedra angular** de toda la capa blockchain: sin un proyecto Hardhat válido no podemos compilar contratos, no podemos correr tests y no podemos desplegar a zkTanenbaum. Todo el resto del sprint depende de este paso. Lo hacemos en **TypeScript** porque los scripts de deploy y los tests serán type-safe y porque `agents/` consumirá tipos generados (TypeChain) a través de `shared/types/`.

## Conceptos clave
- **Hardhat**: framework JavaScript/TypeScript para compilar, testear y desplegar contratos Solidity. Equivalente moderno de Truffle. [Docs](https://hardhat.org/).
- **hardhat-toolbox**: meta-paquete que trae ethers v6, chai matchers, network helpers, gas reporter, etherscan plugin y TypeChain. Una sola instalación.
- **TypeChain**: genera tipos TypeScript a partir de los ABIs compilados. Cuando el contrato cambia, los tipos se regeneran y TypeScript marca dónde rompes.
- **ethers v6**: librería para hablar con la blockchain. La v6 cambió varias APIs respecto de la v5 (ej. `ethers.parseEther` en lugar de `ethers.utils.parseEther`).
- **Node ≥ 18 LTS**: Hardhat oficialmente soporta 18, 20 y 22. Si usás `nvm` confirmá tu versión con `node -v`.

## Pre-requisitos
- [ ] Node.js ≥ 18 instalado (`node -v`).
- [ ] `npm` o `pnpm` disponible (recomendado `npm` para no introducir un cambio extra en este sprint).
- [ ] Estás parado en `C:\dev\hackathons\blockchain-syscoin-04-2026\CivicSys\blockchain\`.
- [ ] El `blockchain/README.md` ya existe (no hay que borrarlo, vamos a co-existir).

## Paso a paso

### 1. Inicializar `package.json`
Hardhat necesita un `package.json` para instalar dependencias. Lo creamos sin asistente para tener control.

```bash
npm init -y
```

Edita `package.json` y reemplaza los campos relevantes:

```json
{
  "name": "civicsys-blockchain",
  "version": "0.1.0-sprint1",
  "private": true,
  "description": "Smart contracts CivicSys sobre zkTanenbaum (Chain 57057)",
  "license": "MIT",
  "scripts": {
    "compile": "hardhat compile",
    "test": "hardhat test",
    "coverage": "hardhat coverage",
    "clean": "hardhat clean",
    "deploy:local": "hardhat run scripts/deploy.ts",
    "deploy:zktanenbaum": "hardhat run scripts/deploy.ts --network zkTanenbaum",
    "seed:zktanenbaum": "hardhat run scripts/seed-proposals.ts --network zkTanenbaum"
  }
}
```

> **Por qué `private: true`** — Evita que alguien publique sin querer el paquete a npm. No es código de librería, es un monorepo interno.

### 2. Instalar Hardhat y dependencias
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @nomicfoundation/hardhat-verify typescript ts-node @types/node @types/mocha @types/chai
npm install @openzeppelin/contracts
```

> **Por qué OpenZeppelin** — Vamos a usar `AccessControl` (roles) y posiblemente `Pausable`. OpenZeppelin v5 es el estándar de facto auditado. NO reinventes el wheel para esto.

> **Por qué `--save-dev` para hardhat** — Hardhat es una herramienta de build, no se ejecuta en producción on-chain.

### 3. Inicializar configuración Hardhat
En lugar de usar `npx hardhat init` (que genera demasiado boilerplate), vamos a crear el archivo a mano para que esté limpio. Crear `hardhat.config.ts`:

```ts
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: false,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: { chainId: 31337 },
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;
```

> **Network zkTanenbaum y etherscan se agregan en [B-002](./B-002-hardhat-config-zktanenbaum.md)**. Acá solo dejamos `hardhat` local para poder compilar y testear.

> **`optimizer.runs: 200`** — número estándar. `200` significa "optimizar como si el contrato fuera a ejecutarse 200 veces". Si subimos a 1000 reduce un poco gas runtime pero aumenta gas de deploy.

### 4. Instalar `dotenv` para variables de entorno
```bash
npm install --save-dev dotenv
```

### 5. Crear `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./"
  },
  "include": ["./scripts/**/*", "./test/**/*", "./typechain-types/**/*", "hardhat.config.ts"],
  "exclude": ["node_modules", "artifacts", "cache"]
}
```

> **`strict: true`** — sin esto, TypeScript es tibio y deja pasar `any`. Para un sprint con muchos manos en el código, *strict* es nuestro mejor amigo.

### 6. Crear esqueleto de directorios y un contrato dummy para validar
```bash
mkdir contracts scripts test deployments
```

Crear un contrato mínimo para validar el setup, `contracts/HelloHackathon.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract HelloHackathon {
    string public greeting = "CivicSys es bien publico digital";
}
```

> **`SPDX-License-Identifier`** — Solidity exige declarar la licencia en cada archivo. Si no, el compilador tira warning. Usamos `MIT` consistente con el `LICENSE` raíz.

### 7. Verificar que compila
```bash
npx hardhat compile
```

Salida esperada:
```
Compiled 1 Solidity file successfully (evm target: paris).
```

### 8. Crear `.gitignore` específico
Si el `.gitignore` raíz no cubre estos, agregar en `blockchain/.gitignore`:

```gitignore
node_modules
artifacts
cache
coverage
coverage.json
typechain-types
.env
.env.*
!.env.example
```

> Si `typechain-types/` está fuera del repo, los devs nuevos generan los tipos al hacer `npm install && npx hardhat compile`. Esto evita "merge hell" en archivos generados.

### 9. Commit
```bash
git add blockchain/package.json blockchain/package-lock.json blockchain/hardhat.config.ts blockchain/tsconfig.json blockchain/.gitignore blockchain/contracts/HelloHackathon.sol
git commit -m "feat(blockchain): inicializar Hardhat + TypeScript (B-001)"
```

## Verificación / Definition of Done

```bash
cd blockchain
ls hardhat.config.ts tsconfig.json package.json
npx hardhat compile
npx hardhat test
```

Resultado esperado:
- ✅ Los tres archivos existen.
- ✅ `compile` termina sin errores y crea `artifacts/contracts/HelloHackathon.sol/HelloHackathon.json`.
- ✅ `test` corre 0 tests sin error.
- ✅ Existe `typechain-types/HelloHackathon.ts`.

## Errores comunes

- **`Error HH12: Trying to use a non-local installation of Hardhat`**
  Estás corriendo `hardhat` global. Usá `npx hardhat …` o un script de `npm run`.

- **`Error: Cannot find module 'hardhat'`**
  No instalaste deps en este directorio. `cd blockchain && npm install`.

- **`Error: Solidity version not supported`**
  El `solidity.version` no coincide con el `pragma` del `.sol`. Mantené ambos en `0.8.24`.

- **`ts-node not found` al correr hardhat con `.ts`**
  Faltó `npm install --save-dev ts-node`. Hardhat lo necesita para leer `hardhat.config.ts`.

## Lecturas
- [Hardhat — Quick start](https://hardhat.org/hardhat-runner/docs/getting-started)
- [Hardhat — Typescript support](https://hardhat.org/hardhat-runner/docs/guides/typescript)
- [OpenZeppelin Contracts v5](https://docs.openzeppelin.com/contracts/5.x/)

## Notas para revisor
- Confirmar que `HelloHackathon.sol` se borra/reemplaza en [B-005](./B-005-impl-citizenregistry.md) cuando agreguemos los contratos reales.
- Verificar que NO se commiteó `.env` (sí solo `.env.example` de [B-003](./B-003-env-y-gitignore.md)).
- El `package-lock.json` SÍ va al repo.
