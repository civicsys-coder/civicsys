import { describe, it, expect } from "vitest";
import { computeNullifier } from "./nullifier";

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
});
