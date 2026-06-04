"use client";

import { useState } from "react";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { Button } from "@/components/ui/button";
import { IdentitySBTAbi, getAddresses } from "@/lib/contracts";
import { registerFace } from "@/lib/identity-api";
import { anvilLocal } from "@/lib/wagmi";
import { useWizard } from "./WizardProvider";
import { CedulaCard } from "./CedulaCard";

/**
 * Paso 5 — mint de la Cédula Cívica. Firma con la wallet recién creada (no-custodial),
 * llama IdentitySBT.mint con commitments (sin PII), y registra el embedding en Hermes.
 */
export function StepMint() {
  const { data, reset } = useWizard();
  const [state, setState] = useState<"idle" | "minting" | "done" | "error">("idle");
  const [tokenId, setTokenId] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mintedAt = new Date().toISOString().slice(0, 10);

  async function mint() {
    setState("minting");
    setError(null);
    try {
      const account = privateKeyToAccount(data.privateKey!);
      const addresses = getAddresses(31337);
      const sbt = addresses.IdentitySBT as `0x${string}`;
      // Metadata pública SIN PII ni commitments (hardening post-auditoría MNEMA):
      // dniHash/faceCommitment quedaban legibles on-chain en el tokenURI y, con el
      // salt público, el dniHash es reversible. La unicidad ya la garantizan
      // usedDni/usedFace internos del contrato; la metadata no los necesita.
      const uri =
        "data:application/json," +
        encodeURIComponent(
          JSON.stringify({
            name: "Cedula Civica",
            description: "Identidad ciudadana soulbound verificada (SSC ANTIPEREZA).",
            verificado: true,
            nivel: "mock",
            emitido: mintedAt,
          })
        );

      const wallet = createWalletClient({ account, chain: anvilLocal, transport: http() });
      const pub = createPublicClient({ chain: anvilLocal, transport: http() });

      const hash = await wallet.writeContract({
        address: sbt,
        abi: IdentitySBTAbi,
        functionName: "mint",
        args: [data.dniHash, data.faceCommitment, uri],
      });
      await pub.waitForTransactionReceipt({ hash });

      const tid = (await pub.readContract({
        address: sbt,
        abi: IdentitySBTAbi,
        functionName: "tokenOfOwner",
        args: [account.address],
      })) as bigint;
      setTokenId(tid);

      // Persistir el embedding en Hermes (idempotente por commitment).
      try {
        await registerFace(data.embedding ?? [], data.faceCommitment!);
      } catch {
        /* el mint ya quedó on-chain; el register es best-effort */
      }
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message.split("\n")[0] : "error desconocido");
      setState("error");
    }
  }

  if (state === "done" && data.address && tokenId !== null) {
    return (
      <div className="space-y-4">
        <p className="text-primary">¡Cédula minteada! Ya sos un ciudadano único verificado.</p>
        <CedulaCard tokenId={tokenId} holder={data.address} mintedAt={mintedAt} />
        <Button variant="outline" onClick={() => reset()}>
          Registrar otra identidad
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4" aria-label="mint">
      <p className="text-sm text-muted-foreground">
        Vas a firmar el mint de tu Cédula Cívica (NFT soulbound) con tu nueva wallet. La
        Cédula no contiene tu DNI ni tu foto — solo compromisos criptográficos.
      </p>
      {error && <p className="text-sm text-destructive">⚠ {error}</p>}
      <Button onClick={mint} disabled={state === "minting"}>
        {state === "minting" ? "Minteando…" : "Mintear mi Cédula Cívica"}
      </Button>
    </div>
  );
}
