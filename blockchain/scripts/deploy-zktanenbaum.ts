// Deploy COMPLETO (IdentitySBT + CitizenRegistry + Vote + AnonymousVote) a
// zkTanenbaum testnet (Chain ID 57057).
//
// Usa clientes viem construidos a mano con la cadena definida explícitamente,
// porque 57057 no está en el registro de viem/chains y hardhat-viem no la
// autodetecta (NetworkNotFoundError). Lee la key de DEPLOYER_PRIVATE_KEY (.env).
//
// Uso:
//   pnpm exec hardhat run scripts/deploy-zktanenbaum.ts --network zkTanenbaum
//
// Pre-requisitos:
//   - DEPLOYER_PRIVATE_KEY en .env (su address fondeada con TSYS)
//   - Faucet: https://faucet-zk.tanenbaum.io/

import "dotenv/config";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import {
  createWalletClient,
  createPublicClient,
  http,
  defineChain,
  formatEther,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { SEED_PROPOSAL } from "./seed-data";

const ROOT = join(__dirname, "..");
const SHARED_ABIS = join(ROOT, "..", "shared", "abis");
const FRONTEND_ABIS = join(ROOT, "..", "frontend", "civicsys", "lib", "abi");
const DEPLOYMENTS = join(ROOT, "deployments");
const EXPLORER = "https://explorer-zk.tanenbaum.io";

const RPC = process.env.ZKTANENBAUM_RPC ?? "https://rpc-zk.tanenbaum.io";
const PK = process.env.DEPLOYER_PRIVATE_KEY;

// zkSYS es un L2 (gas barato). Umbral bajo: alcanza con bridgear ~0.01 TSYS desde
// NEVM. Si el deploy se queda sin gas a mitad, bridgeá un poco más y reintentá.
const MIN_BALANCE = parseEther("0.005");

const zkTanenbaum = defineChain({
  id: 57057,
  name: "zkTanenbaum",
  nativeCurrency: { name: "Testnet Syscoin", symbol: "TSYS", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
  blockExplorers: { default: { name: "zkTanenbaum Explorer", url: EXPLORER } },
  testnet: true,
});

function loadArtifact(name: string): { abi: any; bytecode: `0x${string}` } {
  const p = join(ROOT, "artifacts", "contracts", `${name}.sol`, `${name}.json`);
  const j = JSON.parse(readFileSync(p, "utf8"));
  if (j.linkReferences && Object.keys(j.linkReferences).length > 0) {
    throw new Error(`${name} requiere linkear librerías externas — no soportado por este script`);
  }
  return { abi: j.abi, bytecode: j.bytecode };
}

async function main() {
  if (!PK || !/^0x[0-9a-fA-F]{64}$/.test(PK)) {
    throw new Error(
      "DEPLOYER_PRIVATE_KEY ausente o mal formada en .env (debe ser 0x + 64 hex).\n" +
      "→ Editá blockchain/.env y pegá la private key de tu wallet."
    );
  }

  const account = privateKeyToAccount(PK as `0x${string}`);
  const walletClient = createWalletClient({ account, chain: zkTanenbaum, transport: http(RPC) });
  const publicClient = createPublicClient({ chain: zkTanenbaum, transport: http(RPC) });

  const chainId = await publicClient.getChainId();
  if (chainId !== 57057) {
    throw new Error(`Wrong network: got chainId=${chainId}, expected 57057 (zkTanenbaum)`);
  }

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`→ deployer: ${account.address}`);
  console.log(`→ chain id: ${chainId} (zkTanenbaum)`);
  console.log(`→ balance:  ${formatEther(balance)} TSYS`);

  if (balance < MIN_BALANCE) {
    throw new Error(
      `Insufficient balance: ${formatEther(balance)} TSYS < ${formatEther(MIN_BALANCE)} TSYS.\n` +
      `→ Pedí TSYS en https://faucet-zk.tanenbaum.io/ (address de arriba) y reintentá.`
    );
  }

  async function deploy(name: string, args: any[] = []): Promise<`0x${string}`> {
    const { abi, bytecode } = loadArtifact(name);
    console.log(`\n→ deploying ${name}...`);
    const hash = await walletClient.deployContract({ abi, bytecode, args });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success" || !receipt.contractAddress) {
      throw new Error(
        `Deploy de ${name} revirtió (tx ${hash}). Posible causa: la red no soporta el ` +
        `opcode mcopy (evmVersion cancun). Avisá para recompilar a 'paris'/'shanghai'.`
      );
    }
    console.log(`✓ ${name} → ${receipt.contractAddress}  (tx ${hash})`);
    return receipt.contractAddress;
  }

  const identity = await deploy("IdentitySBT");
  const registry = await deploy("CitizenRegistry");

  const block = await publicClient.getBlock();
  const openAt = block.timestamp;
  const closeAt = openAt + BigInt(SEED_PROPOSAL.durationSeconds);

  const vote = await deploy("Vote", [
    identity, // Vote consume ICitizenRegistry → la Cédula determina la ciudadanía
    SEED_PROPOSAL.title,
    SEED_PROPOSAL.ipfsCid,
    openAt,
    closeAt,
  ]);

  const anon = await deploy("AnonymousVote");

  mkdirSync(DEPLOYMENTS, { recursive: true });
  const out = {
    chainId: 57057,
    network: "zkTanenbaum",
    deployedAt: new Date().toISOString(),
    deployer: account.address,
    contracts: {
      IdentitySBT: identity,
      CitizenRegistry: registry,
      Vote: vote,
      AnonymousVote: anon,
    },
    seedProposal: {
      id: 1,
      title: SEED_PROPOSAL.title,
      ipfsCid: SEED_PROPOSAL.ipfsCid,
      openAt: openAt.toString(),
      closeAt: closeAt.toString(),
    },
    explorer: {
      IdentitySBT: `${EXPLORER}/address/${identity}`,
      CitizenRegistry: `${EXPLORER}/address/${registry}`,
      Vote: `${EXPLORER}/address/${vote}`,
      AnonymousVote: `${EXPLORER}/address/${anon}`,
    },
  };
  const deploymentJson = JSON.stringify(out, null, 2);
  writeFileSync(join(DEPLOYMENTS, "zkTanenbaum.json"), deploymentJson);
  console.log(`\n✓ deployments/zkTanenbaum.json escrito`);

  mkdirSync(SHARED_ABIS, { recursive: true });
  mkdirSync(FRONTEND_ABIS, { recursive: true });
  for (const name of ["IdentitySBT", "CitizenRegistry", "Vote", "AnonymousVote"]) {
    const artifactPath = join(ROOT, "artifacts", "contracts", `${name}.sol`, `${name}.json`);
    copyFileSync(artifactPath, join(SHARED_ABIS, `${name}.json`));
    copyFileSync(artifactPath, join(FRONTEND_ABIS, `${name}.json`));
    console.log(`✓ ABI copiado: shared/abis/${name}.json + frontend/lib/abi/${name}.json`);
  }
  writeFileSync(join(FRONTEND_ABIS, "zkTanenbaum.json"), deploymentJson);
  console.log(`✓ frontend/civicsys/lib/abi/zkTanenbaum.json actualizado`);

  console.log(`\n🎉 Deploy zkTanenbaum OK. Verificá en el explorer:`);
  console.log(`   IdentitySBT (inscripción): ${out.explorer.IdentitySBT}`);
  console.log(`   Vote:                      ${out.explorer.Vote}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
