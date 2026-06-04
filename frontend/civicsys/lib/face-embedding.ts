import { keccak256, toHex } from "viem";

/**
 * Embedding facial MOCK (Sprint 03): determinista a partir de los bytes de la
 * imagen. NO es reconocimiento facial real (ADR-008). Dimensión 384 para casar
 * con agents/app/memory.py. Sustituible por face-api.js/MediaPipe en el futuro.
 */
export async function embedFace(imageBytes: Uint8Array): Promise<number[]> {
  const out: number[] = [];
  // Hash en cascada para 384 floats deterministas en [-1, 1].
  // Uint8Array.from garantiza respaldo ArrayBuffer (no SharedArrayBuffer) para
  // satisfacer BufferSource de Web Crypto bajo los tipos de TS 5.7+.
  let seed = new Uint8Array(await crypto.subtle.digest("SHA-256", Uint8Array.from(imageBytes)));
  while (out.length < 384) {
    seed = new Uint8Array(await crypto.subtle.digest("SHA-256", seed));
    for (let i = 0; i + 4 <= seed.length && out.length < 384; i += 4) {
      const v = (seed[i] << 24) | (seed[i + 1] << 16) | (seed[i + 2] << 8) | seed[i + 3];
      out.push(((v >>> 0) / 0xffffffff) * 2 - 1);
    }
  }
  return out;
}

/** Commitment on-chain del rostro: keccak256(embedding_redondeado || salt). */
export function faceCommitment(embedding: number[], salt: string): `0x${string}` {
  const payload = embedding.map((x) => x.toFixed(6)).join(",") + "|" + salt;
  return keccak256(toHex(payload));
}
