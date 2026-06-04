/**
 * Definiciones viem de las chains soportadas Sprint 1.
 */

import { defineChain, type Chain } from "viem";

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
      http: [process.env.ZKTANENBAUM_RPC ?? "https://rpc-zk.tanenbaum.io"],
    },
  },
  blockExplorers: {
    default: { name: "zkTanenbaum Explorer", url: "https://explorer-zk.tanenbaum.io" },
  },
  testnet: true,
});

export const CHAINS_BY_ID: Record<number, Chain> = {
  31337: anvilLocal,
  57057: zkTanenbaum,
};

export type SupportedChainId = 31337 | 57057;

export function isSupportedChainId(id: number): id is SupportedChainId {
  return id === 31337 || id === 57057;
}
