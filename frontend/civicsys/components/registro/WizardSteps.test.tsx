import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Stub de los pasos para aislar el switch + stepper.
vi.mock("./StepDniCapture", () => ({ StepDniCapture: () => <div>paso-dni</div> }));
vi.mock("./StepFaceCapture", () => ({ StepFaceCapture: () => <div>paso-rostro</div> }));
vi.mock("./StepVerify", () => ({ StepVerify: () => <div>paso-verify</div> }));
vi.mock("./StepWallet", () => ({ StepWallet: () => <div>paso-wallet</div> }));
vi.mock("./StepMint", () => ({ StepMint: () => <div>paso-mint</div> }));

import { WizardSteps } from "./WizardSteps";

describe("WizardSteps", () => {
  it("arranca en el paso DNI y muestra el stepper", () => {
    render(<WizardSteps />);
    expect(screen.getByText("paso-dni")).toBeInTheDocument();
    // stepper con los 5 números
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});
