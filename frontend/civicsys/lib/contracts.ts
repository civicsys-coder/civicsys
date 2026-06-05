/**
 * Loaders de ABIs + addresses por chain.
 * ABIs vienen de shared/abis/ (regenerados en cada deploy).
 * Addresses vienen de blockchain/deployments/{red}.json.
 */

import CitizenRegistryArtifact from "./abi/CitizenRegistry.json";
import VoteArtifact from "./abi/Vote.json";
import IdentitySBTArtifact from "./abi/IdentitySBT.json";
import AnonymousVoteArtifact from "./abi/AnonymousVote.json";
import LocalDeployment from "./abi/localhost.json";
import ZkTanenbaumDeployment from "./abi/zkTanenbaum.json";
import type { SupportedChainId } from "./wagmi";

export const CitizenRegistryAbi = CitizenRegistryArtifact.abi;
export const VoteAbi = VoteArtifact.abi;
export const IdentitySBTAbi = IdentitySBTArtifact.abi;
export const AnonymousVoteAbi = AnonymousVoteArtifact.abi;

interface DeploymentJson {
  chainId: number;
  contracts: {
    CitizenRegistry: string;
    Vote: string;
    IdentitySBT?: string;
    AnonymousVote?: string;
  };
  seedProposal?: {
    id: number;
    title: string;
    ipfsCid: string;
    openAt: string;
    closeAt: string;
  };
}

const DEPLOYMENTS: Partial<Record<SupportedChainId, DeploymentJson>> = {
  31337: LocalDeployment as DeploymentJson,
  57057: ZkTanenbaumDeployment as DeploymentJson,
};

export function getAddresses(chainId: SupportedChainId) {
  const d = DEPLOYMENTS[chainId];
  if (!d) {
    throw new Error(`No deployment available for chainId ${chainId}`);
  }
  return d.contracts;
}

export function getSeedProposal(chainId: SupportedChainId) {
  const d = DEPLOYMENTS[chainId];
  return d?.seedProposal ?? null;
}
