"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeDniHash } from "@/lib/dni-hash";
import { useWizard } from "./WizardProvider";

/**
 * Paso 1 — captura del DNI. En la demo simula un OCR: el campo viene editable
 * "detectado del documento". Reusa computeDniHash (mismo algoritmo que el contrato
 * y que Hermes). El número en claro nunca sale del navegador; solo el hash avanza.
 */
export function StepDniCapture() {
  const PUBLIC_SALT = process.env.NEXT_PUBLIC_PUBLIC_SALT ?? "";
  const saltOk = PUBLIC_SALT.length >= 16;
  const { set, next } = useWizard();
  const [dni, setDni] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isValid = /^\d{8}$/.test(dni);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!saltOk) {
      setError("Configuración faltante: NEXT_PUBLIC_PUBLIC_SALT no definido o muy corto.");
      return;
    }
    if (!isValid) {
      setError("DNI debe tener 8 dígitos numéricos");
      return;
    }
    set({ dni, dniHash: computeDniHash(dni, PUBLIC_SALT) });
    next();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-label="paso-documento">
      <div className="space-y-1">
        <Label htmlFor="dni">DNI (8 dígitos)</Label>
        <p className="text-xs text-muted-foreground">Detectado del documento (editable)</p>
        <Input
          id="dni"
          type="text"
          inputMode="numeric"
          maxLength={8}
          value={dni}
          onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
        />
      </div>

      {isValid && saltOk && (
        <p className="text-xs text-muted-foreground">
          Hash on-chain:{" "}
          <code className="font-mono">{computeDniHash(dni, PUBLIC_SALT).slice(0, 12)}…</code>
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={!isValid || !saltOk}>
        Continuar
      </Button>
      {!saltOk && (
        <p className="text-sm text-destructive" data-testid="salt-not-configured">
          NEXT_PUBLIC_PUBLIC_SALT no configurado. Registro deshabilitado por seguridad.
        </p>
      )}
    </form>
  );
}
