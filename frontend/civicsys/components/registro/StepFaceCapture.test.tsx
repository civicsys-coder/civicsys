import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const set = vi.fn();
const next = vi.fn();
vi.mock("./WizardProvider", () => ({ useWizard: () => ({ set, next, data: {} }) }));
vi.mock("@/lib/face-embedding", () => ({
  embedFace: vi.fn().mockResolvedValue(new Array(384).fill(0.1)),
  faceCommitment: vi.fn().mockReturnValue("0x" + "ab".repeat(32)),
}));

import { StepFaceCapture } from "./StepFaceCapture";

describe("StepFaceCapture", () => {
  it("captura el rostro y guarda embedding + commitment", async () => {
    render(<StepFaceCapture />);
    fireEvent.click(screen.getByRole("button", { name: /tomar selfie/i }));
    await waitFor(() =>
      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ faceCommitment: "0x" + "ab".repeat(32) })
      )
    );
  });
});
