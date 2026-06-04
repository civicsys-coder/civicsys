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

// ── Observabilidad: log de cada request (método, ruta, status, latencia).
// No se logean bodies ni headers → no se filtran secretos.
app.use((req, res, next) => {
  const t0 = Date.now();
  res.on("finish", () => {
    console.log(`[backend] ${req.method} ${req.path} → ${res.statusCode} (${Date.now() - t0}ms)`);
  });
  next();
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", chain: process.env.CHAIN_ID });
});

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext: () => createContext(),
    onError: ({ path, error }) => {
      console.error(`[backend] tRPC error en ${path ?? "?"}: ${error.code} — ${error.message}`);
    },
  })
);

app.listen(PORT, () => {
  console.log(`🚀 backend/civicsys @ http://localhost:${PORT}/trpc · /health · CORS=${CORS_ORIGIN}`);
});
