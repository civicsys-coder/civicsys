"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAccount, useChainId, useReadContract, useWriteContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { NetworkBadge } from "@/components/NetworkBadge";
import { VoteVisibilityWarning } from "@/components/VoteVisibilityWarning";
import { CitizenRegistryAbi, VoteAbi, getAddresses } from "@/lib/contracts";
import type { SupportedChainId } from "@/lib/wagmi";

export default function ProposalPage() {
  const params = useParams<{ id: string }>();
  const id = BigInt(params.id ?? "1");
  const chainId = useChainId();
  const { isConnected, address } = useAccount();
  const addresses = (() => {
    try { return getAddresses(chainId as SupportedChainId); } catch { return null; }
  })();

  const { writeContract, isPending } = useWriteContract();

  const { data: proposal } = useReadContract({
    address: addresses?.Vote as `0x${string}` | undefined,
    abi: VoteAbi,
    functionName: "getProposal",
    args: [id],
    query: { enabled: !!addresses },
  }) as { data: { title: string; closed: boolean } | undefined };

  const { data: tally } = useReadContract({
    address: addresses?.Vote as `0x${string}` | undefined,
    abi: VoteAbi,
    functionName: "tally",
    args: [id],
    query: { enabled: !!addresses, refetchInterval: 5000 },
  }) as { data: readonly [bigint, bigint, bigint] | undefined };

  const { data: registered } = useReadContract({
    address: addresses?.CitizenRegistry as `0x${string}` | undefined,
    abi: CitizenRegistryAbi,
    functionName: "isRegistered",
    args: [address as `0x${string}`],
    query: { enabled: !!addresses && !!address },
  }) as { data: boolean | undefined };

  function vote(choice: 0 | 1 | 2) {
    if (!addresses) return;
    writeContract({
      address: addresses.Vote as `0x${string}`,
      abi: VoteAbi,
      functionName: "castVote",
      args: [id, choice],
    });
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="max-w-2xl mx-auto px-6 py-16 space-y-6">
        <h1 className="text-3xl font-bold">{proposal?.title ?? "Cargando..."}</h1>

        {tally && (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><div className="text-3xl font-bold">{tally[0].toString()}</div><div className="text-sm text-muted-foreground">Sí</div></div>
            <div><div className="text-3xl font-bold">{tally[1].toString()}</div><div className="text-sm text-muted-foreground">No</div></div>
            <div><div className="text-3xl font-bold">{tally[2].toString()}</div><div className="text-sm text-muted-foreground">Abstención</div></div>
          </div>
        )}

        {!isConnected && <p>Conectá tu wallet para votar.</p>}
        {isConnected && !registered && (
          <p>Tenés que <Link href="/registro" className="underline">registrarte</Link> antes de votar.</p>
        )}
        {isConnected && registered && !proposal?.closed && (
          <>
            <VoteVisibilityWarning />
            <div className="flex gap-3">
              <Button onClick={() => vote(0)} disabled={isPending}>Sí</Button>
              <Button onClick={() => vote(1)} disabled={isPending} variant="outline">No</Button>
              <Button onClick={() => vote(2)} disabled={isPending} variant="ghost">Abstención</Button>
            </div>
          </>
        )}
        {proposal?.closed && <p className="text-muted-foreground">Propuesta cerrada.</p>}
      </section>
    </main>
  );
}
