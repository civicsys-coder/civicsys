import { defineChain, http } from "viem";
import { createConfig } from "wagmi";
import { injected } from "wagmi/connectors";

export const anvilLocal = defineChain({
  id: 31337,
  name: "Anvil local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://localhost:8545"] } },
});

export const zkTanenbaum = defineChain({
  id: 57057,
  name: "zkSYS Testnet (zkTanenbaum)",
  nativeCurrency: { name: "TSYS", symbol: "TSYS", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_ZKSYS_RPC_URL ?? "https://rpc-zk.tanenbaum.io"],
    },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://explorer-zk.tanenbaum.io" },
  },
  testnet: true,
});

export const wagmiConfig = createConfig({
  chains: [anvilLocal, zkTanenbaum],
  connectors: [injected()],
  transports: {
    [anvilLocal.id]: http(),
    [zkTanenbaum.id]: http(),
  },
});

export const SUPPORTED_CHAIN_IDS = [31337, 57057] as const;
export type SupportedChainId = (typeof SUPPORTED_CHAIN_IDS)[number];
