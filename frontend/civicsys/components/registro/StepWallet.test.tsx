import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const set = vi.fn();
const next = vi.fn();
vi.mock("./WizardProvider", () => ({ useWizard: () => ({ set, next, data: {} }) }));
vi.mock("@/lib/wallet", () => ({
  createWallet: () => ({
    privateKey: ("0x" + "11".repeat(32)) as `0x${string}`,
    address: ("0x" + "22".repeat(20)) as `0x${string}`,
  }),
}));
vi.mock("@/lib/keystore", () => ({ encryptKey: vi.fn().mockResolvedValue("{}") }));

import { StepWallet } from "./StepWallet";

describe("StepWallet", () => {
  it("muestra la address pública y exige guardar el respaldo para continuar", () => {
    render(<StepWallet />);
    expect(screen.getByTestId("wallet-address").textContent).toContain("0x2222");

    // Continuar deshabilitado hasta marcar el checkbox
    const cont = screen.getByRole("button", { name: /continuar/i });
    expect(cont).toBeDisabled();

    fireEvent.click(screen.getByTestId("saved-checkbox"));
    expect(cont).not.toBeDisabled();
    fireEvent.click(cont);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ address: "0x" + "22".repeat(20) })
    );
    expect(next).toHaveBeenCalled();
  });

  it("descarga el respaldo cifrado tras poner contraseña", async () => {
    Object.assign(URL, {
      createObjectURL: vi.fn(() => "blob:x"),
      revokeObjectURL: vi.fn(),
    });
    render(<StepWallet />);
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: "clave-larga-123" },
    });
    const dl = screen.getByRole("button", { name: /descargar respaldo/i });
    expect(dl).not.toBeDisabled();
    fireEvent.click(dl);
    await waitFor(() => expect(screen.getByText(/respaldo descargado/i)).toBeInTheDocument());
  });

  it("envía el respaldo por email vía fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<StepWallet />);
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: "clave-larga-123" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "ana@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^enviar$/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  });
});
