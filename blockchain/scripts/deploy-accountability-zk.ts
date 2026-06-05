// Despliega SOLO AccountabilityLog a zkTanenbaum (57057) y lo agrega al
// deployments/zkTanenbaum.json existente (sin tocar los otros 4 contratos).
//
// Uso:
//   pnpm exec hardhat run scripts/deploy-accountability-zk.ts --network zkTanenbaum

import "dotenv/config";
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createWalletClient, createPublicClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const ROOT = join(__dirname, "..");
const RPC = process.env.ZKTANENBAUM_RPC ?? "https://rpc-zk.tanenbaum.io";
const PK = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
const EXPLORER = "https://explorer-zk.tanenbaum.io";
const DEPLOYMENTS = join(ROOT, "deployments");
const SHARED_ABIS = join(ROOT, "..", "shared", "abis");
const FRONTEND_ABIS = join(ROOT, "..", "frontend", "civicsys", "lib", "abi");

const zkTanenbaum = defineChain({
  id: 57057,
  name: "zkTanenbaum",
  nativeCurrency: { name: "Testnet Syscoin", symbol: "TSYS", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
  testnet: true,
});

function loadArtifact(name: string): { abi: any; bytecode: `0x${string}` } {
  const p = join(ROOT, "artifacts", "contracts", `${name}.sol`, `${name}.json`);
  const j = JSON.parse(readFileSync(p, "utf8"));
  return { abi: j.abi, bytecode: j.bytecode };
}

async function main() {
  if (!PK) throw new Error("DEPLOYER_PRIVATE_KEY ausente en .env");
  const account = privateKeyToAccount(PK);
  const pub = createPublicClient({ chain: zkTanenbaum, transport: http(RPC) });
  const wallet = createWalletClient({ account, chain: zkTanenbaum, transport: http(RPC) });

  const { abi, bytecode } = loadArtifact("AccountabilityLog");
  console.log("→ deploying AccountabilityLog (anclaje de La Tóxica)...");
  const hash = await wallet.deployContract({ abi, bytecode });
  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success" || !receipt.contractAddress) {
    throw new Error(`deploy revirtió (tx ${hash})`);
  }
  const address = receipt.contractAddress;
  console.log(`✓ AccountabilityLog → ${address}  (tx ${hash})`);

  // Merge en el deployments/zkTanenbaum.json existente.
  const depPath = join(DEPLOYMENTS, "zkTanenbaum.json");
  const dep = JSON.parse(readFileSync(depPath, "utf8"));
  dep.contracts.AccountabilityLog = address;
  dep.explorer = dep.explorer ?? {};
  dep.explorer.AccountabilityLog = `${EXPLORER}/address/${address}`;
  writeFileSync(depPath, JSON.stringify(dep, null, 2));
  console.log("✓ deployments/zkTanenbaum.json actualizado");

  // Copiar ABI a shared/ y al frontend.
  mkdirSync(SHARED_ABIS, { recursive: true });
  mkdirSync(FRONTEND_ABIS, { recursive: true });
  const art = join(ROOT, "artifacts", "contracts", "AccountabilityLog.sol", "AccountabilityLog.json");
  copyFileSync(art, join(SHARED_ABIS, "AccountabilityLog.json"));
  copyFileSync(art, join(FRONTEND_ABIS, "AccountabilityLog.json"));
  console.log("✓ ABI copiado a shared/abis + frontend/lib/abi");

  console.log(`\n🎉 AccountabilityLog desplegado:`);
  console.log(`   ${EXPLORER}/address/${address}`);
  console.log(`\n   → seteá ACCOUNTABILITY_ADDRESS=${address} en el backend de Railway`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
