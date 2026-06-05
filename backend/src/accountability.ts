// Anclaje on-chain de los reportes de «La Tóxica» en AccountabilityLog (zkSYS).
// Cuando el agente detecta una brecha pueblo vs. congreso, ancla un registro
// inmutable {proposalId, keccak256(post), resumen} y devuelve el link al explorer.

import { Router } from "express";
import { keccak256, toBytes, getAddress, isAddress } from "viem";
import { publicClient, relayerWallet, relayerConfigured, EXPLORER } from "./relayer.js";

const ACCOUNTABILITY_ADDRESS = process.env.ACCOUNTABILITY_ADDRESS as `0x${string}` | undefined;

const ABI = [
  {
    type: "function",
    name: "anchor",
    stateMutability: "nonpayable",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "reportHash", type: "bytes32" },
      { name: "summary", type: "string" },
    ],
    outputs: [{ name: "index", type: "uint256" }],
  },
] as const;

export const accountabilityRouter = Router();

accountabilityRouter.post("/anchor", async (req, res) => {
  try {
    if (!relayerConfigured) {
      return res.status(503).json({ error: "relayer no configurado" });
    }
    if (!ACCOUNTABILITY_ADDRESS || !isAddress(ACCOUNTABILITY_ADDRESS)) {
      return res.status(503).json({ error: "ACCOUNTABILITY_ADDRESS no configurado" });
    }

    const { proposalId, summary, postText } = (req.body ?? {}) as {
      proposalId?: number | string;
      summary?: string;
      postText?: string;
    };
    const pid = Number(proposalId);
    if (!Number.isInteger(pid) || pid < 0) {
      return res.status(400).json({ error: "proposalId inválido" });
    }

    const text = (postText ?? summary ?? "").toString();
    if (!text.trim()) {
      return res.status(400).json({ error: "falta el contenido del reporte" });
    }
    // Hash del post público completo (verificable contra el texto) + resumen legible on-chain.
    const reportHash = keccak256(toBytes(text));
    const shortSummary = (summary ?? text).toString().slice(0, 280);

    const wallet = relayerWallet();
    const hash = await wallet.writeContract({
      address: getAddress(ACCOUNTABILITY_ADDRESS),
      abi: ABI,
      functionName: "anchor",
      args: [BigInt(pid), reportHash, shortSummary],
    } as never);
    await publicClient.waitForTransactionReceipt({ hash, timeout: 90_000 });

    console.log(`[accountability] anchor prop=${pid} → tx ${hash}`);
    return res.json({
      ok: true,
      txHash: hash,
      reportHash,
      explorerTx: `${EXPLORER}/tx/${hash}`,
      contract: `${EXPLORER}/address/${ACCOUNTABILITY_ADDRESS}`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message.split("\n")[0] : "error";
    console.error(`[accountability] anchor error: ${msg}`);
    return res.status(500).json({ error: "anclaje falló" });
  }
});
