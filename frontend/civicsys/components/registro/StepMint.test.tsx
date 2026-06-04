import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("./WizardProvider", () => ({
  useWizard: () => ({
    data: {
      privateKey: ("0x" + "11".repeat(32)) as `0x${string}`,
      address: ("0x" + "22".repeat(20)) as `0x${string}`,
      dniHash: ("0x" + "aa".repeat(32)) as `0x${string}`,
      faceCommitment: ("0x" + "bb".repeat(32)) as `0x${string}`,
      embedding: [0.1],
    },
    reset: vi.fn(),
  }),
}));
// viem clients que fallan: ejercita el render idle + branch de error sin cadena real.
vi.mock("viem", async (orig) => {
  const mod = await orig<typeof import("viem")>();
  return { ...mod, createWalletClient: () => { throw new Error("sin red"); }, createPublicClient: () => ({}) };
});

import { StepMint } from "./StepMint";

describe("StepMint", () => {
  it("muestra el botón de mint y maneja el error de cadena", async () => {
    render(<StepMint />);
    const btn = screen.getByRole("button", { name: /mintear/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    await waitFor(() => expect(screen.getByText(/⚠/)).toBeInTheDocument());
  });
});
