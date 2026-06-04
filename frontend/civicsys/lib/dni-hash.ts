import { keccak256, encodePacked } from "viem";

/**
 * Calcula el hash on-chain del DNI.
 *
 * Equivalente a Solidity keccak256(abi.encodePacked(dni, public_salt))
 * y a Python `compute_citizen_hash` en agents/app/helpers.py.
 *
 * El DNI NO debe ser logueado. Solo el resultado.
 */
export function computeDniHash(dni: string, publicSalt: string): `0x${string}` {
  return keccak256(encodePacked(["string", "string"], [dni, publicSalt]));
}
