// Deploy de CitizenRegistry + Vote a zkTanenbaum testnet (Chain ID 57057).
//
// Uso:
//   pnpm exec hardhat run scripts/deploy-zktanenbaum.ts --network zkTanenbaum
//
// Pre-requisitos:
//   - DEPLOYER_PRIVATE_KEY en .env con TSYS del faucet
//   - RPC zkTanenbaum (rpc-zk.tanenbaum.io) online

import hre from "hardhat";
import { writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { formatEther, parseEther } from "viem";
import { SEED_PROPOSAL } from "./seed-data";

const ROOT = join(__dirname, "..");
const SHARED_ABIS = join(ROOT, "..", "shared", "abis");
const DEPLOYMENTS = join(ROOT, "deployments");

const MIN_BALANCE = parseEther("0.05");

async function main() {
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

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

  console.log("\n→ deploying CitizenRegistry to zkTanenbaum...");
  const registry = await hre.viem.deployContract("CitizenRegistry");
  console.log(`✓ CitizenRegistry → ${registry.address}`);

  const block = await publicClient.getBlock();
  const openAt = block.timestamp;
  const closeAt = openAt + BigInt(SEED_PROPOSAL.durationSeconds);

  console.log("\n→ deploying Vote with seed proposal...");
  const vote = await hre.viem.deployContract("Vote", [
    registry.address,
    SEED_PROPOSAL.title,
    SEED_PROPOSAL.ipfsCid,
    openAt,
    closeAt,
  ]);
  console.log(`✓ Vote → ${vote.address}`);

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

  mkdirSync(SHARED_ABIS, { recursive: true });
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
