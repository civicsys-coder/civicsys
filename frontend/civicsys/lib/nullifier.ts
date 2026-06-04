import { keccak256, encodePacked } from "viem";

/**
 * Votación anónima por nullifier (Sprint 04, ADR-010).
 *
 * El nullifier desliga el voto de la identidad: la misma identidad produce el
 * MISMO nullifier en una propuesta (no puede votar dos veces) pero DISTINTO entre
 * propuestas (no se correlacionan sus votos). Es un hash sin preimagen pública.
 *
 * En producción el identitySecret derivaría de la Cédula con una prueba ZK de
 * membresía (Semaphore). Acá es un secreto local que representa esa identidad.
 */
export function computeNullifier(
  identitySecret: string,
  proposalId: number | bigint
): `0x${string}` {
  return keccak256(
    encodePacked(["string", "uint256"], [identitySecret, BigInt(proposalId)])
  );
}

const STORAGE_KEY = "ssc-identity-secret";

/**
 * Obtiene (o crea) el secreto de identidad local del votante. Representa el
 * secreto de su Cédula. Vive solo en el navegador (localStorage), nunca se envía.
 */
export function getOrCreateIdentitySecret(): string {
  if (typeof window === "undefined") return "demo-secret";
  let s = window.localStorage.getItem(STORAGE_KEY);
  if (!s) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    s = "0x" + [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    window.localStorage.setItem(STORAGE_KEY, s);
  }
  return s;
}
