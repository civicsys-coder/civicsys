import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("wagmi", () => ({
  useAccount: vi.fn(),
  useConnect: vi.fn(),
  useDisconnect: vi.fn(),
}));

import { ConnectWalletButton } from "./ConnectWalletButton";
import { useAccount, useConnect, useDisconnect } from "wagmi";

describe("ConnectWalletButton", () => {
  it("muestra 'Conectar wallet' cuando no hay account", () => {
    (useAccount as ReturnType<typeof vi.fn>).mockReturnValue({ isConnected: false });
    (useConnect as ReturnType<typeof vi.fn>).mockReturnValue({
      connect: vi.fn(),
      connectors: [{ id: "injected", name: "MetaMask" }],
    });
    (useDisconnect as ReturnType<typeof vi.fn>).mockReturnValue({ disconnect: vi.fn() });
    const { container } = render(<ConnectWalletButton />);
    expect(container.textContent).toContain("Conectar wallet");
  });

  it("muestra address truncada y boton Desconectar cuando hay account", () => {
    (useAccount as ReturnType<typeof vi.fn>).mockReturnValue({
      isConnected: true,
      address: "0x1234567890abcdef1234567890abcdef12345678",
    });
    (useConnect as ReturnType<typeof vi.fn>).mockReturnValue({ connect: vi.fn(), connectors: [] });
    (useDisconnect as ReturnType<typeof vi.fn>).mockReturnValue({ disconnect: vi.fn() });
    const { container } = render(<ConnectWalletButton />);
    expect(container.textContent).toContain("0x1234");
    expect(container.textContent).toContain("...5678");
    expect(container.textContent).toContain("Desconectar");
  });

  it("invoca disconnect al hacer click en el boton", () => {
    const dc = vi.fn();
    (useAccount as ReturnType<typeof vi.fn>).mockReturnValue({
      isConnected: true,
      address: "0x1234567890abcdef1234567890abcdef12345678",
    });
    (useConnect as ReturnType<typeof vi.fn>).mockReturnValue({ connect: vi.fn(), connectors: [] });
    (useDisconnect as ReturnType<typeof vi.fn>).mockReturnValue({ disconnect: dc });
    render(<ConnectWalletButton />);
    const btn = screen.getByText("Desconectar");
    btn.click();
    expect(dc).toHaveBeenCalled();
  });

  it("invoca connect con injected connector al hacer click", () => {
    const c = vi.fn();
    const injected = { id: "injected", name: "MetaMask" };
    (useAccount as ReturnType<typeof vi.fn>).mockReturnValue({ isConnected: false });
    (useConnect as ReturnType<typeof vi.fn>).mockReturnValue({ connect: c, connectors: [injected] });
    (useDisconnect as ReturnType<typeof vi.fn>).mockReturnValue({ disconnect: vi.fn() });
    render(<ConnectWalletButton />);
    const btn = screen.getByText("Conectar wallet");
    btn.click();
    expect(c).toHaveBeenCalledWith(expect.objectContaining({ connector: injected }));
  });
});
