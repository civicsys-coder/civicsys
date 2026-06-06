// dotenv DEBE cargarse antes que cualquier import que lea process.env en su
// top-level (trpc.context.js valida REGISTRY_ADDRESS/VOTE_ADDRESS al evaluarse).
import "dotenv/config";
import express from "express";
import cors from "cors";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "./routers/_app.js";
import { createContext } from "./context/trpc.context.js";
import { faucetRouter } from "./faucet.js";
import { accountabilityRouter } from "./accountability.js";

const PORT = Number(process.env.PORT ?? 4000);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";

const app = express();
// Detrás del proxy de Railway: req.ip = IP real del cliente (X-Forwarded-For),
// para que el límite por-IP del faucet no agrupe a todos bajo la IP del proxy.
app.set("trust proxy", true);

const allowedOrigins = CORS_ORIGIN.split(",").map((s) => s.trim());
app.use(
  cors({
    // Orígenes de CORS_ORIGIN (exactos) + cualquier deploy de Vercel (*.vercel.app).
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
        return cb(null, true);
      }
      cb(null, false);
    },
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

// Relayer (testnet): drip de gas para inscripción self-service + anclaje on-chain
// de los reportes de La Tóxica.
app.use("/faucet", faucetRouter);
app.use("/accountability", accountabilityRouter);

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
