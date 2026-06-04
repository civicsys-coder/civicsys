"use client";

export type Advisor = {
  id: string;
  name: string;
  lens: string;
  color: string;
  temp: number;
  purist: boolean;
  postura: string;
  text: string;
  provider: string;
  confidence: number;
  latency_ms: number;
};

export type Council = {
  proposal: { id: number; title: string };
  advisors: Advisor[];
  verdict: { text: string; provider: string; confidence: number };
  divergence: { level: string; score: number; posturas: Record<string, number> };
  consensus: boolean;
  elapsed_ms: number;
};

const POSTURA: Record<string, { label: string; color: string }> = {
  A_FAVOR: { label: "A favor", color: "var(--primary)" },
  EN_CONTRA: { label: "En contra", color: "var(--destructive)" },
  CAUTELA: { label: "Cautela", color: "var(--chart-4)" },
};

const DIV_COLOR: Record<string, string> = {
  baja: "var(--primary)",
  media: "var(--chart-2)",
  alta: "var(--destructive)",
};

export function CouncilBlock({ data }: { data: Council }) {
  return (
    <div className="space-y-3 border-l-2 border-primary pl-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-primary">
          ⚖ concilio »{" "}
          <span className="text-card-foreground">«{data.proposal.title}»</span>
        </span>
        <span
          className="text-[10px] uppercase tracking-wider"
          style={{ color: DIV_COLOR[data.divergence.level] ?? "var(--muted-foreground)" }}
        >
          divergencia {data.divergence.level} · {data.consensus ? "consenso" : "disenso"}
        </span>
      </div>

      {/* medidor de divergencia */}
      <div className="h-1.5 w-full overflow-hidden border border-border">
        <div
          className="h-full"
          style={{
            width: `${Math.round((data.divergence.score ?? 0) * 100)}%`,
            backgroundColor: DIV_COLOR[data.divergence.level] ?? "var(--muted-foreground)",
          }}
        />
      </div>

      {/* columnas de consejeros */}
      <div className="grid gap-2 sm:grid-cols-2">
        {data.advisors.map((a) => {
          const ps = POSTURA[a.postura] ?? POSTURA.CAUTELA;
          return (
            <div
              key={a.id}
              className="border border-border bg-card p-2"
              style={{ borderLeftColor: a.color, borderLeftWidth: 3 }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold" style={{ color: a.color }}>
                  {a.name}
                  {a.purist ? " · purista" : ""}
                </span>
                <span
                  className="shrink-0 px-1.5 py-0.5 text-[9px] uppercase"
                  style={{ color: ps.color, border: `1px solid ${ps.color}` }}
                >
                  {ps.label}
                </span>
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">{a.lens}</div>
              <p className="mt-1 whitespace-pre-wrap text-xs text-card-foreground">{a.text}</p>
              <div className="mt-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                ● {a.provider} · {a.latency_ms}ms · temp {a.temp}
              </div>
            </div>
          );
        })}
      </div>

      {/* veredicto */}
      <div className="bg-[#05140c] p-3" style={{ border: "1px solid var(--primary)" }}>
        <div className="text-xs uppercase tracking-wider text-primary">
          ⟐ Veredicto consolidado
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm text-card-foreground">
          {data.verdict.text}
        </p>
        <div className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          ● {data.verdict.provider} · confianza {data.verdict.confidence}/10 ·{" "}
          {data.advisors.length} consejeros · {data.elapsed_ms}ms
        </div>
      </div>
    </div>
  );
}
