/**
 * BlockchainService — wrapper sobre viem para leer contratos.
 *
 * Reemplaza el placeholder mockeado del Sprint 2 scaffold (que devolvía
 * "0xHashFalso123"). Lee on-chain con viem.createPublicClient. Soporta
 * dual-chain (Anvil 31337 o zkTanenbaum 57057).
 *
 * Sprint 1: solo lecturas (readContract). Las escrituras (register, castVote)
 * las hace el frontend con MetaMask — backend nunca posee private keys.
 */

import { createPublicClient, http, type Address, type PublicClient } from "viem";
import { CHAINS_BY_ID, isSupportedChainId } from "../lib/chains.js";
import CitizenRegistryArtifact from "../../../shared/abis/CitizenRegistry.json" with { type: "json" };
import VoteArtifact from "../../../shared/abis/Vote.json" with { type: "json" };

export interface Proposal {
  id: bigint;
  title: string;
  ipfsCid: string;
  openAt: bigint;
  closeAt: bigint;
  closed: boolean;
  chainId: 31337 | 57057;
}

export interface Tally {
  yes: bigint;
  no: bigint;
  abstain: bigint;
}

export interface CitizenStatus {
  address: Address;
  registered: boolean;
  hash: `0x${string}` | null;
}

export interface BlockchainServiceConfig {
  chainId: 31337 | 57057;
  registryAddress: Address;
  voteAddress: Address;
}

export class BlockchainService {
  private client: PublicClient;
  private cfg: BlockchainServiceConfig;

  constructor(cfg: BlockchainServiceConfig) {
    if (!isSupportedChainId(cfg.chainId)) {
      throw new Error(`Unsupported chainId: ${cfg.chainId}`);
    }
    this.cfg = cfg;
    this.client = createPublicClient({
      chain: CHAINS_BY_ID[cfg.chainId],
      transport: http(),
    });
  }

  async getProposal(id: bigint): Promise<Proposal> {
    const result = await this.client.readContract({
      address: this.cfg.voteAddress,
      abi: VoteArtifact.abi,
      functionName: "getProposal",
      args: [id],
    });
    const r = result as {
      id: bigint;
      title: string;
      ipfsCid: string;
      openAt: bigint;
      closeAt: bigint;
      closed: boolean;
    };
    return {
      id: r.id,
      title: r.title,
      ipfsCid: r.ipfsCid,
      openAt: r.openAt,
      closeAt: r.closeAt,
      closed: r.closed,
      chainId: this.cfg.chainId,
    };
  }

  async getTally(id: bigint): Promise<Tally> {
    const result = (await this.client.readContract({
      address: this.cfg.voteAddress,
      abi: VoteArtifact.abi,
      functionName: "tally",
      args: [id],
    })) as readonly [bigint, bigint, bigint];
    return { yes: result[0], no: result[1], abstain: result[2] };
  }

  async isRegistered(address: Address): Promise<boolean> {
    return (await this.client.readContract({
      address: this.cfg.registryAddress,
      abi: CitizenRegistryArtifact.abi,
      functionName: "isRegistered",
      args: [address],
    })) as boolean;
  }

  async getCitizenStatus(address: Address): Promise<CitizenStatus> {
    const registered = await this.isRegistered(address);
    if (!registered) {
      return { address, registered: false, hash: null };
    }
    const hash = (await this.client.readContract({
      address: this.cfg.registryAddress,
      abi: CitizenRegistryArtifact.abi,
      functionName: "hashOf",
      args: [address],
    })) as `0x${string}`;
    return { address, registered: true, hash };
  }
}
