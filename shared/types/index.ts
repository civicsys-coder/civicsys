/**
 * shared/types — tipos canónicos cross-stack (backend Node + frontend).
 *
 * No re-exporta los ABIs (eso vive en shared/abis/). Estos son los tipos
 * que circulan por las APIs (tRPC, FastAPI) y por la UI. Cuando un cambio
 * en los contratos rompa estos tipos, hay que tocar acá explícitamente.
 */

/** Hex address (0x-prefixed, 40 hex chars). */
export type Address = `0x${string}`;

/** Hex bytes32 (0x-prefixed, 64 hex chars). */
export type Bytes32 = `0x${string}`;

/** Hex tx hash (0x-prefixed, 64 hex chars). */
export type TxHash = `0x${string}`;

/** Chains soportadas Sprint 1. */
export type SupportedChainId = 31337 | 57057;

export const CHAIN_NAMES: Record<SupportedChainId, string> = {
  31337: "Anvil local",
  57057: "zkTanenbaum",
};

export const CHAIN_EXPLORERS: Record<SupportedChainId, string | null> = {
  31337: null,
  57057: "https://explorer-zk.tanenbaum.io",
};

/** Choice enum mirroring contracts/Vote.sol::Choice. */
export enum Choice {
  Yes = 0,
  No = 1,
  Abstain = 2,
}

export const CHOICE_LABELS: Record<Choice, string> = {
  [Choice.Yes]: "Sí",
  [Choice.No]: "No",
  [Choice.Abstain]: "Abstención",
};

/** Propuesta tal cual la lee on-chain o el cache Supabase. */
export interface Proposal {
  id: bigint;
  title: string;
  ipfsCid: string;
  openAt: bigint;
  closeAt: bigint;
  closed: boolean;
  chainId: SupportedChainId;
}

/** Tally on-chain. */
export interface Tally {
  yes: bigint;
  no: bigint;
  abstain: bigint;
}

/** Reporte generado por Hermes (DB row de hermes_reports). */
export interface HermesReport {
  id: string;
  proposalId: bigint;
  chainId: SupportedChainId;
  bodyMarkdown: string;
  llmProvider: "anthropic" | "openrouter" | "unavailable";
  confidence: number;
  txHash: TxHash | null;
  blockNumber: bigint | null;
  createdAt: string;
}

/** Estado de un ciudadano en el registry on-chain. */
export interface CitizenStatus {
  address: Address;
  registered: boolean;
  hash: Bytes32 | null;
}

/** Cédula Cívica (NFT soulbound) tal como se lee on-chain. */
export interface Cedula {
  tokenId: bigint;
  holder: Address;
  dniHash: Bytes32;
  faceCommitment: Bytes32;
  mintedAt: string;
}

/** Resultado del dedupe facial de Hermes (off-chain). */
export interface FaceDedupeResult {
  duplicate: boolean;
  similarity: number;
  topMatch: Bytes32 | null;
}
