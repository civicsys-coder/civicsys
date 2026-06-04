import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const set = vi.fn();
const next = vi.fn();
vi.mock("./WizardProvider", () => ({ useWizard: () => ({ set, next, data: {} }) }));
vi.stubEnv("NEXT_PUBLIC_PUBLIC_SALT", "0123456789abcdef0123");

import { StepDniCapture } from "./StepDniCapture";

describe("StepDniCapture", () => {
  it("hashea el DNI y avanza", () => {
    render(<StepDniCapture />);
    fireEvent.change(screen.getByLabelText(/DNI/i), { target: { value: "12345678" } });
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ dni: "12345678" }));
    expect(next).toHaveBeenCalled();
  });
});
