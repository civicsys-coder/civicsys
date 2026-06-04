"use client";

/**
 * CedulaCard — tarjeta presentacional de la Cédula Cívica (NFT soulbound).
 * Estética verde fósforo, acorde al tema del proyecto.
 */
export function CedulaCard({
  tokenId,
  holder,
  mintedAt,
}: {
  tokenId: bigint | number | string;
  holder: `0x${string}`;
  mintedAt?: string;
}) {
  const short = `${holder.slice(0, 6)}…${holder.slice(-4)}`;
  return (
    <div
      className="border border-primary bg-card p-4"
      style={{ boxShadow: "0 0 20px rgba(0,255,102,0.15)" }}
      data-testid="cedula-card"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          SSC ANTIPEREZA
        </span>
        <span className="text-[10px] uppercase tracking-wider text-primary">
          Verificada · Soulbound
        </span>
      </div>
      <h3 className="mt-2 text-xl font-bold text-primary">▮ Cédula Cívica</h3>
      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Token</dt>
          <dd className="font-mono">#{tokenId.toString()}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Titular</dt>
          <dd className="font-mono">{short}</dd>
        </div>
        {mintedAt && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Emitida</dt>
            <dd className="font-mono text-xs">{mintedAt}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
