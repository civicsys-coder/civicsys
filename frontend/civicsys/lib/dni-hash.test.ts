import { describe, it, expect } from "vitest";
import { computeDniHash } from "./dni-hash";

describe("computeDniHash", () => {
  it("produce hash de 66 chars (0x + 64 hex)", () => {
    // Salt arbitrario para test — NO es el secreto productivo (vive en .env).
    const h = computeDniHash("12345678", "test-salt-deterministic-not-prod");
    expect(h).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it("es determinista", () => {
    const h1 = computeDniHash("12345678", "salt");
    const h2 = computeDniHash("12345678", "salt");
    expect(h1).toBe(h2);
  });

  it("difiere por dni", () => {
    const h1 = computeDniHash("12345678", "salt");
    const h2 = computeDniHash("87654321", "salt");
    expect(h1).not.toBe(h2);
  });

  it("difiere por salt", () => {
    const h1 = computeDniHash("12345678", "salt_a");
    const h2 = computeDniHash("12345678", "salt_b");
    expect(h1).not.toBe(h2);
  });
});
