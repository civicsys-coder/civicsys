import { describe, it, expect, vi } from "vitest";
import { backupRouter } from "./backup.js";
import * as emailModule from "../services/email.service.js";

describe("backupRouter", () => {
  it("reenvía el blob cifrado sin descifrarlo", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(emailModule, "getEmailProvider").mockReturnValue({ send });

    const blob = JSON.stringify({ version: 1, ciphertext: "deadbeef" });
    const res = await backupRouter
      .createCaller({} as never)
      .email({ to: "ana@example.com", encryptedKeystore: blob });

    expect(res.ok).toBe(true);
    expect(send).toHaveBeenCalledOnce();
    const msg = send.mock.calls[0]![0] as emailModule.EmailMessage;
    expect(msg.to).toBe("ana@example.com");
    expect(msg.body).toContain("deadbeef"); // pasa el blob tal cual (no descifra)
  });

  it("rechaza email inválido", async () => {
    await expect(
      backupRouter.createCaller({} as never).email({ to: "no-es-email", encryptedKeystore: "x" })
    ).rejects.toThrow();
  });
});
