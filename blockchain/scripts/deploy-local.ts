// Deploy de IdentitySBT + CitizenRegistry (compat) + Vote a la red localhost (Anvil).
//
// Uso:
//   pnpm exec hardhat run scripts/deploy-local.ts --network localhost
//
// Side effects:
//   - Escribe deployments/localhost.json con las addresses
//   - Copia ABIs a ../shared/abis/{IdentitySBT,CitizenRegistry,Vote}.json
//   - Copia ABIs + localhost.json a ../frontend/civicsys/lib/abi/ (Turbopack no
//     resuelve imports fuera del root del proyecto Next; ver lib/contracts.ts)
//
// Orden de deploy (determinista): IdentitySBT (nonce 0), CitizenRegistry (nonce 1),
// Vote (nonce 2) apuntando a IdentitySBT vía ICitizenRegistry. La ciudadanía la
// determina la Cédula (IdentitySBT.isRegistered).
//
// Pre-requisito: Anvil corriendo en localhost:8545 (bash infra/up.sh)

import hre from "hardhat";
import { writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { SEED_PROPOSAL } from "./seed-data";

const ROOT = join(__dirname, "..");
const SHARED_ABIS = join(ROOT, "..", "shared", "abis");
const FRONTEND_ABIS = join(ROOT, "..", "frontend", "civicsys", "lib", "abi");
const DEPLOYMENTS = join(ROOT, "deployments");

async function main() {
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  console.log(`→ deployer: ${deployer.account.address}`);
  console.log(`→ chain id: ${await publicClient.getChainId()}`);

  console.log("\n→ deploying IdentitySBT (Cédula Cívica)...");
  const identity = await hre.viem.deployContract("IdentitySBT");
  console.log(`✓ IdentitySBT → ${identity.address}`);

  console.log("\n→ deploying CitizenRegistry (compat legacy)...");
  const registry = await hre.viem.deployContract("CitizenRegistry");
  console.log(`✓ CitizenRegistry → ${registry.address}`);

  const block = await publicClient.getBlock();
  const openAt = block.timestamp;
  const closeAt = openAt + BigInt(SEED_PROPOSAL.durationSeconds);

  console.log("\n→ deploying Vote (gated por IdentitySBT)...");
  const vote = await hre.viem.deployContract("Vote", [
    identity.address, // Vote consume ICitizenRegistry → la Cédula es la ciudadanía
    SEED_PROPOSAL.title,
    SEED_PROPOSAL.ipfsCid,
    openAt,
    closeAt,
  ]);
  console.log(`✓ Vote → ${vote.address} (registry = IdentitySBT)`);
  console.log(`  title:   ${SEED_PROPOSAL.title}`);
  console.log(`  openAt:  ${new Date(Number(openAt) * 1000).toISOString()}`);
  console.log(`  closeAt: ${new Date(Number(closeAt) * 1000).toISOString()}`);

  console.log("\n→ deploying AnonymousVote (voto anónimo por nullifier)...");
  const anon = await hre.viem.deployContract("AnonymousVote");
  console.log(`✓ AnonymousVote → ${anon.address}`);

  mkdirSync(DEPLOYMENTS, { recursive: true });
  const out = {
    chainId: 31337,
    network: "localhost",
    deployedAt: new Date().toISOString(),
    deployer: deployer.account.address,
    contracts: {
      IdentitySBT: identity.address,
      CitizenRegistry: registry.address,
      Vote: vote.address,
      AnonymousVote: anon.address,
    },
    seedProposal: {
      id: 1,
      title: SEED_PROPOSAL.title,
      ipfsCid: SEED_PROPOSAL.ipfsCid,
      openAt: openAt.toString(),
      closeAt: closeAt.toString(),
    },
  };
  const deploymentJson = JSON.stringify(out, null, 2);
  writeFileSync(join(DEPLOYMENTS, "localhost.json"), deploymentJson);
  console.log(`\n✓ deployments/localhost.json escrito`);

  // Copiar ABIs a shared/ y al frontend (lib/abi), + localhost.json al frontend.
  mkdirSync(SHARED_ABIS, { recursive: true });
  mkdirSync(FRONTEND_ABIS, { recursive: true });
  for (const name of ["IdentitySBT", "CitizenRegistry", "Vote", "AnonymousVote"]) {
    const artifactPath = join(
      ROOT, "artifacts", "contracts", `${name}.sol`, `${name}.json`
    );
    copyFileSync(artifactPath, join(SHARED_ABIS, `${name}.json`));
    copyFileSync(artifactPath, join(FRONTEND_ABIS, `${name}.json`));
    console.log(`✓ ABI copied: shared/abis/${name}.json + frontend/lib/abi/${name}.json`);
  }
  writeFileSync(join(FRONTEND_ABIS, "localhost.json"), deploymentJson);
  console.log(`✓ frontend/civicsys/lib/abi/localhost.json actualizado`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
