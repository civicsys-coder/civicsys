// Relayer compartido (testnet zkSYS) — clientes viem + chain definida explícitamente
// (57057 no está en el registro de viem). Lo usan el faucet-drip y el anclaje de
// reportes de La Tóxica.
//
// SEGURIDAD (honesta): RELAYER_PRIVATE_KEY custodia solo TSYS de TESTNET (sin valor)
// y solo paga gas / firma anclajes. No es custodia de fondos de usuarios. En
// producción: paymaster (AA) para el gas y multisig 2-de-3 para anclar.

import {
  createWalletClient,
  createPublicClient,
  http,
  defineChain,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const RPC =
  process.env.ZKSYS_RPC_URL ?? process.env.RPC_URL ?? "https://rpc-zk.tanenbaum.io";
export const CHAIN_ID = Number(process.env.CHAIN_ID ?? 57057);
export const EXPLORER = process.env.ZKSYS_EXPLORER_URL ?? "https://explorer-zk.tanenbaum.io";

const RELAYER_PK = process.env.RELAYER_PRIVATE_KEY as `0x${string}` | undefined;

export const zkChain = defineChain({
  id: CHAIN_ID,
  name: "zkSYS Testnet (zkTanenbaum)",
  nativeCurrency: { name: "TSYS", symbol: "TSYS", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
  blockExplorers: { default: { name: "Explorer", url: EXPLORER } },
  testnet: true,
});

export const publicClient = createPublicClient({ chain: zkChain, transport: http(RPC) });

export const relayerConfigured = Boolean(RELAYER_PK);

/** Wallet client del relayer. Lanza si no hay RELAYER_PRIVATE_KEY. */
export function relayerWallet(): WalletClient {
  if (!RELAYER_PK) throw new Error("RELAYER_PRIVATE_KEY no configurado");
  const account = privateKeyToAccount(RELAYER_PK);
  return createWalletClient({ account, chain: zkChain, transport: http(RPC) });
}
