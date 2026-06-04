import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const next = vi.fn();
vi.mock("./WizardProvider", () => ({
  useWizard: () => ({ next, data: { embedding: new Array(384).fill(0.1) } }),
}));
const dedupeFace = vi.fn();
vi.mock("@/lib/identity-api", () => ({ dedupeFace: (e: number[]) => dedupeFace(e) }));

import { StepVerify } from "./StepVerify";

beforeEach(() => {
  next.mockClear();
  dedupeFace.mockReset();
});

describe("StepVerify", () => {
  it("verifica OK cuando no hay duplicado", async () => {
    dedupeFace.mockResolvedValue({ duplicate: false, similarity: 0.1, topMatch: null });
    render(<StepVerify />);
    fireEvent.click(screen.getByRole("button", { name: /verificar/i }));
    await waitFor(() => expect(screen.getByTestId("verify-ok")).toBeInTheDocument());
  });

  it("bloquea cuando hay duplicado y no avanza", async () => {
    dedupeFace.mockResolvedValue({ duplicate: true, similarity: 0.99, topMatch: "0xabc" });
    render(<StepVerify />);
    fireEvent.click(screen.getByRole("button", { name: /verificar/i }));
    await waitFor(() => expect(screen.getByTestId("dedupe-blocked")).toBeInTheDocument());
    expect(next).not.toHaveBeenCalled();
  });
});
