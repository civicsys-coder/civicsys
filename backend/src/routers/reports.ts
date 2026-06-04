import { z } from "zod";
import { initTRPC } from "@trpc/server";
import type { Context } from "../context/trpc.context.js";
import type { HermesReport } from "../services/supabase.service.js";

const t = initTRPC.context<Context>().create();

const ListInput = z.object({
  proposalId: z.string().regex(/^\d+$/).optional(),
  chainId: z.union([z.literal(31337), z.literal(57057)]).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

const GetInput = z.object({ id: z.string().uuid() });

function serialize(r: HermesReport) {
  return {
    id: r.id,
    proposalId: r.proposalId.toString(),
    chainId: r.chainId,
    bodyMarkdown: r.bodyMarkdown,
    llmProvider: r.llmProvider,
    confidence: r.confidence,
    txHash: r.txHash,
    blockNumber: r.blockNumber?.toString() ?? null,
    createdAt: r.createdAt,
  };
}

export const reportsRouter = t.router({
  list: t.procedure.input(ListInput).query(async ({ ctx, input }) => {
    const rows = await ctx.supabase.listReports({
      proposalId: input.proposalId ? BigInt(input.proposalId) : undefined,
      chainId: input.chainId,
      limit: input.limit,
      offset: input.offset,
    });
    return rows.map(serialize);
  }),

  get: t.procedure.input(GetInput).query(async ({ ctx, input }) => {
    const r = await ctx.supabase.getReport(input.id);
    return r ? serialize(r) : null;
  }),
});
