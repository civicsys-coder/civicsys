// Demo E2E: una inscripción ciudadana REAL on-chain en zkTanenbaum (57057).
//
// Reproduce el flujo no-custodial real: se genera una wallet ciudadana fresca,
// el deployer le "dripea" un poco de TSYS para gas, y el ciudadano firma su
// propio mint de la Cédula Cívica (IdentitySBT.mint). Imprime el tx hash + link
// al explorer → la traza que pidió Fernando.
//
// Uso:
//   pnpm exec hardhat run scripts/demo-inscripcion-zk.ts --network zkTanenbaum

import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createWalletClient,
  createPublicClient,
  http,
  defineChain,
  parseEther,
  keccak256,
  toBytes,
} from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";

const ROOT = join(__dirname, "..");
const RPC = process.env.ZKTANENBAUM_RPC ?? "https://rpc-zk.tanenbaum.io";
const PK = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
const EXPLORER = "https://explorer-zk.tanenbaum.io";

const zkTanenbaum = defineChain({
  id: 57057,
  name: "zkTanenbaum",
  nativeCurrency: { name: "Testnet Syscoin", symbol: "TSYS", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
  blockExplorers: { default: { name: "zkTanenbaum Explorer", url: EXPLORER } },
  testnet: true,
});

const deployment = JSON.parse(
  readFileSync(join(ROOT, "deployments", "zkTanenbaum.json"), "utf8")
);
const IDENTITY = deployment.contracts.IdentitySBT as `0x${string}`;
const abi = JSON.parse(
  readFileSync(
    join(ROOT, "artifacts", "contracts", "IdentitySBT.sol", "IdentitySBT.json"),
    "utf8"
  )
).abi;

async function main() {
  const deployer = privateKeyToAccount(PK);
  const pub = createPublicClient({ chain: zkTanenbaum, transport: http(RPC) });
  const deployerWallet = createWalletClient({
    account: deployer,
    chain: zkTanenbaum,
    transport: http(RPC),
  });

  // 1) Wallet ciudadana fresca (como en el flujo real, generada en el navegador)
  const citizenPk = generatePrivateKey();
  const citizen = privateKeyToAccount(citizenPk);
  console.log(`→ IdentitySBT: ${IDENTITY}`);
  console.log(`→ ciudadano (wallet fresca): ${citizen.address}`);

  // 2) Drip de gas desde el deployer (patrón paymaster/relayer)
  console.log("→ fondeando al ciudadano con 0.05 TSYS para gas...");
  const fundHash = await deployerWallet.sendTransaction({
    to: citizen.address,
    value: parseEther("0.05"),
  });
  await pub.waitForTransactionReceipt({ hash: fundHash });
  console.log(`✓ ciudadano fondeado (tx ${fundHash})`);

  // 3) El ciudadano mintea su Cédula — commitments únicos, SIN PII
  const citizenWallet = createWalletClient({
    account: citizen,
    chain: zkTanenbaum,
    transport: http(RPC),
  });
  const dniHash = keccak256(toBytes(`dni-demo-${citizen.address}`));
  const faceCommitment = keccak256(toBytes(`face-demo-${citizen.address}`));
  const uri =
    "data:application/json," +
    encodeURIComponent(
      JSON.stringify({
        name: "Cedula Civica",
        description: "Demo E2E inscripción on-chain (CivicSys · zkSYS).",
        verificado: true,
        nivel: "mock",
      })
    );

  console.log("→ el ciudadano firma su inscripción (mint de la Cédula)...");
  const mintHash = await citizenWallet.writeContract({
    address: IDENTITY,
    abi,
    functionName: "mint",
    args: [dniHash, faceCommitment, uri],
  });
  const receipt = await pub.waitForTransactionReceipt({ hash: mintHash });
  if (receipt.status !== "success") {
    throw new Error(`mint revirtió (tx ${mintHash})`);
  }

  const tokenId = await pub.readContract({
    address: IDENTITY,
    abi,
    functionName: "tokenOfOwner",
    args: [citizen.address],
  });

  console.log(`\n🎉 INSCRIPCIÓN ON-CHAIN CONFIRMADA`);
  console.log(`   ciudadano: ${citizen.address}`);
  console.log(`   tokenId:   ${tokenId}`);
  console.log(`   tx (mint): ${mintHash}`);
  console.log(`\n   ► VER LA TRAZA:   ${EXPLORER}/tx/${mintHash}`);
  console.log(`   ► Cédula (addr):  ${EXPLORER}/address/${citizen.address}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
