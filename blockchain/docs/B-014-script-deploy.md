---
id: B-014
title: "scripts/deploy.ts — desplegar contratos + escribir JSON"
owner: "Orlando"
backup: "Sandro"
effort: "1.5 h"
priority: P0
status: pending
depends_on: [B-005, B-009]
sprint: 1
layer: blockchain
---

# B-014 · `scripts/deploy.ts`

## Por qué importa
El deploy script es **el único camino oficial** para llevar los contratos del repo a una red real. Si lo escribimos a mano (o peor, lo hacemos paso a paso en el REPL), una persona se confunde una vez y rompe el demo. Este script:

1. Despliega `CitizenRegistry` y `Vote`.
2. Hace el wiring (pasar registry address a Vote).
3. Otorga `REGISTRAR_ROLE` y `CURATOR_ROLE` a la cuenta API.
4. Escribe direcciones en `deployments/<network>.json`.
5. Imprime un resumen (que se pega al PR del deploy).

La tarea de **copiar ABIs a `shared/abis/`** la hacemos por separado en [B-015](./B-015-script-deploy-copy-abis.md) para mantener PRs chicos.

## Conceptos clave
- **Idempotencia opcional**: si el script se corre dos veces en la misma red, lo deseable es que NO redespliegue innecesariamente. En Sprint 1 hacemos **siempre redeploy** (más simple); Sprint 2+ podemos chequear `deployments/zkTanenbaum.json`.
- **`ethers.deployContract`** vs **`ContractFactory.deploy`**: en ethers v6 ambos funcionan. El primero es shorthand del segundo.
- **`HardhatRuntimeEnvironment` (HRE)**: Hardhat inyecta `hre` con todo el contexto (network, ethers, …). En scripts, `hre.network.name` te dice en qué red estás.
- **Wait for confirmations**: en testnet de zkRollups, esperar **al menos 2 confirmaciones** evita guardar una dirección de un bloque revertido.

## Pre-requisitos
- [ ] [B-005](./B-005-impl-citizenregistry.md) cerrada.
- [ ] [B-009](./B-009-impl-vote-tally-close.md) cerrada.
- [ ] `.env` con `DEPLOYER_PRIVATE_KEY` y opcionalmente `API_SIGNER_ADDRESS` (la dirección que firmará desde la API; si está vacío, usamos el mismo deployer).

## Paso a paso

### 1. Crear `scripts/deploy.ts`
```ts
import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface DeploymentRecord {
  network: string;
  chainId: number;
  deployedAt: string;       // ISO 8601
  deployer: string;
  apiSigner: string;
  CitizenRegistry: {
    address: string;
    deployBlock: number;
    txHash: string;
  };
  Vote: {
    address: string;
    deployBlock: number;
    txHash: string;
  };
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const apiSigner = process.env.API_SIGNER_ADDRESS ?? deployer.address;

  console.log("════════════════════════════════════════");
  console.log(`  Deploy en: ${network.name} (chainId ${network.config.chainId})`);
  console.log(`  Deployer:  ${deployer.address}`);
  console.log(`  API signer: ${apiSigner}`);
  console.log("════════════════════════════════════════");

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`  Balance:   ${ethers.formatEther(balance)} TSYS`);
  if (balance === 0n) {
    throw new Error("Deployer tiene 0 TSYS. Solicitar al faucet (B-018).");
  }

  // ---- 1. CitizenRegistry ----
  console.log("\n→ Desplegando CitizenRegistry...");
  const Reg = await ethers.getContractFactory("CitizenRegistry");
  const reg = await Reg.deploy(apiSigner);
  await reg.waitForDeployment();
  const regTx = reg.deploymentTransaction()!;
  await regTx.wait(2);
  const regAddr = await reg.getAddress();
  const regBlock = regTx.blockNumber!;
  console.log(`  ✓ CitizenRegistry @ ${regAddr} (block ${regBlock})`);

  // ---- 2. Vote ----
  console.log("\n→ Desplegando Vote...");
  const VoteCt = await ethers.getContractFactory("Vote");
  const vote = await VoteCt.deploy(apiSigner, regAddr);
  await vote.waitForDeployment();
  const voteTx = vote.deploymentTransaction()!;
  await voteTx.wait(2);
  const voteAddr = await vote.getAddress();
  const voteBlock = voteTx.blockNumber!;
  console.log(`  ✓ Vote @ ${voteAddr} (block ${voteBlock})`);

  // ---- 3. Validaciones post-deploy ----
  console.log("\n→ Validando deploy...");
  const onChainRegistry = await vote.registry();
  if (onChainRegistry.toLowerCase() !== regAddr.toLowerCase()) {
    throw new Error(`Vote.registry mal cableado: ${onChainRegistry}`);
  }
  console.log("  ✓ wiring registry↔vote correcto");

  // ---- 4. Persistir deployments ----
  const record: DeploymentRecord = {
    network: network.name,
    chainId: Number(network.config.chainId),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    apiSigner,
    CitizenRegistry: { address: regAddr, deployBlock: regBlock, txHash: regTx.hash },
    Vote: { address: voteAddr, deployBlock: voteBlock, txHash: voteTx.hash },
  };

  const outDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${network.name}.json`);
  fs.writeFileSync(outFile, JSON.stringify(record, null, 2) + "\n");
  console.log(`\n  ✓ Deployments escrito en ${outFile}`);

  // ---- 5. Output legible para copiar al .env de agents/ ----
  console.log("\n════════════════════════════════════════");
  console.log("  Copiar a agents/.env:");
  console.log(`  CITIZEN_REGISTRY_ADDRESS=${regAddr}`);
  console.log(`  VOTE_CONTRACT_ADDRESS=${voteAddr}`);
  console.log(`  DEPLOY_BLOCK=${Math.min(regBlock, voteBlock)}`);
  console.log("════════════════════════════════════════");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("✗ Deploy falló:", e);
    process.exit(1);
  });
```

### 2. Probar localmente
```bash
cd blockchain
npx hardhat run scripts/deploy.ts
```

Salida esperada:
```
════════════════════════════════════════
  Deploy en: hardhat (chainId 31337)
  Deployer:  0x...
  API signer: 0x...
════════════════════════════════════════
  Balance:   10000.0 TSYS
...
  ✓ CitizenRegistry @ 0x... (block 1)
  ✓ Vote @ 0x... (block 2)
  ✓ wiring registry↔vote correcto
  ✓ Deployments escrito en .../deployments/hardhat.json
════════════════════════════════════════
  Copiar a agents/.env:
  CITIZEN_REGISTRY_ADDRESS=0x...
  VOTE_CONTRACT_ADDRESS=0x...
  DEPLOY_BLOCK=1
```

> En red `hardhat` los bloques empiezan en 1 y el balance default es 10000 ETH. En zkTanenbaum, el balance será 0 hasta que pidas al faucet.

### 3. Validar el JSON
```bash
cat deployments/hardhat.json | jq .
```

Esperado: objeto con `network`, `chainId`, `deployedAt`, ... — todos los campos no vacíos.

### 4. Commit
```bash
git add blockchain/scripts/deploy.ts
git commit -m "feat(blockchain): scripts/deploy.ts (B-014)"
```

> NO commitear `deployments/hardhat.json` aún (es de prueba local). Sí commitear `deployments/zkTanenbaum.json` cuando deployemos real en [B-019](./B-019-deploy-zktanenbaum.md).

## Verificación / Definition of Done

```bash
cd blockchain
npx hardhat run scripts/deploy.ts
cat deployments/hardhat.json
```

- ✅ Script termina sin error en `hardhat` local.
- ✅ `deployments/hardhat.json` contiene direcciones `0x…` válidas.
- ✅ Vote.registry == CitizenRegistry address.

## Errores comunes

- **`Error: insufficient funds for gas`**
  En zkTanenbaum: faucet pendiente. En local: rara vez ocurre, probablemente cuenta mal inicializada.

- **`reg.waitForDeployment is not a function`**
  Estás usando ethers v5 syntax. v6 cambia. Asegurate: `import { ethers } from "hardhat"` y usá `await reg.waitForDeployment()`.

- **`Error: contract runner does not support sending transactions`**
  El signer no tiene private key (signing). Confirmá `accounts: [DEPLOYER_PRIVATE_KEY]` en `hardhat.config.ts` para la red.

- **`Error: nonce has already been used`**
  Otro deploy paralelo. Esperá unos segundos y reintentá. O hacé `cast nonce <deployer>` y forzá nonce manual con `tx.nonce`.

## Lecturas
- [Ethers v6 — Getting started](https://docs.ethers.org/v6/getting-started/)
- [Hardhat — Deploying contracts](https://hardhat.org/hardhat-runner/docs/guides/deploying)

## Notas para revisor
- ⚠️ El script asume `API_SIGNER_ADDRESS` correcto; si está vacío usa el deployer (OK para Sprint 1). En producción, debe ser una cuenta distinta.
- Confirmar que el script **NO** hace `console.log` de la clave privada (revisar `process.env.DEPLOYER_PRIVATE_KEY` no aparezca).
- El throw cuando `balance === 0n` es importante: evita deploys con cuenta vacía.
