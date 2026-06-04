import { z } from "zod";
import { initTRPC } from "@trpc/server";
import type { Context } from "../context/trpc.context.js";

const t = initTRPC.context<Context>().create();

const IdInput = z.object({ id: z.string().regex(/^\d+$/) });

export const proposalsRouter = t.router({
  list: t.procedure.query(async ({ ctx }) => {
    const p = await ctx.blockchain.getProposal(1n);
    return [
      {
        id: p.id.toString(),
        title: p.title,
        ipfsCid: p.ipfsCid,
        openAt: p.openAt.toString(),
        closeAt: p.closeAt.toString(),
        closed: p.closed,
        chainId: p.chainId,
      },
    ];
  }),

  get: t.procedure.input(IdInput).query(async ({ ctx, input }) => {
    const p = await ctx.blockchain.getProposal(BigInt(input.id));
    return {
      id: p.id.toString(),
      title: p.title,
      ipfsCid: p.ipfsCid,
      openAt: p.openAt.toString(),
      closeAt: p.closeAt.toString(),
      closed: p.closed,
      chainId: p.chainId,
    };
  }),

  tally: t.procedure.input(IdInput).query(async ({ ctx, input }) => {
    const tt = await ctx.blockchain.getTally(BigInt(input.id));
    return {
      yes: tt.yes.toString(),
      no: tt.no.toString(),
      abstain: tt.abstain.toString(),
    };
  }),
});
