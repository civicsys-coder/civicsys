// dotenv DEBE cargarse antes que cualquier import que lea process.env en su
// top-level (trpc.context.js valida REGISTRY_ADDRESS/VOTE_ADDRESS al evaluarse).
import "dotenv/config";
import express from "express";
import cors from "cors";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "./routers/_app.js";
import { createContext } from "./context/trpc.context.js";

const PORT = Number(process.env.PORT ?? 4000);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";

const app = express();

app.use(
  cors({
    origin: CORS_ORIGIN.split(",").map((s) => s.trim()),
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", chain: process.env.CHAIN_ID });
});

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext: () => createContext(),
  })
);

app.listen(PORT, () => {
  console.log(`🚀 backend/civicsys @ http://localhost:${PORT}/trpc · /health · CORS=${CORS_ORIGIN}`);
});
