# Bloque C · Scripts de deploy + ABIs a `shared/`

**Objetivo**: Scripts TypeScript que deploean los contratos a Anvil local + zkTanenbaum testnet, persisten las addresses por red en `deployments/`, y copian los ABIs a `shared/abis/` para que backend Node y frontend los consuman como single source of truth.

**Tareas**: 6
**LOC estimado**: ~250
**Dependencias**: Bloque B cerrado (contratos compilados).
**Coverage gate**: no aplica (scripts de ops, no aplicación).

---

## Task C.1 — Helper de seed timestamps + título demo

**Files**: Create `blockchain/scripts/seed-data.ts`.

- [ ] **Step 1**: Crear archivo con constantes compartidas entre deploy local y testnet

```bash
cat > blockchain/scripts/seed-data.ts <<'EOF'
// Datos seed compartidos entre deploy-local.ts y deploy-zktanenbaum.ts
//
// Sprint 1 — una sola propuesta hardcoded. Sprint 2 agrega creación dinámica.

export const SEED_PROPOSAL = {
  title: "Demo Sprint 1 · Reforma del artículo 56 (PPT slide 6)",
  ipfsCid: "bafy-placeholder-sprint1-mvp",
  // openAt = now() en el momento del deploy (calculado en runtime)
  // closeAt = openAt + 7 días
  durationSeconds: 7 * 24 * 3600,
};
EOF
```

- [ ] **Step 2**: Stage + commit

```bash
git add blockchain/scripts/seed-data.ts
git commit -m "blockchain(C.1): constantes seed propuesta demo Sprint 1"
```

---

## Task C.2 — Script `deploy-local.ts` (Anvil)

**Files**: Create `blockchain/scripts/deploy-local.ts`.

- [ ] **Step 1**: Crear script

```bash
cat > blockchain/scripts/deploy-local.ts <<'EOF'
// Deploy de CitizenRegistry + Vote a la red localhost (Anvil).
//
// Uso:
//   pnpm exec hardhat run scripts/deploy-local.ts --network localhost
//
// Side effects:
//   - Escribe deployments/localhost.json con las addresses
//   - Copia ABIs a ../shared/abis/{CitizenRegistry,Vote}.json
//
// Pre-requisito: Anvil corriendo en localhost:8545 (bash infra/up.sh)

import { network } from "hardhat";
import { writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SEED_PROPOSAL } from "./seed-data.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SHARED_ABIS = join(ROOT, "..", "shared", "abis");
const DEPLOYMENTS = join(ROOT, "deployments");

async function main() {
  const { viem } = await network.connect();
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  console.log(`→ deployer: ${deployer.account.address}`);
  console.log(`→ chain id: ${await publicClient.getChainId()}`);

  // 1. Deploy CitizenRegistry
  console.log("\n→ deploying CitizenRegistry...");
  const registry = await viem.deployContract("CitizenRegistry");
  console.log(`✓ CitizenRegistry → ${registry.address}`);

  // 2. Deploy Vote con la dirección del registry + propuesta seed
  const block = await publicClient.getBlock();
  const openAt = block.timestamp;
  const closeAt = openAt + BigInt(SEED_PROPOSAL.durationSeconds);

  console.log("\n→ deploying Vote with seed proposal...");
  const vote = await viem.deployContract("Vote", [
    registry.address,
    SEED_PROPOSAL.title,
    SEED_PROPOSAL.ipfsCid,
    openAt,
    closeAt,
  ]);
  console.log(`✓ Vote → ${vote.address}`);
  console.log(`  title:   ${SEED_PROPOSAL.title}`);
  console.log(`  openAt:  ${new Date(Number(openAt) * 1000).toISOString()}`);
  console.log(`  closeAt: ${new Date(Number(closeAt) * 1000).toISOString()}`);

  // 3. Persistir addresses
  mkdirSync(DEPLOYMENTS, { recursive: true });
  const out = {
    chainId: 31337,
    network: "localhost",
    deployedAt: new Date().toISOString(),
    deployer: deployer.account.address,
    contracts: {
      CitizenRegistry: registry.address,
      Vote: vote.address,
    },
    seedProposal: {
      id: 1,
      title: SEED_PROPOSAL.title,
      ipfsCid: SEED_PROPOSAL.ipfsCid,
      openAt: openAt.toString(),
      closeAt: closeAt.toString(),
    },
  };
  writeFileSync(
    join(DEPLOYMENTS, "localhost.json"),
    JSON.stringify(out, null, 2)
  );
  console.log(`\n✓ deployments/localhost.json escrito`);

  // 4. Copiar ABIs a shared/abis/
  mkdirSync(SHARED_ABIS, { recursive: true });
  for (const name of ["CitizenRegistry", "Vote"]) {
    const artifactPath = join(
      ROOT, "artifacts", "contracts", `${name}.sol`, `${name}.json`
    );
    const targetPath = join(SHARED_ABIS, `${name}.json`);
    copyFileSync(artifactPath, targetPath);
    console.log(`✓ ABI copied: shared/abis/${name}.json`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
EOF
```

- [ ] **Step 2**: Levantar Anvil (Bloque A) si no corre

```bash
bash infra/up.sh
```

- [ ] **Step 3**: Correr el deploy

```bash
cd blockchain && pnpm exec hardhat run scripts/deploy-local.ts --network localhost
```

Expected output:
```
→ deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
→ chain id: 31337
→ deploying CitizenRegistry...
✓ CitizenRegistry → 0x5FbDB2315678afecb367f032d93F642f64180aa3
→ deploying Vote with seed proposal...
✓ Vote → 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
  title:   Demo Sprint 1 · Reforma del artículo 56 (PPT slide 6)
  openAt:  2026-05-21T...
  closeAt: 2026-05-28T...
✓ deployments/localhost.json escrito
✓ ABI copied: shared/abis/CitizenRegistry.json
✓ ABI copied: shared/abis/Vote.json
```

- [ ] **Step 4**: Verificar artefactos

```bash
cat ../blockchain/deployments/localhost.json | python -m json.tool
ls ../shared/abis/
```

Expected: `localhost.json` con addresses; `shared/abis/` con `CitizenRegistry.json` y `Vote.json`.

- [ ] **Step 5**: Stage + commit

```bash
cd ..
git add blockchain/scripts/deploy-local.ts blockchain/deployments/localhost.json shared/abis/
git commit -m "blockchain(C.2): deploy-local.ts despliega a Anvil + copia ABIs a shared/abis/"
```

---

## Task C.3 — Script `deploy-zktanenbaum.ts` (testnet real)

**Files**: Create `blockchain/scripts/deploy-zktanenbaum.ts`.

- [ ] **Step 1**: Crear script (90% copia del local, pero con red distinta + checks de balance)

```bash
cat > blockchain/scripts/deploy-zktanenbaum.ts <<'EOF'
// Deploy de CitizenRegistry + Vote a zkTanenbaum testnet (Chain ID 57057).
//
// Uso:
//   pnpm exec hardhat run scripts/deploy-zktanenbaum.ts --network zkTanenbaum
//
// Pre-requisitos:
//   - DEPLOYER_PRIVATE_KEY en .env con TSYS del faucet
//   - RPC zkTanenbaum (rpc-zk.tanenbaum.io) online
//
// Diferencias respecto a deploy-local.ts:
//   - Chain ID 57057
//   - Balance check antes de deployar (mínimo 0.05 TSYS para deploy + seed)
//   - Persist en deployments/zkTanenbaum.json (no sobrescribe localhost.json)

import { network } from "hardhat";
import { writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { formatEther, parseEther } from "viem";
import { SEED_PROPOSAL } from "./seed-data.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SHARED_ABIS = join(ROOT, "..", "shared", "abis");
const DEPLOYMENTS = join(ROOT, "deployments");

const MIN_BALANCE = parseEther("0.05"); // TSYS

async function main() {
  const { viem } = await network.connect();
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  const chainId = await publicClient.getChainId();
  if (chainId !== 57057) {
    throw new Error(`Wrong network: got chainId=${chainId}, expected 57057 (zkTanenbaum)`);
  }

  const balance = await publicClient.getBalance({ address: deployer.account.address });
  console.log(`→ deployer: ${deployer.account.address}`);
  console.log(`→ chain id: ${chainId} (zkTanenbaum)`);
  console.log(`→ balance:  ${formatEther(balance)} TSYS`);

  if (balance < MIN_BALANCE) {
    throw new Error(
      `Insufficient balance: ${formatEther(balance)} TSYS < ${formatEther(MIN_BALANCE)} TSYS.\n` +
      `→ Solicitá del faucet (URL en docs) y reintentá.`
    );
  }

  // 1. Deploy CitizenRegistry
  console.log("\n→ deploying CitizenRegistry to zkTanenbaum...");
  const registry = await viem.deployContract("CitizenRegistry");
  console.log(`✓ CitizenRegistry → ${registry.address}`);

  // 2. Deploy Vote
  const block = await publicClient.getBlock();
  const openAt = block.timestamp;
  const closeAt = openAt + BigInt(SEED_PROPOSAL.durationSeconds);

  console.log("\n→ deploying Vote with seed proposal...");
  const vote = await viem.deployContract("Vote", [
    registry.address,
    SEED_PROPOSAL.title,
    SEED_PROPOSAL.ipfsCid,
    openAt,
    closeAt,
  ]);
  console.log(`✓ Vote → ${vote.address}`);

  // 3. Persistir addresses
  mkdirSync(DEPLOYMENTS, { recursive: true });
  const out = {
    chainId: 57057,
    network: "zkTanenbaum",
    deployedAt: new Date().toISOString(),
    deployer: deployer.account.address,
    contracts: {
      CitizenRegistry: registry.address,
      Vote: vote.address,
    },
    seedProposal: {
      id: 1,
      title: SEED_PROPOSAL.title,
      ipfsCid: SEED_PROPOSAL.ipfsCid,
      openAt: openAt.toString(),
      closeAt: closeAt.toString(),
    },
    explorer: {
      CitizenRegistry: `https://explorer-zk.tanenbaum.io/address/${registry.address}`,
      Vote: `https://explorer-zk.tanenbaum.io/address/${vote.address}`,
    },
  };
  writeFileSync(
    join(DEPLOYMENTS, "zkTanenbaum.json"),
    JSON.stringify(out, null, 2)
  );
  console.log(`\n✓ deployments/zkTanenbaum.json escrito`);

  // 4. ABIs ya están en shared/abis/ desde el deploy local; no rehacer.
  // Sólo verificar que existan
  for (const name of ["CitizenRegistry", "Vote"]) {
    const artifactPath = join(ROOT, "artifacts", "contracts", `${name}.sol`, `${name}.json`);
    const targetPath = join(SHARED_ABIS, `${name}.json`);
    copyFileSync(artifactPath, targetPath);
    console.log(`✓ ABI confirmed: shared/abis/${name}.json`);
  }

  console.log(`\n🎉 Deploy zkTanenbaum OK. Explorers:`);
  console.log(`   CitizenRegistry: ${out.explorer.CitizenRegistry}`);
  console.log(`   Vote:            ${out.explorer.Vote}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
EOF
```

- [ ] **Step 2**: Verificar que compila TypeScript

```bash
cd blockchain && pnpm exec tsc --noEmit scripts/deploy-zktanenbaum.ts 2>&1 | head
```

Expected: sin output (= compila OK).

- [ ] **Step 3**: NO ejecutar contra testnet todavía — eso es Task C.5 cuando haya TSYS del faucet. Commit solo el script.

```bash
cd ..
git add blockchain/scripts/deploy-zktanenbaum.ts
git commit -m "blockchain(C.3): deploy-zktanenbaum.ts con balance check + explorer links"
```

---

## Task C.4 — Smoke test del deploy local

**Files**: ninguno (verificación).

- [ ] **Step 1**: Re-deploy desde cero (con Anvil reseteado)

```bash
bash infra/down.sh --purge && bash infra/up.sh
cd blockchain && pnpm exec hardhat run scripts/deploy-local.ts --network localhost
```

Expected: deploy nuevo con potencialmente otras addresses (Anvil cuenta 0 misma, nonce desde 0).

- [ ] **Step 2**: Verificar registro on-chain con cast (Foundry)

```bash
# Confirmar que getProposal(1) responde
cast call $(jq -r '.contracts.Vote' deployments/localhost.json) "getProposal(uint256)((uint256,string,string,uint256,uint256,bool))" 1 --rpc-url http://localhost:8545
```

Expected: tuple con id=1, title="Demo Sprint 1...", etc.

- [ ] **Step 3**: No commit (es solo smoke test, los archivos `deployments/localhost.json` y `shared/abis/` ya están versionados).

> **Nota**: Cada vez que se re-deploya local, `deployments/localhost.json` cambia. Es OK — el archivo refleja el deploy actual. En CI eventualmente se va a regenerar fresh para cada job.

---

## Task C.5 — Solicitar TSYS del faucet + deploy a zkTanenbaum

**Files**: ninguno (acción manual).

> **Nota**: este task es **opcional para Sprint 1 demo en Anvil**. Solo necesario si Orlando quiere mostrar el deploy real en zkTanenbaum como evidencia adicional (recomendado).

- [ ] **Step 1**: Conseguir TSYS del faucet zkTanenbaum

URL del faucet (verificar la URL oficial vigente · típicamente):
- https://faucet-zk.tanenbaum.io o
- Discord de Syscoin canal #zk-testnet-faucet

Solicitar a la dirección del deployer (la que corresponde a `DEPLOYER_PRIVATE_KEY` en `.env`). Mínimo 0.1 TSYS.

- [ ] **Step 2**: Verificar balance en el explorer

```bash
# Reemplazar 0xDEPLOYER... con tu dirección
open "https://explorer-zk.tanenbaum.io/address/0xDEPLOYER..."  # macOS
# o navegador manual
```

Confirmar ≥0.05 TSYS.

- [ ] **Step 3**: Deploy

```bash
cd blockchain && pnpm exec hardhat run scripts/deploy-zktanenbaum.ts --network zkTanenbaum
```

Expected: similar al deploy local pero con addresses reales en testnet y explorer URLs al final.

- [ ] **Step 4**: Verificar en el explorer

Abrir las URLs que el script imprimió. Confirmar que ambos contratos aparecen verificados (creation tx + bytecode).

- [ ] **Step 5**: Stage + commit el `deployments/zkTanenbaum.json`

```bash
cd ..
git add blockchain/deployments/zkTanenbaum.json
git commit -m "blockchain(C.5): deploy zkTanenbaum testnet — addresses + explorer links"
```

---

## Task C.6 — Documentar deploy en `blockchain/README.md`

**Files**: Modify `blockchain/README.md`.

- [ ] **Step 1**: Leer el README actual

```bash
cat blockchain/README.md | head -20
```

(Si ya existe del Sprint 1 scaffold original, agregar sección de deploy. Si no, crearlo.)

- [ ] **Step 2**: Sobrescribir / extender con sección deploy

```bash
cat > blockchain/README.md <<'EOF'
# blockchain/

Contratos Solidity de CivicSys / SSC ANTIPEREZA. Hardhat + TypeScript.

## Contratos

- **`CitizenRegistry.sol`** — registro on-chain de ciudadanos por hash de DNI.
- **`Vote.sol`** — voto consultivo sobre una propuesta única preseeded en el constructor.

Ambos se deployean juntos (Vote depende de CitizenRegistry).

## Setup

```bash
pnpm add
pnpm exec hardhat compile
pnpm exec hardhat test
pnpm test:ci   # corre tests + coverage + falla si <80%
```

## Deploy

### Local (Anvil)

Pre-requisito: Anvil corriendo (`bash ../infra/up.sh`).

```bash
pnpm exec hardhat run scripts/deploy-local.ts --network localhost
```

Side effects:
- `deployments/localhost.json` con las addresses
- `../shared/abis/{CitizenRegistry,Vote}.json` copiados desde `artifacts/`

### zkTanenbaum testnet

Pre-requisitos:
- `DEPLOYER_PRIVATE_KEY` en `.env` con cuenta financiada del faucet
- ≥0.05 TSYS de balance

```bash
pnpm exec hardhat run scripts/deploy-zktanenbaum.ts --network zkTanenbaum
```

Side effects:
- `deployments/zkTanenbaum.json` con addresses + explorer URLs

## Redes configuradas

| Red | Chain ID | RPC | Símbolo |
|---|---|---|---|
| `localhost` (Anvil) | 31337 | `http://localhost:8545` | ETH |
| `zkTanenbaum` (testnet real) | 57057 | `https://rpc-zk.tanenbaum.io` | TSYS |

## Tests

22 unit tests + 1 E2E. Coverage hard-gate ≥80% statements + 100% branches en reverts.

```bash
pnpm test:ci
open coverage/index.html  # ver reporte detallado
```

## Producto de cara al PPT

> Concepto SSC ANTIPEREZA: "La IA asesora. El ciudadano supervisa. El blockchain firma."
>
> Esta capa = el "blockchain firma". Sprint 1 cubre el escenario MVP: 1 propuesta, 3 opciones (Sí/No/Abstención), cierre por timestamp.
EOF
```

- [ ] **Step 3**: Stage + commit

```bash
git add blockchain/README.md
git commit -m "blockchain(C.6): README con sección deploy local + zkTanenbaum + redes"
```

---

## Criterios de done del Bloque C

- [ ] `deploy-local.ts` corre limpio contra Anvil + escribe `deployments/localhost.json` + copia ABIs.
- [ ] `deploy-zktanenbaum.ts` compila TypeScript y tiene balance check.
- [ ] (Opcional) `deployments/zkTanenbaum.json` existe si Orlando ya consiguió TSYS.
- [ ] `shared/abis/CitizenRegistry.json` y `shared/abis/Vote.json` versionados.
- [ ] `blockchain/README.md` documenta los pasos.
- [ ] 5-6 commits del bloque (`blockchain(C.X)`).

**Gate humano antes de Bloque D**: Orlando verifica que `cat blockchain/deployments/localhost.json` muestra addresses válidas y que `ls shared/abis/` lista los 2 ABIs. Aprueba pasar a shared types.
