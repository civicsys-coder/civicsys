import { describe, it, expect, beforeEach } from "vitest";
import { computeNullifier, getOrCreateIdentitySecret } from "./nullifier";

describe("computeNullifier", () => {
  it("es determinista para (secreto, propuesta)", () => {
    const a = computeNullifier("secreto-1", 1);
    const b = computeNullifier("secreto-1", 1);
    expect(a).toBe(b);
    expect(a).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("difiere entre propuestas (no correlacionable)", () => {
    expect(computeNullifier("secreto-1", 1)).not.toBe(computeNullifier("secreto-1", 2));
  });

  it("difiere entre identidades", () => {
    expect(computeNullifier("secreto-1", 1)).not.toBe(computeNullifier("secreto-2", 1));
  });

  it("trata number y bigint equivalentes", () => {
    expect(computeNullifier("secreto-1", 5)).toBe(computeNullifier("secreto-1", 5n));
  });
});

describe("getOrCreateIdentitySecret", () => {
  beforeEach(() => window.localStorage.clear());

  it("crea y persiste un secreto la primera vez", () => {
    const s = getOrCreateIdentitySecret();
    expect(s).toMatch(/^0x[0-9a-f]{64}$/);
    expect(window.localStorage.getItem("ssc-identity-secret")).toBe(s);
  });

  it("devuelve el mismo secreto en llamadas siguientes", () => {
    const first = getOrCreateIdentitySecret();
    const second = getOrCreateIdentitySecret();
    expect(second).toBe(first);
  });
});
