import { describe, it, expect } from "vitest";
import { citizensRouter } from "./citizens.js";

const ADDR: `0x${string}` = "0x1234567890123456789012345678901234567890";

describe("citizensRouter", () => {
  it("isRegistered devuelve true si el contrato dice true", async () => {
    const ctx = {
      blockchain: { isRegistered: async (_a: string) => true },
    } as never;
    const ok = await citizensRouter.createCaller(ctx).isRegistered({ address: ADDR });
    expect(ok).toBe(true);
  });

  it("status devuelve registered + hash si está registrado", async () => {
    const ctx = {
      blockchain: {
        getCitizenStatus: async (a: string) => ({
          address: a,
          registered: true,
          hash: "0xabc" as `0x${string}`,
        }),
      },
    } as never;
    const s = await citizensRouter.createCaller(ctx).status({ address: ADDR });
    expect(s.registered).toBe(true);
    expect(s.hash).toBe("0xabc");
  });

  it("rechaza addresses con formato invalido (zod)", async () => {
    const ctx = { blockchain: {} } as never;
    await expect(
      citizensRouter.createCaller(ctx).isRegistered({ address: "no-es-address" })
    ).rejects.toThrow();
  });
});
