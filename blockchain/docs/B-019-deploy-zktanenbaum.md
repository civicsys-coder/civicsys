---
id: B-019
title: "Deploy real en zkTanenbaum (chain 57057)"
owner: "Orlando"
backup: "Sandro"
effort: "1 h"
priority: P0
status: pending
depends_on: [B-014, B-015, B-018]
sprint: 1
layer: blockchain
---

# B-019 · Deploy a zkTanenbaum

## Por qué importa
Este es el momento del sprint donde **dejamos código en una blockchain real** y la audiencia del demo lo puede ver en el explorer. Hasta acá todo era local. Después de esta tarea, las direcciones de los contratos quedan fijas y se comparten con `agents/.env` para que la API y los tests E2E apunten a la red real.

## Conceptos clave
- **Network flag**: `--network zkTanenbaum` le dice a Hardhat a qué red conectarse según `hardhat.config.ts`.
- **Confirmaciones**: en zkTanenbaum un bloque tarda ~2-5s. Esperar 2+ confirmaciones evita guardar direcciones que después se revierten.
- **`deployments/<network>.json`** versionado: este archivo **SÍ** va al repo (a diferencia del `.env`). Permite que cualquiera del equipo arme el cliente blockchain leyendo solo el repo.
- **Re-deploy**: si hay un bug y hay que redesplegar, se re-corre el script. Las direcciones cambian. Hay que **avisar a Sandro** para que actualice `agents/.env`.

## Pre-requisitos
- [ ] [B-014](./B-014-script-deploy.md) y [B-015](./B-015-script-deploy-copy-abis.md) cerradas.
- [ ] [B-018](./B-018-solicitar-faucet-tsys.md) confirma TSYS recibidos.
- [ ] Tests pasan (`npx hardhat test`) — si los unit tests fallan, NO desplegamos.
- [ ] `coverage` ≥ 80% — corroborado en [B-013](./B-013-cobertura-80.md).

## Paso a paso

### 1. Pre-flight checklist
```bash
cd blockchain
npx hardhat clean
npx hardhat compile
npx hardhat test
```

Si algo falla, **detener** y resolver antes de continuar.

### 2. Verificar balance
```bash
npx hardhat console --network zkTanenbaum
> const a = (await ethers.getSigners())[0].address
> ethers.formatEther(await ethers.provider.getBalance(a))
> .exit
```

Debe ser ≥ 0.5 TSYS. Si no, volver a [B-018](./B-018-solicitar-faucet-tsys.md).

### 3. Verificar gas price actual
```js
// dentro del console
const fee = await ethers.provider.getFeeData()
console.log({ gasPrice: fee.gasPrice, maxFee: fee.maxFeePerGas })
```

Si el `gasPrice` es absurdamente alto (>100 gwei), esperar unos minutos.

### 4. Deploy
```bash
npx hardhat run scripts/deploy.ts --network zkTanenbaum
```

Salida esperada (resumido):
```
════════════════════════════════════════
  Deploy en: zkTanenbaum (chainId 57057)
  Deployer:  0x...
  API signer: 0x...
════════════════════════════════════════
  Balance:   1.0 TSYS

→ Desplegando CitizenRegistry...
  ✓ CitizenRegistry @ 0xABC... (block 12345)

→ Desplegando Vote...
  ✓ Vote @ 0xDEF... (block 12346)

→ Validando deploy...
  ✓ wiring registry↔vote correcto
  ✓ ABI exportado: shared/abis/CitizenRegistry.json
  ...

════════════════════════════════════════
  Copiar a agents/.env:
  CITIZEN_REGISTRY_ADDRESS=0xABC...
  VOTE_CONTRACT_ADDRESS=0xDEF...
  DEPLOY_BLOCK=12345
════════════════════════════════════════
```

### 5. Verificar en el explorer
Abrir en navegador:
- `https://explorer-zk.tanenbaum.io/address/0xABC...` (CitizenRegistry)
- `https://explorer-zk.tanenbaum.io/address/0xDEF...` (Vote)

Confirmar:
- ✅ Hay transacción de "Contract Creation" del deployer.
- ✅ El bytecode no está vacío.
- ✅ El "from" coincide con el deployer.

### 6. Inspeccionar `deployments/zkTanenbaum.json`
```bash
cat blockchain/deployments/zkTanenbaum.json
```

Confirmar campos:
```json
{
  "network": "zkTanenbaum",
  "chainId": 57057,
  "deployedAt": "2026-05-19T...",
  "deployer": "0x...",
  "apiSigner": "0x...",
  "CitizenRegistry": { "address": "0xABC...", "deployBlock": 12345, "txHash": "0x..." },
  "Vote": { "address": "0xDEF...", "deployBlock": 12346, "txHash": "0x..." }
}
```

### 7. Compartir direcciones al equipo
Pegar en el canal del equipo:
```
🚀 Deploy en zkTanenbaum exitoso:
- CitizenRegistry: 0xABC...
- Vote:            0xDEF...
- explorer: https://explorer-zk.tanenbaum.io/address/0xABC...
- Sandro, agregá a agents/.env:
  CITIZEN_REGISTRY_ADDRESS=0xABC...
  VOTE_CONTRACT_ADDRESS=0xDEF...
  DEPLOY_BLOCK=12345
```

### 8. Commit
```bash
git add blockchain/deployments/zkTanenbaum.json shared/abis/*.json
git commit -m "feat(blockchain): deploy en zkTanenbaum chain 57057 (B-019)"
git tag deploy/zkTanenbaum/$(date +%Y%m%d-%H%M%S)
git push --tags
```

## Verificación / Definition of Done

- ✅ `deployments/zkTanenbaum.json` con direcciones reales en el repo.
- ✅ Ambas direcciones visibles en https://explorer-zk.tanenbaum.io.
- ✅ ABIs actualizados en `shared/abis/`.
- ✅ `Vote.registry() == CitizenRegistry.address` confirmado en explorer.
- ✅ Sandro recibió las direcciones por canal del equipo.

```bash
# Sanity final desde otra terminal
cast call 0xDEF... "registry()(address)" --rpc-url https://rpc-zk.tanenbaum.io
# Debe imprimir 0xABC... (la CitizenRegistry)
```

## Errores comunes

- **`Error: replacement transaction underpriced`**
  Hay una tx pendiente con el mismo nonce y gasPrice menor. Esperar a que se mine o resetear nonce.

- **`Error: network does not support EIP-1559`**
  zkTanenbaum puede no soportar todavía. Cambiar a tx legacy en el deploy:
  ```ts
  const reg = await Reg.deploy(apiSigner, { gasPrice: ethers.parseUnits("1", "gwei"), type: 0 });
  ```

- **Deploy se cuelga**
  Probable RPC degradado. Probá el `RPC_FALLBACK` (si lo tenés) o esperá. NO matar el proceso a medio camino.

- **Bytecode size > 24576 bytes**
  Hard limit del EIP-170. Activá `viaIR: true` en `hardhat.config.ts` y/o usá `optimizer.runs: 1000`.

## Lecturas
- [Ethers v6 — Provider/Signer](https://docs.ethers.org/v6/getting-started/#starting-signing)
- [`docs/sprints/sprint1.md`](../../docs/sprints/sprint1.md)

## Notas para revisor
- ⚠️ La acción **modifica estado real en blockchain**. Antes de PR, confirmar que se discutió con el equipo (Tatiana le da go visual).
- Verificar que `deployments/zkTanenbaum.json` no tiene `apiSigner == 0x0` ni direcciones obviamente equivocadas.
- Si redesplegamos por bug, **bumpear** el version interno (no aplica en Sprint 1 porque no hay versioning aún).
