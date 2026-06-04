---
id: B-002
title: "Configurar hardhat.config.ts con red zkTanenbaum (Chain 57057)"
owner: "Orlando"
backup: "Sandro"
effort: "45 min"
priority: P0
status: pending
depends_on: [B-001]
sprint: 1
layer: blockchain
---

# B-002 · Configurar red zkTanenbaum en Hardhat

## Por qué importa
zkTanenbaum (Chain ID **57057**) es la red elegida ([ADR-0001](../../docs/adr/0001-zkTanenbaum-as-target-chain.md)) para todo el sprint. Hardhat por defecto solo conoce su red local (`31337`); hasta que no le enseñemos cómo hablar con zkTanenbaum no podemos desplegar ni verificar. Esta tarea expone la red a los comandos `npx hardhat run --network zkTanenbaum` y `npx hardhat verify --network zkTanenbaum`.

## Conceptos clave
- **Chain ID**: identificador numérico único de la red. zkTanenbaum es `57057`. El Chain ID se incluye en cada transacción firmada (replay protection EIP-155), y si no coincide la tx es rechazada.
- **RPC endpoint**: URL JSON-RPC que recibe transacciones. zkTanenbaum: `https://rpc-zk.tanenbaum.io`.
- **Block explorer**: interfaz web para ver txs y verificar contratos. Para zkTanenbaum: `https://explorer-zk.tanenbaum.io`.
- **Etherscan-compatible API**: si el explorer expone una API tipo Etherscan podemos verificar contratos con `npx hardhat verify`. El estado actual del explorer está en transición — documentaremos fallback manual.
- **Custom chains** en `@nomicfoundation/hardhat-verify`: permite registrar redes que no están en la lista oficial de Etherscan.

## Pre-requisitos
- [ ] [B-001](./B-001-setup-hardhat-typescript.md) cerrada.
- [ ] `dotenv` ya instalado (parte de B-001).
- [ ] `.env` listo según [B-003](./B-003-env-y-gitignore.md) (en paralelo, ambos pueden hacerse simultáneo).

## Paso a paso

### 1. Editar `hardhat.config.ts`
Reemplazar el `networks:` actual por uno que incluya zkTanenbaum.

```ts
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";

dotenv.config();

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? "";
const RPC_PRIMARY = process.env.RPC_PRIMARY ?? "https://rpc-zk.tanenbaum.io";
const RPC_FALLBACK = process.env.RPC_FALLBACK ?? "";
const EXPLORER_API_KEY = process.env.EXPLORER_API_KEY ?? "no-key-needed";

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
    zkTanenbaum: {
      url: RPC_PRIMARY,
      chainId: 57057,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
      timeout: 60_000,
    },
  },
  etherscan: {
    apiKey: {
      zkTanenbaum: EXPLORER_API_KEY,
    },
    customChains: [
      {
        network: "zkTanenbaum",
        chainId: 57057,
        urls: {
          apiURL: "https://explorer-zk.tanenbaum.io/api",
          browserURL: "https://explorer-zk.tanenbaum.io",
        },
      },
    ],
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;
```

> **`accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : []`** — si la clave está vacía (ej. en CI o en una máquina de un junior que solo va a correr tests locales), no hace falta. Si la pasáramos vacía Hardhat tira error al cargar la config.

> **`timeout: 60_000`** — zkTanenbaum puede demorar bastante en sealing de bloques durante deploy. Subimos el timeout para que `deploy.ts` no aborte prematuro.

### 2. Validar carga de variables
```bash
node -e "require('dotenv').config(); console.log({rpc: process.env.RPC_PRIMARY, chainId: 57057})"
```

Salida esperada:
```
{ rpc: 'https://rpc-zk.tanenbaum.io', chainId: 57057 }
```

### 3. Sanity check: chainId remoto
Hardhat puede consultar el chainId del RPC. Si no coincide con `57057`, abortamos.

```bash
npx hardhat console --network zkTanenbaum
```

Adentro del REPL:
```js
const provider = ethers.provider;
const net = await provider.getNetwork();
console.log(net.chainId);  // 57057n  (bigint en ethers v6)
.exit
```

> **Si tira `connection refused`** — el RPC está caído. Probá `curl https://rpc-zk.tanenbaum.io` directo. Si responde 5xx, esperá; si responde 404, es endpoint incorrecto.

### 4. Comentario en el config explicando intención
Es bueno dejar una nota arriba del archivo para que el junior que abre el config entienda *cuándo* tocar cada cosa.

Al inicio del archivo, después de los imports:

```ts
// CivicSys/blockchain/hardhat.config.ts
// - solidity.version está clavada en 0.8.24 (acuerdo del sprint).
// - networks.zkTanenbaum es la red objetivo del demo (ADR-0001).
// - networks.hardhat se usa para tests locales y CI.
// - etherscan.customChains permite `hardhat verify` cuando el explorer
//   exponga una API estilo Etherscan; mientras tanto el comando
//   simplemente falla — usar B-017 para el fallback manual.
```

### 5. Commit
```bash
git add blockchain/hardhat.config.ts
git commit -m "feat(blockchain): agregar red zkTanenbaum (chain 57057) (B-002)"
```

## Verificación / Definition of Done

```bash
cd blockchain
npx hardhat compile                                  # sigue funcionando
npx hardhat console --network zkTanenbaum            # entra al REPL
# dentro: (await ethers.provider.getNetwork()).chainId
```

Resultado esperado:
- ✅ `compile` no rompe.
- ✅ El REPL muestra `57057n`.
- ✅ Sin claves en el repo (`grep DEPLOYER_PRIVATE_KEY blockchain/hardhat.config.ts` muestra solo `process.env.DEPLOYER_PRIVATE_KEY`).

## Errores comunes

- **`HH8: Invalid value undefined for HardhatConfig.networks.zkTanenbaum.accounts.0`**
  Significa que pasaste `[undefined]` como cuenta. Verificá que el `.env` tenga `DEPLOYER_PRIVATE_KEY=0x...` (con el prefijo `0x`).

- **`network does not support ENS`**
  Aparece si alguien llama `ethers.getSigner("0x...")` esperando ENS. Ignorá — zkTanenbaum no tiene ENS, y para Sprint 1 trabajamos solo con direcciones hex.

- **`Error: invalid chainId`**
  El RPC respondió con un chainId distinto. Confirmá que `RPC_PRIMARY` apunta a zkTanenbaum y no a otra testnet (NEVM tiene Chain ID `5700`, fácil confundir).

- **`Cannot read property 'apiURL' of undefined`**
  Faltó `customChains` o tiene typo en el nombre `zkTanenbaum`. El nombre del `customChain.network` DEBE coincidir con `networks.zkTanenbaum`.

## Lecturas
- [Hardhat — Networks](https://hardhat.org/hardhat-runner/docs/config#networks-configuration)
- [hardhat-verify — Custom chains](https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-verify#adding-support-for-other-networks)
- [ADR-0001 — Por qué zkTanenbaum](../../docs/adr/0001-zkTanenbaum-as-target-chain.md)

## Notas para revisor
- ⚠️ **No hardcodear claves** en el `.ts`. Solo `process.env`.
- Verificar que el campo `accounts` cae en `[]` (array vacío) si falta `DEPLOYER_PRIVATE_KEY`, no lanzando excepción al cargar.
- Confirmar que `customChains.network` y `networks.<key>` tienen el mismo nombre exacto.
