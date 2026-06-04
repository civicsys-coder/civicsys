"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWallet } from "@/lib/wallet";
import { encryptKey } from "@/lib/keystore";
import { useWizard } from "./WizardProvider";

const HERMES_BACKUP_URL = process.env.NEXT_PUBLIC_TRPC_URL ?? "http://localhost:4000/trpc";

/**
 * Paso 4 — wallet no-custodial + backup cifrado (ADR-007). La clave se genera y
 * cifra en el navegador; el server NUNCA la ve. El backup (blob cifrado) se puede
 * descargar y/o enviar por email (el backend solo lo reenvía, no lo descifra).
 */
export function StepWallet() {
  const { set, next } = useWizard();
  const [wallet] = useState(() => createWallet());
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Mínimo 12 (hardening post-auditoría MNEMA): salt e IV viajan en el blob, así
  // que la contraseña es el único secreto del respaldo cifrado.
  const passOk = password.length >= 12;

  async function download() {
    const blob = await encryptKey(wallet.privateKey, password);
    const url = URL.createObjectURL(new Blob([blob], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "cedula-civica-keystore.json";
    a.click();
    URL.revokeObjectURL(url);
    setSaved(true);
    setStatus("Respaldo descargado.");
  }

  async function sendEmail() {
    if (!email) return;
    const blob = await encryptKey(wallet.privateKey, password);
    try {
      await fetch(`${HERMES_BACKUP_URL}/backup.email`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: email, encryptedKeystore: blob }),
      });
      setSaved(true);
      setStatus("Respaldo enviado a tu email.");
    } catch {
      setStatus("No se pudo enviar el email (podés usar la descarga).");
    }
  }

  function cont() {
    set({ address: wallet.address, privateKey: wallet.privateKey });
    next();
  }

  return (
    <div className="space-y-4" aria-label="wallet">
      <div className="space-y-1">
        <p className="text-sm">Tu cuenta SYS (dirección pública):</p>
        <code className="block break-all font-mono text-xs text-primary" data-testid="wallet-address">
          {wallet.address}
        </code>
        <p className="text-xs text-destructive">
          Tu clave privada NUNCA se envía al servidor. Respaldala con una contraseña.
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="pass">Contraseña del respaldo (mín. 12)</Label>
        <Input
          id="pass"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={download} disabled={!passOk} type="button">
          Descargar respaldo cifrado
        </Button>
      </div>

      <div className="space-y-1">
        <Label htmlFor="email">Email (opcional, para enviarte el respaldo)</Label>
        <div className="flex gap-2">
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button onClick={sendEmail} disabled={!passOk || !email} variant="outline" type="button">
            Enviar
          </Button>
        </div>
      </div>

      {status && <p className="text-xs text-muted-foreground">{status}</p>}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
          data-testid="saved-checkbox"
        />
        Guardé mi respaldo de forma segura
      </label>

      <Button onClick={cont} disabled={!saved}>
        Continuar
      </Button>
    </div>
  );
}
