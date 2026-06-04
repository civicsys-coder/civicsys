"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export interface WizardData {
  dni?: string;
  dniHash?: `0x${string}`;
  embedding?: number[];
  faceCommitment?: `0x${string}`;
  address?: `0x${string}`;
  privateKey?: `0x${string}`;
  tokenId?: bigint;
}

interface WizardCtx {
  step: number;
  data: WizardData;
  set: (patch: Partial<WizardData>) => void;
  next: () => void;
  back: () => void;
  reset: () => void;
}

const Ctx = createContext<WizardCtx | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>({});
  const set = (patch: Partial<WizardData>) => setData((d) => ({ ...d, ...patch }));
  const next = () => setStep((s) => Math.min(s + 1, 4));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const reset = () => {
    setStep(0);
    setData({});
  };
  return (
    <Ctx.Provider value={{ step, data, set, next, back, reset }}>{children}</Ctx.Provider>
  );
}

export function useWizard(): WizardCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useWizard fuera de WizardProvider");
  return c;
}
