import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("wagmi", () => ({
  useChainId: vi.fn(),
}));

import { NetworkBadge } from "./NetworkBadge";
import { useChainId } from "wagmi";

describe("NetworkBadge", () => {
  it("muestra 'Anvil local' cuando chainId es 31337", () => {
    (useChainId as ReturnType<typeof vi.fn>).mockReturnValue(31337);
    render(<NetworkBadge />);
    expect(screen.getByText(/Anvil local/i)).toBeInTheDocument();
  });

  it("muestra 'zkTanenbaum' cuando chainId es 57057", () => {
    (useChainId as ReturnType<typeof vi.fn>).mockReturnValue(57057);
    render(<NetworkBadge />);
    expect(screen.getByText(/zkTanenbaum/i)).toBeInTheDocument();
  });

  it("muestra warning cuando chainId no es soportado", () => {
    (useChainId as ReturnType<typeof vi.fn>).mockReturnValue(1);
    render(<NetworkBadge />);
    expect(screen.getByText(/Red incorrecta/i)).toBeInTheDocument();
  });
});
