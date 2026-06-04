import { describe, it, expect } from "vitest";
import { getAddresses, getSeedProposal, CitizenRegistryAbi, VoteAbi } from "./contracts";

describe("contracts.ts loaders", () => {
  it("ABIs son arrays no vacios", () => {
    expect(Array.isArray(CitizenRegistryAbi)).toBe(true);
    expect(Array.isArray(VoteAbi)).toBe(true);
    expect(CitizenRegistryAbi.length).toBeGreaterThan(0);
    expect(VoteAbi.length).toBeGreaterThan(0);
  });

  it("getAddresses(31337) devuelve direcciones validas para Anvil", () => {
    const a = getAddresses(31337);
    expect(a.CitizenRegistry).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(a.Vote).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it("getAddresses(57057) tira si no hay deployment todavia", () => {
    expect(() => getAddresses(57057)).toThrow(/No deployment/);
  });

  it("getSeedProposal(31337) devuelve la propuesta seed", () => {
    const p = getSeedProposal(31337);
    expect(p).not.toBeNull();
    expect(p?.id).toBe(1);
    expect(p?.title.length).toBeGreaterThan(0);
  });

  it("getSeedProposal(57057) devuelve null si no hay deployment", () => {
    expect(getSeedProposal(57057)).toBeNull();
  });
});
