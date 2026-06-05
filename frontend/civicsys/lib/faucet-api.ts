// Cliente del relayer-drip del backend: una wallet ciudadana recién creada arranca
// con 0 gas en testnet, así que le pedimos al relayer una pizca de TSYS para que
// pueda firmar su propio mint de la Cédula (self-service, sin custodia).

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

export async function dripGas(address: string): Promise<void> {
  const r = await fetch(`${BACKEND_URL}/faucet/drip`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address }),
  });
  if (!r.ok) throw new Error(`faucet drip falló: ${r.status}`);
}
