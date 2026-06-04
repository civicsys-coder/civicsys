"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { dedupeFace } from "@/lib/identity-api";
import { useWizard } from "./WizardProvider";

/**
 * Paso 3 — verificación. Muestra el match DNI↔cara (mock) y consulta a Hermes
 * el dedupe facial. Si el rostro ya existe (otra wallet), BLOQUEA el avance.
 */
export function StepVerify() {
  const { data, next } = useWizard();
  const [state, setState] = useState<"idle" | "checking" | "ok" | "dup" | "error">("idle");

  async function verify() {
    setState("checking");
    try {
      const res = await dedupeFace(data.embedding ?? []);
      setState(res.duplicate ? "dup" : "ok");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="space-y-4" aria-label="verificacion">
      <div className="space-y-1 text-sm">
        <p>
          Coincidencia DNI ↔ rostro: <span className="text-primary">98%</span> (simulado)
        </p>
        <p className="text-muted-foreground">
          Verificación de unicidad facial contra el padrón (Hermes).
        </p>
      </div>

      {state === "idle" && <Button onClick={verify}>Verificar identidad</Button>}
      {state === "checking" && <p className="text-muted-foreground">verificando…</p>}

      {state === "dup" && (
        <div
          className="border border-destructive p-3 text-sm text-destructive"
          role="alert"
          data-testid="dedupe-blocked"
        >
          Ya existe un registro con este rostro. No se permite el doble registro.
        </div>
      )}
      {state === "error" && (
        <p className="text-sm text-destructive">No se pudo verificar con Hermes. Reintentá.</p>
      )}

      {state === "ok" && (
        <div className="space-y-3">
          <p className="text-primary" data-testid="verify-ok">
            Identidad verificada ✓
          </p>
          <Button onClick={() => next()}>Continuar</Button>
        </div>
      )}
    </div>
  );
}
