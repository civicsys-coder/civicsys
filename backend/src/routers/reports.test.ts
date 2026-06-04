import { describe, it, expect } from "vitest";
import { reportsRouter } from "./reports.js";

const mockReport = {
  id: "11111111-1111-4111-a111-111111111111",
  proposalId: 1n,
  chainId: 31337,
  bodyMarkdown: "# Reporte",
  llmProvider: "anthropic" as const,
  confidence: 8,
  txHash: "0xabc" as `0x${string}`,
  blockNumber: 100n,
  createdAt: new Date().toISOString(),
};

describe("reportsRouter", () => {
  it("list devuelve reportes paginados", async () => {
    const ctx = {
      supabase: { listReports: async (_args: unknown) => [mockReport] },
    } as never;
    const list = await reportsRouter.createCaller(ctx).list({ limit: 20, offset: 0 });
    expect(list.length).toBe(1);
    expect(list[0]!.id).toBe(mockReport.id);
    expect(list[0]!.proposalId).toBe("1");
    expect(list[0]!.blockNumber).toBe("100");
  });

  it("get devuelve un reporte específico", async () => {
    const ctx = {
      supabase: { getReport: async (_id: string) => mockReport },
    } as never;
    const r = await reportsRouter.createCaller(ctx).get({ id: mockReport.id });
    expect(r?.id).toBe(mockReport.id);
  });

  it("get devuelve null si no existe", async () => {
    const ctx = {
      supabase: { getReport: async (_id: string) => null },
    } as never;
    const r = await reportsRouter.createCaller(ctx).get({ id: "22222222-2222-4222-a222-222222222222" });
    expect(r).toBeNull();
  });
});
