"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { embedFace, faceCommitment } from "@/lib/face-embedding";
import { useWizard } from "./WizardProvider";

/**
 * Paso 2 — captura facial (mock). En la demo usa bytes fijos derivados de un
 * "selfie" simulado + un prompt de liveness. Genera el embedding (384 dims) y el
 * faceCommitment on-chain. ADR-008: no se guarda la imagen, solo el derivado.
 */
export function StepFaceCapture() {
  const PUBLIC_SALT = process.env.NEXT_PUBLIC_PUBLIC_SALT ?? "ssc-face";
  const { set, next } = useWizard();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function capture() {
    setBusy(true);
    // Demo: "selfie" = bytes pseudo-únicos por sesión (timestamp del navegador).
    const bytes = new TextEncoder().encode(`selfie-${typeof window !== "undefined" ? window.location.href : "demo"}-${Math.floor(performance.now())}`);
    const emb = await embedFace(bytes);
    const fc = faceCommitment(emb, PUBLIC_SALT);
    set({ embedding: emb, faceCommitment: fc });
    setBusy(false);
    setDone(true);
  }

  return (
    <div className="space-y-4" aria-label="captura-rostro">
      <p className="text-sm text-muted-foreground">
        Mirá a la cámara y <strong>parpadeá</strong> cuando se te indique (verificación de
        vida simulada).
      </p>
      <div className="flex h-40 items-center justify-center border border-border text-muted-foreground">
        {done ? "✓ rostro capturado" : busy ? "procesando…" : "vista previa de cámara (demo)"}
      </div>

      {!done ? (
        <Button onClick={capture} disabled={busy}>
          {busy ? "Capturando…" : "Tomar selfie"}
        </Button>
      ) : (
        <Button onClick={() => next()}>Continuar</Button>
      )}
    </div>
  );
}
