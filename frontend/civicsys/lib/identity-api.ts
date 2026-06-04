const HERMES_URL = process.env.NEXT_PUBLIC_HERMES_URL ?? "http://localhost:8000";

export interface DedupeResult {
  duplicate: boolean;
}

export async function dedupeFace(embedding: number[]): Promise<DedupeResult> {
  const r = await fetch(`${HERMES_URL}/agents/identity/dedupe-face`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ embedding }),
  });
  if (!r.ok) throw new Error(`Hermes dedupe falló: ${r.status}`);
  return r.json();
}

export async function registerFace(embedding: number[], faceCommitment: string): Promise<void> {
  const r = await fetch(`${HERMES_URL}/agents/identity/register-face`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ embedding, faceCommitment }),
  });
  if (!r.ok) throw new Error(`Hermes register-face falló: ${r.status}`);
}
