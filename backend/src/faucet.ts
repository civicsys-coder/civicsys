// Relayer-drip de gas (testnet) — paga una pizca de TSYS a una wallet ciudadana
// recién creada para que pueda firmar su propio mint de Cédula (self-service).
// Guardas anti-abuso: monto fijo ínfimo + no re-fondea wallets que ya tienen gas
// + presupuesto global diario + límite por IP (ver checkFaucetLimit).
// Ver nota de seguridad en relayer.ts.

import { Router } from "express";
import { parseEther, isAddress, getAddress } from "viem";
import { publicClient, relayerWallet, relayerConfigured } from "./relayer.js";

const DRIP_AMOUNT = process.env.DRIP_AMOUNT_TSYS ?? "0.02"; // por inscripción
const DRIP_THRESHOLD = parseEther("0.01"); // si ya tiene >= esto, no dripeamos

// ── Anti-drain ────────────────────────────────────────────────────────────
// El faucet firma desde la EOA del relayer (misma address del deployer). Sin
// límite, cualquiera con un `for` la vacía y mata los anclajes de La Tóxica.
// Defensa PRINCIPAL: presupuesto global diario — un atacante distribuido solo
// puede gastar el cupo del día, nunca toda la wallet. Defensa SECUNDARIA:
// límite por IP — mitiga abuso trivial de una sola fuente (spoofeable detrás de
// proxy, por eso no es la principal).
export interface FaucetLimitCfg {
  maxPerIp: number;
  ipWindowMs: number;
  dailyBudget: bigint; // wei
  dripWei: bigint;
}

export const DEFAULT_FAUCET_CFG: FaucetLimitCfg = {
  maxPerIp: Number(process.env.FAUCET_MAX_PER_IP ?? "3"),
  ipWindowMs: Number(process.env.FAUCET_IP_WINDOW_MS ?? String(60 * 60 * 1000)), // 1h
  dailyBudget: parseEther(process.env.FAUCET_DAILY_BUDGET_TSYS ?? "2"), // ~100 drips/día
  dripWei: parseEther(DRIP_AMOUNT),
};

export interface FaucetLimitState {
  ipHits: Map<string, number[]>;
  day: string;
  spent: bigint; // wei gastado hoy
}

export function newFaucetState(): FaucetLimitState {
  return { ipHits: new Map(), day: "", spent: 0n };
}

const _state = newFaucetState();

function rollDay(state: FaucetLimitState, now: number): void {
  const today = new Date(now).toISOString().slice(0, 10);
  if (state.day !== today) {
    state.day = today;
    state.spent = 0n;
    state.ipHits.clear();
  }
}

/** Decide si un drip está permitido. Pura sobre (state, now, cfg) → testeable. */
export function checkFaucetLimit(
  ip: string,
  now: number,
  state: FaucetLimitState = _state,
  cfg: FaucetLimitCfg = DEFAULT_FAUCET_CFG
): { allowed: boolean; reason?: string } {
  rollDay(state, now);
  if (state.spent + cfg.dripWei > cfg.dailyBudget) {
    return { allowed: false, reason: "cupo diario del faucet agotado, probá mañana" };
  }
  const hits = (state.ipHits.get(ip) ?? []).filter((t) => now - t < cfg.ipWindowMs);
  if (hits.length >= cfg.maxPerIp) {
    return { allowed: false, reason: "límite de drips por IP alcanzado, probá más tarde" };
  }
  return { allowed: true };
}

/** Reserva el cupo de un drip (gasto global + conteo por IP). Llamar al decidir dripear. */
export function recordFaucetDrip(
  ip: string,
  now: number,
  state: FaucetLimitState = _state,
  cfg: FaucetLimitCfg = DEFAULT_FAUCET_CFG
): void {
  rollDay(state, now);
  const hits = (state.ipHits.get(ip) ?? []).filter((t) => now - t < cfg.ipWindowMs);
  hits.push(now);
  state.ipHits.set(ip, hits);
  state.spent += cfg.dripWei;
}

export const faucetRouter = Router();

faucetRouter.post("/drip", async (req, res) => {
  try {
    if (!relayerConfigured) {
      return res.status(503).json({ error: "faucet no configurado (sin RELAYER_PRIVATE_KEY)" });
    }
    const { address } = (req.body ?? {}) as { address?: string };
    if (!address || !isAddress(address)) {
      return res.status(400).json({ error: "address inválida" });
    }
    const to = getAddress(address);

    // Anti-abuso #1: no re-fondear wallets que ya tienen gas (no consume cupo).
    const bal = await publicClient.getBalance({ address: to });
    if (bal >= DRIP_THRESHOLD) {
      return res.json({ ok: true, skipped: true, reason: "ya tiene gas suficiente" });
    }

    // Anti-abuso #2: presupuesto diario + límite por IP. Reservamos el cupo
    // ANTES del send (fail-closed: no se filtra más de lo presupuestado).
    const ip = req.ip ?? "unknown";
    const now = Date.now();
    const limit = checkFaucetLimit(ip, now);
    if (!limit.allowed) {
      return res.status(429).json({ error: limit.reason });
    }
    recordFaucetDrip(ip, now);

    const wallet = relayerWallet();
    const hash = await wallet.sendTransaction({
      to,
      value: parseEther(DRIP_AMOUNT),
    } as never);
    // Esperamos el receipt para que, al responder, el gas ya sea gastable.
    await publicClient.waitForTransactionReceipt({ hash, timeout: 90_000 });

    console.log(`[faucet] drip ${DRIP_AMOUNT} TSYS → ${to} (tx ${hash})`);
    return res.json({ ok: true, txHash: hash, amount: DRIP_AMOUNT });
  } catch (e) {
    const msg = e instanceof Error ? e.message.split("\n")[0] : "error";
    console.error(`[faucet] drip error: ${msg}`);
    return res.status(500).json({ error: "drip falló" });
  }
});
