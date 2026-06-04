"use client";

import { WizardProvider, useWizard } from "./WizardProvider";
import { StepDniCapture } from "./StepDniCapture";
import { StepFaceCapture } from "./StepFaceCapture";
import { StepVerify } from "./StepVerify";
import { StepWallet } from "./StepWallet";
import { StepMint } from "./StepMint";

const STEPS = [
  { n: 0, label: "DNI" },
  { n: 1, label: "Rostro" },
  { n: 2, label: "Verificar" },
  { n: 3, label: "Wallet" },
  { n: 4, label: "Cédula" },
];

function Stepper() {
  const { step } = useWizard();
  return (
    <ol className="flex items-center justify-between text-[11px] uppercase tracking-wider">
      {STEPS.map((s) => (
        <li
          key={s.n}
          className="flex items-center gap-1"
          style={{ color: s.n <= step ? "var(--primary)" : "var(--muted-foreground)" }}
        >
          <span
            className="flex h-5 w-5 items-center justify-center border text-[10px]"
            style={{ borderColor: s.n <= step ? "var(--primary)" : "var(--border)" }}
          >
            {s.n + 1}
          </span>
          <span className="hidden sm:inline">{s.label}</span>
        </li>
      ))}
    </ol>
  );
}

function CurrentStep() {
  const { step } = useWizard();
  switch (step) {
    case 0:
      return <StepDniCapture />;
    case 1:
      return <StepFaceCapture />;
    case 2:
      return <StepVerify />;
    case 3:
      return <StepWallet />;
    case 4:
      return <StepMint />;
    default:
      return null;
  }
}

export function WizardSteps() {
  return (
    <WizardProvider>
      <div className="space-y-6">
        <Stepper />
        <CurrentStep />
      </div>
    </WizardProvider>
  );
}
