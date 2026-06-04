import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CedulaCard } from "./CedulaCard";

describe("CedulaCard", () => {
  it("renderiza tokenId, address abreviada y estado soulbound", () => {
    render(
      <CedulaCard
        tokenId={7n}
        holder={("0x" + "ab".repeat(20)) as `0x${string}`}
        mintedAt="2026-05-30"
      />
    );
    expect(screen.getByText("#7")).toBeInTheDocument();
    expect(screen.getByText(/0xabab…abab/)).toBeInTheDocument();
    expect(screen.getByText(/Verificada · Soulbound/)).toBeInTheDocument();
  });
});
