import { describe, it, expect } from "vitest";
import { parseEther } from "viem";
import {
  checkFaucetLimit,
  recordFaucetDrip,
  newFaucetState,
  type FaucetLimitCfg,
} from "./faucet.js";

// cfg chica y determinista: 3 drips/IP por ventana de 1s, cupo diario 0.05 TSYS
// con drip de 0.02 → caben 2 drips globales antes de agotar el cupo.
const CFG: FaucetLimitCfg = {
  maxPerIp: 3,
  ipWindowMs: 1000,
  dailyBudget: parseEther("0.05"),
  dripWei: parseEther("0.02"),
};

const T0 = 1_780_000_000_000; // timestamp fijo (no Date.now())

describe("faucet anti-drain", () => {
  it("permite un drip cuando no se superó ningún límite", () => {
    const s = newFaucetState();
    expect(checkFaucetLimit("1.1.1.1", T0, s, CFG).allowed).toBe(true);
  });

  it("bloquea por IP tras maxPerIp drips en la ventana", () => {
    const s = newFaucetState();
    // cupo diario alto para aislar el límite por IP
    const cfg = { ...CFG, dailyBudget: parseEther("100") };
    for (let i = 0; i < cfg.maxPerIp; i++) {
      expect(checkFaucetLimit("9.9.9.9", T0, s, cfg).allowed).toBe(true);
      recordFaucetDrip("9.9.9.9", T0, s, cfg);
    }
    const blocked = checkFaucetLimit("9.9.9.9", T0, s, cfg);
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toMatch(/IP/i);
  });

  it("cuenta cada IP por separado", () => {
    const s = newFaucetState();
    const cfg = { ...CFG, dailyBudget: parseEther("100") };
    for (let i = 0; i < cfg.maxPerIp; i++) recordFaucetDrip("8.8.8.8", T0, s, cfg);
    expect(checkFaucetLimit("8.8.8.8", T0, s, cfg).allowed).toBe(false);
    expect(checkFaucetLimit("7.7.7.7", T0, s, cfg).allowed).toBe(true);
  });

  it("la ventana por IP expira: hits viejos no cuentan", () => {
    const s = newFaucetState();
    const cfg = { ...CFG, dailyBudget: parseEther("100") };
    for (let i = 0; i < cfg.maxPerIp; i++) recordFaucetDrip("5.5.5.5", T0, s, cfg);
    expect(checkFaucetLimit("5.5.5.5", T0, s, cfg).allowed).toBe(false);
    // pasada la ventana (mismo día), los hits viejos caducan
    const later = T0 + cfg.ipWindowMs + 1;
    expect(checkFaucetLimit("5.5.5.5", later, s, cfg).allowed).toBe(true);
  });

  it("bloquea cuando el presupuesto diario se agota (defensa anti-drain)", () => {
    const s = newFaucetState();
    // 2 drips (0.04) entran; el 3ro (0.06) supera el cupo de 0.05 — distintas IPs
    // para que NO sea el límite por IP el que dispare.
    expect(checkFaucetLimit("a", T0, s, CFG).allowed).toBe(true);
    recordFaucetDrip("a", T0, s, CFG);
    expect(checkFaucetLimit("b", T0, s, CFG).allowed).toBe(true);
    recordFaucetDrip("b", T0, s, CFG);
    const blocked = checkFaucetLimit("c", T0, s, CFG);
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toMatch(/cupo diario/i);
  });

  it("el cupo diario se reinicia al cambiar de día", () => {
    const s = newFaucetState();
    recordFaucetDrip("a", T0, s, CFG);
    recordFaucetDrip("b", T0, s, CFG);
    expect(checkFaucetLimit("c", T0, s, CFG).allowed).toBe(false); // cupo agotado hoy
    const nextDay = T0 + 24 * 60 * 60 * 1000;
    expect(checkFaucetLimit("c", nextDay, s, CFG).allowed).toBe(true); // nuevo día, cupo fresco
  });
});
