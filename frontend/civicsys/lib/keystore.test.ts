import { describe, it, expect } from "vitest";
import { encryptKey, decryptKey } from "./keystore";

const PK = ("0x" + "11".repeat(32)) as `0x${string}`;

describe("keystore", () => {
  it("cifra y descifra con la contraseña correcta", async () => {
    const blob = await encryptKey(PK, "clave-segura-123");
    expect(blob).toContain("ciphertext");
    const back = await decryptKey(blob, "clave-segura-123");
    expect(back).toBe(PK);
  });

  it("falla con contraseña incorrecta", async () => {
    const blob = await encryptKey(PK, "correcta");
    await expect(decryptKey(blob, "incorrecta")).rejects.toThrow();
  });
});
