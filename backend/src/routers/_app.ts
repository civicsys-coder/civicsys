import { initTRPC } from "@trpc/server";
import type { Context } from "../context/trpc.context.js";
import { proposalsRouter } from "./proposals.js";
import { citizensRouter } from "./citizens.js";
import { reportsRouter } from "./reports.js";
import { backupRouter } from "./backup.js";

const t = initTRPC.context<Context>().create();

export const appRouter = t.router({
  proposals: proposalsRouter,
  citizens: citizensRouter,
  reports: reportsRouter,
  backup: backupRouter,
});

export type AppRouter = typeof appRouter;
