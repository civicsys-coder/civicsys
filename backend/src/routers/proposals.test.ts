import { describe, it, expect } from "vitest";
import { proposalsRouter } from "./proposals.js";

const baseProposal = {
  id: 1n,
  title: "Demo",
  ipfsCid: "bafy",
  openAt: 0n,
  closeAt: 100n,
  closed: false,
  chainId: 31337 as const,
};

describe("proposalsRouter", () => {
  it("list devuelve array con la propuesta seed", async () => {
    const ctx = {
      blockchain: { getProposal: async (_id: bigint) => baseProposal },
    } as never;
    const list = await proposalsRouter.createCaller(ctx).list();
    expect(Array.isArray(list)).toBe(true);
    expect(list[0]!.id).toBe("1");
    expect(list[0]!.title).toBe("Demo");
  });

  it("get devuelve la propuesta del id solicitado", async () => {
    const ctx = {
      blockchain: { getProposal: async (id: bigint) => ({ ...baseProposal, id }) },
    } as never;
    const p = await proposalsRouter.createCaller(ctx).get({ id: "5" });
    expect(p.id).toBe("5");
  });

  it("tally devuelve los conteos como strings", async () => {
    const ctx = {
      blockchain: { getTally: async (_id: bigint) => ({ yes: 3n, no: 1n, abstain: 1n }) },
    } as never;
    const t = await proposalsRouter.createCaller(ctx).tally({ id: "1" });
    expect(t.yes).toBe("3");
    expect(t.no).toBe("1");
    expect(t.abstain).toBe("1");
  });
});
