import { describe, it, expect } from "vitest";
import { createWallet } from "./wallet";

describe("createWallet", () => {
  it("genera una private key y su address", () => {
    const w = createWallet();
    expect(w.privateKey).toMatch(/^0x[0-9a-f]{64}$/);
    expect(w.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it("genera wallets distintas en llamadas sucesivas", () => {
    expect(createWallet().privateKey).not.toBe(createWallet().privateKey);
  });
});
