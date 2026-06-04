import { Pool } from "pg";
import { BlockchainService } from "../services/blockchain.service.js";
import { SupabaseService } from "../services/supabase.service.js";
import type { Address } from "viem";

const DEFAULT_CHAIN_ID = Number(process.env.CHAIN_ID ?? 31337);

if (DEFAULT_CHAIN_ID !== 31337 && DEFAULT_CHAIN_ID !== 57057) {
  throw new Error(`Unsupported CHAIN_ID: ${DEFAULT_CHAIN_ID}`);
}

const REGISTRY_ADDRESS = process.env.REGISTRY_ADDRESS as Address | undefined;
const VOTE_ADDRESS = process.env.VOTE_ADDRESS as Address | undefined;

if (!REGISTRY_ADDRESS || !VOTE_ADDRESS) {
  throw new Error("REGISTRY_ADDRESS and VOTE_ADDRESS env vars required");
}

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:54330/civicsys",
});

const blockchain = new BlockchainService({
  chainId: DEFAULT_CHAIN_ID as 31337 | 57057,
  registryAddress: REGISTRY_ADDRESS,
  voteAddress: VOTE_ADDRESS,
});

const supabase = new SupabaseService({ pool });

export function createContext() {
  return { blockchain, supabase };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
