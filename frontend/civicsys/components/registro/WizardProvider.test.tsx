import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { WizardProvider, useWizard } from "./WizardProvider";

function Probe() {
  const w = useWizard();
  return (
    <div>
      <span data-testid="step">{w.step}</span>
      <span data-testid="dni">{w.data.dniHash ?? "none"}</span>
      <button
        onClick={() => {
          w.set({ dniHash: "0xabc" });
          w.next();
        }}
      >
        go
      </button>
      <button onClick={() => w.back()}>back</button>
      <button onClick={() => w.reset()}>reset</button>
    </div>
  );
}

describe("WizardProvider", () => {
  it("arranca en 0 y avanza guardando data", () => {
    render(
      <WizardProvider>
        <Probe />
      </WizardProvider>
    );
    expect(screen.getByTestId("step").textContent).toBe("0");
    act(() => {
      screen.getByText("go").click();
    });
    expect(screen.getByTestId("step").textContent).toBe("1");
    expect(screen.getByTestId("dni").textContent).toBe("0xabc");
  });

  it("back retrocede y reset limpia step + data", () => {
    render(
      <WizardProvider>
        <Probe />
      </WizardProvider>
    );
    act(() => screen.getByText("go").click());
    expect(screen.getByTestId("step").textContent).toBe("1");
    act(() => screen.getByText("back").click());
    expect(screen.getByTestId("step").textContent).toBe("0");
    act(() => screen.getByText("go").click());
    act(() => screen.getByText("reset").click());
    expect(screen.getByTestId("step").textContent).toBe("0");
    expect(screen.getByTestId("dni").textContent).toBe("none");
  });

  it("useWizard fuera del provider lanza", () => {
    expect(() => render(<Probe />)).toThrow(/useWizard/);
  });
});
