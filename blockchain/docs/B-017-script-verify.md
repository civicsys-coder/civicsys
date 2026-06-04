---
id: B-017
title: "scripts/verify.ts — verificar contratos en explorer zkTanenbaum"
owner: "Orlando"
backup: "Sandro"
effort: "1 h"
priority: P1
status: pending
depends_on: [B-014]
sprint: 1
layer: blockchain
---

# B-017 · `scripts/verify.ts`

## Por qué importa
**Verificar el código fuente en el explorer** es lo que convierte "una dirección con bytecode opaco" en "un contrato auditable". Sin verificación, la audiencia del demo solo ve `0x60806040…` cuando abre el explorer — no puede leer Solidity. Verificación es trazabilidad de mínimo nivel.

Esto está en el [DoD del Sprint 1](../../docs/sprints/sprint1.md#definition-of-done) como item #2.

## Conceptos clave
- **Verificación on-chain**: comparar bytecode desplegado con bytecode compilado de source code conocido. El explorer (Blockscout o forks) acepta el source y confirma que matchea.
- **`hardhat verify`**: usa la API tipo Etherscan del explorer. Mientras zkTanenbaum no exponga API estable, hacemos fallback manual.
- **Constructor args**: la verificación necesita los exactos argumentos pasados al constructor para reproducir el bytecode. Si los argumentos no coinciden, falla.

## Pre-requisitos
- [ ] [B-014](./B-014-script-deploy.md) completado.
- [ ] `deployments/zkTanenbaum.json` existe (después de [B-019](./B-019-deploy-zktanenbaum.md), pero podemos preparar el script antes).

## Paso a paso

### 1. Crear `scripts/verify.ts`
```ts
import { run, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const deploymentsPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error(`No existe ${deploymentsPath}. Correr deploy primero.`);
  }
  const dep = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
  const apiSigner = dep.apiSigner ?? dep.deployer;

  console.log(`Verificando contratos en ${network.name}...`);

  // ---- CitizenRegistry ----
  console.log(`\n→ CitizenRegistry @ ${dep.CitizenRegistry.address}`);
  try {
    await run("verify:verify", {
      address: dep.CitizenRegistry.address,
      constructorArguments: [apiSigner],
      contract: "contracts/CitizenRegistry.sol:CitizenRegistry",
    });
    console.log("  ✓ verificado");
  } catch (e: any) {
    if (e.message.includes("Already Verified")) {
      console.log("  → ya estaba verificado");
    } else {
      console.warn(`  ⚠ falló: ${e.message}`);
      printManualFallback("CitizenRegistry", dep.CitizenRegistry.address, [apiSigner]);
    }
  }

  // ---- Vote ----
  console.log(`\n→ Vote @ ${dep.Vote.address}`);
  try {
    await run("verify:verify", {
      address: dep.Vote.address,
      constructorArguments: [apiSigner, dep.CitizenRegistry.address],
      contract: "contracts/Vote.sol:Vote",
    });
    console.log("  ✓ verificado");
  } catch (e: any) {
    if (e.message.includes("Already Verified")) {
      console.log("  → ya estaba verificado");
    } else {
      console.warn(`  ⚠ falló: ${e.message}`);
      printManualFallback("Vote", dep.Vote.address, [apiSigner, dep.CitizenRegistry.address]);
    }
  }
}

function printManualFallback(name: string, address: string, args: any[]) {
  console.log(`\n  Fallback manual para ${name}:`);
  console.log(`  1. Abrir: https://explorer-zk.tanenbaum.io/address/${address}`);
  console.log(`  2. Pestaña "Contract" → "Verify & Publish"`);
  console.log(`  3. Compiler version: 0.8.24`);
  console.log(`  4. Pegar source de contracts/${name}.sol`);
  console.log(`  5. Constructor args (ABI-encoded):`);
  // ABI-encode manual con ethers
  console.log(`     args planos: ${JSON.stringify(args)}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
```

### 2. Generar args ABI-encoded para fallback manual
Cuando el `hardhat verify` falla, el explorer pide los args ABI-encoded en hex. Helper:

```ts
// helpers/encode-args.ts
import { AbiCoder } from "ethers";

const apiSigner = "0xABC...";
const registry  = "0xDEF...";

const coder = AbiCoder.defaultAbiCoder();
const encoded = coder.encode(["address", "address"], [apiSigner, registry]);
console.log(encoded.slice(2)); // sin 0x para pegar al explorer
```

> Para `CitizenRegistry` solo pasa un `address`. Para `Vote` pasa `(address, address)`.

### 3. Probar (solo cuando esté deployado en zkTanenbaum)
```bash
npx hardhat run scripts/verify.ts --network zkTanenbaum
```

Si la API del explorer está caída, el script imprime instrucciones de fallback manual.

### 4. Agregar al `package.json`
```json
"scripts": {
  ...
  "verify:zktanenbaum": "hardhat run scripts/verify.ts --network zkTanenbaum"
}
```

### 5. Commit
```bash
git add blockchain/scripts/verify.ts blockchain/package.json
git commit -m "feat(blockchain): scripts/verify.ts con fallback manual (B-017)"
```

## Verificación / Definition of Done

- ✅ El script ejecuta sin crash en `zkTanenbaum`.
- ✅ Si la API verifica → `✓ verificado`.
- ✅ Si falla → imprime instrucciones legibles de fallback.
- ✅ La verificación final (sea API o manual) deja el código visible en el explorer.

## Errores comunes

- **`API request failed: 404`**
  La API tipo Etherscan no está disponible en el explorer aún. Usar el fallback manual.

- **`Constructor arguments don't match`**
  Pasaste args distintos a los del deploy. Re-leé el `deployments/<network>.json` y comparalos uno a uno.

- **`Compiler version mismatch`**
  El explorer pide la versión exacta. Confirmá que pegás `0.8.24` (no `0.8.0` o `latest`).

- **Bytecode no coincide**
  Posible causa: `optimizer.runs` distinto. Confirmá que en `hardhat.config.ts` está `runs: 200` y pegás `200` en el explorer también.

## Lecturas
- [hardhat-verify](https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-verify)
- [Blockscout verification API](https://docs.blockscout.com/for-users/verifying-a-smart-contract)
- [Etherscan verification](https://etherscan.io/sourcecode-verification) (referencia conceptual)

## Notas para revisor
- Confirmar que el script NO publica claves privadas (revisar `process.env.DEPLOYER_PRIVATE_KEY` no aparezca en outputs).
- Si la API es inestable, el fallback manual debería estar documentado **en este archivo** (no en un Notion oculto).
- En Sprint 2, este script puede integrarse a GitHub Actions: verify después de cada deploy.
