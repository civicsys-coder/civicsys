import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

export interface GeneratedWallet {
  privateKey: `0x${string}`;
  address: `0x${string}`;
}

/** Genera una wallet no-custodial. La clave vive solo en memoria del navegador. */
export function createWallet(): GeneratedWallet {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return { privateKey, address: account.address };
}
