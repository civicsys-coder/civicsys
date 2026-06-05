// Relayer-drip de gas (testnet) — paga una pizca de TSYS a una wallet ciudadana
// recién creada para que pueda firmar su propio mint de Cédula (self-service).
// Guardas anti-abuso: monto fijo ínfimo + no re-fondea wallets que ya tienen gas.
// Ver nota de seguridad en relayer.ts.

import { Router } from "express";
import { parseEther, isAddress, getAddress } from "viem";
import { publicClient, relayerWallet, relayerConfigured } from "./relayer.js";

const DRIP_AMOUNT = process.env.DRIP_AMOUNT_TSYS ?? "0.02"; // por inscripción
const DRIP_THRESHOLD = parseEther("0.01"); // si ya tiene >= esto, no dripeamos

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

    // Anti-abuso: no re-fondear wallets que ya tienen gas.
    const bal = await publicClient.getBalance({ address: to });
    if (bal >= DRIP_THRESHOLD) {
      return res.json({ ok: true, skipped: true, reason: "ya tiene gas suficiente" });
    }

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
