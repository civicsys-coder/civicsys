"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { Button } from "@/components/ui/button";
import { MatrixRain } from "@/components/MatrixRain";
import { AnonymousVoteAbi, getAddresses } from "@/lib/contracts";
import { anvilLocal } from "@/lib/wagmi";
import { computeNullifier, getOrCreateIdentitySecret } from "@/lib/nullifier";

// Relayer local: cuenta Anvil #1 (clave de prueba PÚBLICA, solo localhost 31337).
// Sustituye al votante como emisor de la tx → unlinkability (el msg.sender no es
// la identidad). En producción sería un relayer/meta-tx real.
const RELAYER_PK = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as const;
const PROPOSAL_ID = 1;
const CHOICES = [
  { v: 0, label: "Sí", color: "var(--primary)" },
  { v: 1, label: "No", color: "var(--destructive)" },
  { v: 2, label: "Abstención", color: "var(--muted-foreground)" },
] as const;

export default function VotacionPage() {
  const [tally, setTally] = useState<[bigint, bigint, bigint] | null>(null);
  const [state, setState] = useState<"idle" | "voting" | "done" | "dup" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const addresses = (() => {
    try {
      return getAddresses(31337);
    } catch {
      return null;
    }
  })();
  const anon = addresses?.AnonymousVote as `0x${string}` | undefined;

  const pub = createPublicClient({ chain: anvilLocal, transport: http() });

  async function refresh() {
    if (!anon) return;
    try {
      const t = (await pub.readContract({
        address: anon,
        abi: AnonymousVoteAbi,
        functionName: "tally",
        args: [BigInt(PROPOSAL_ID)],
      })) as [bigint, bigint, bigint];
      setTally(t);
    } catch {
      /* anvil puede no estar arriba */
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anon]);

  async function vote(choice: number) {
    if (!anon) return;
    setState("voting");
    setError(null);
    try {
      const secret = getOrCreateIdentitySecret();
      const nullifier = computeNullifier(secret, PROPOSAL_ID);
      const account = privateKeyToAccount(RELAYER_PK);
      const wallet = createWalletClient({ account, chain: anvilLocal, transport: http() });
      const hash = await wallet.writeContract({
        address: anon,
        abi: AnonymousVoteAbi,
        functionName: "castAnonymous",
        args: [BigInt(PROPOSAL_ID), choice, nullifier],
      });
      await pub.waitForTransactionReceipt({ hash });
      setState("done");
      refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      if (/ya votaste/.test(msg)) setState("dup");
      else {
        setError(msg.split("\n")[0]);
        setState("error");
      }
    }
  }

  const total = tally ? Number(tally[0] + tally[1] + tally[2]) : 0;
  const pct = (n: bigint) => (total ? Math.round((Number(n) * 1000) / total) / 10 : 0);

  return (
    <>
      <MatrixRain />
      <main className="relative z-10 min-h-screen px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-2xl">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Sprint 04 · voto anónimo
            </span>
          </header>

          <section className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Votación anónima</h1>
              <p className="text-sm text-muted-foreground">
                Tu voto es <strong>anónimo</strong> y <strong>uno por persona</strong>. Un{" "}
                <em>nullifier</em> derivado de tu identidad evita el doble voto sin revelar quién
                sos. El conteo es público; los votantes, no.
              </p>
            </div>

            {/* Tally en vivo */}
            <div className="border border-border bg-card p-4">
              <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                Propuesta #{PROPOSAL_ID} · {total} votos
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {CHOICES.map((c, i) => (
                  <div key={c.v}>
                    <div className="text-2xl font-bold" style={{ color: c.color }}>
                      {tally ? tally[i].toString() : "—"}
                    </div>
                    <div className="text-[11px] uppercase text-muted-foreground">
                      {c.label} · {tally ? pct(tally[i]) : 0}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Acción */}
            {state === "dup" ? (
              <div className="border border-chart-4 p-3 text-sm" style={{ color: "var(--chart-4)" }}>
                Ya emitiste tu voto en esta propuesta (tu nullifier ya fue usado). No se permite
                votar dos veces.
              </div>
            ) : state === "done" ? (
              <div className="border border-primary p-3 text-sm text-primary">
                ✓ Voto anónimo registrado. Gracias por participar.
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Emití tu voto:</p>
                <div className="flex flex-wrap gap-2">
                  {CHOICES.map((c) => (
                    <Button
                      key={c.v}
                      onClick={() => vote(c.v)}
                      disabled={state === "voting" || !anon}
                      variant={c.v === 0 ? "default" : "outline"}
                    >
                      {state === "voting" ? "Enviando…" : c.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {error && <p className="text-sm text-destructive">⚠ {error}</p>}

            <p className="text-[10px] leading-relaxed text-muted-foreground">
              <strong>Cómo funciona:</strong> el voto lo emite un relayer (no tu wallet), así el
              emisor de la transacción no te identifica. El nullifier ={" "}
              <code>keccak256(secreto · propuesta)</code> garantiza un voto por identidad.{" "}
              <strong>Limitación honesta (L-17):</strong> la prueba ZK de que tu nullifier deriva
              de una Cédula válida está mockeada — esta demo muestra el mecanismo de
              anonimato/no-doble-voto, no el gating a ciudadanos (necesita Semaphore). Ver
              ADR-010.
            </p>

            <Link href="/registro" className="inline-block text-sm underline hover:text-primary">
              ← Obtené tu Cédula Cívica
            </Link>
          </section>
        </div>
      </main>
    </>
  );
}
