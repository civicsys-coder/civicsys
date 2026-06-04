/**
 * keystore: cifra/descifra la private key con la contraseña del ciudadano.
 * PBKDF2 (SHA-256, 150k iter) -> clave AES-GCM 256. El server nunca ve la clave.
 * ADR-007. Formato JSON propio (no keystore-v3 canónico — ver ADR).
 */
const ENC = new TextEncoder();
const DEC = new TextDecoder();

function toHex(buf: ArrayBufferLike): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

// Uint8Array.from garantiza respaldo ArrayBuffer (no SharedArrayBuffer) para
// satisfacer BufferSource de Web Crypto bajo los tipos de TS 5.7+.
function buf(u: Uint8Array): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(u);
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", buf(ENC.encode(password)), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: buf(salt), iterations: 150_000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptKey(privateKey: `0x${string}`, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, buf(ENC.encode(privateKey)));
  return JSON.stringify({
    version: 1,
    kdf: "PBKDF2-SHA256",
    iterations: 150_000,
    salt: toHex(salt.buffer),
    iv: toHex(iv.buffer),
    ciphertext: toHex(ct),
  });
}

export async function decryptKey(blob: string, password: string): Promise<`0x${string}`> {
  const o = JSON.parse(blob);
  const key = await deriveKey(password, fromHex(o.salt));
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromHex(o.iv) },
    key,
    fromHex(o.ciphertext)
  );
  return DEC.decode(pt) as `0x${string}`;
}
