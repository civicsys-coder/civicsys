import { z } from "zod";
import { initTRPC } from "@trpc/server";
import type { Context } from "../context/trpc.context.js";

const t = initTRPC.context<Context>().create();

const AddressInput = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "address inválida"),
});

export const citizensRouter = t.router({
  isRegistered: t.procedure.input(AddressInput).query(async ({ ctx, input }) => {
    return ctx.blockchain.isRegistered(input.address as `0x${string}`);
  }),

  status: t.procedure.input(AddressInput).query(async ({ ctx, input }) => {
    return ctx.blockchain.getCitizenStatus(input.address as `0x${string}`);
  }),
});
