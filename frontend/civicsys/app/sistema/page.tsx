"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MatrixRain } from "@/components/MatrixRain";

const HERMES_URL = process.env.NEXT_PUBLIC_HERMES_URL ?? "http://localhost:8000";

type SystemInfo = {
  uptime_s: number;
  councils_run: number;
  avg_confidence: number | null;
  consensus_rate: number | null;
  advisors: number;
  model: string;
  gemini_key: boolean;
  chain_id: number;
  proposals: number;
};
type SwarmAgent = {
  id: string;
  name: string;
  lens: string;
  color: string;
  temp: number;
  purist: boolean;
  status: string;
  runs: number;
  last_latency_ms: number | null;
  avg_confidence: number | null;
  last_postura: string | null;
  last_provider: string | null;
};
type Evo = {
  ts: string;
  proposal_id: number;
  title: string;
  verdict: string;
  divergence: string;
  confidence: number;
  posturas: Record<string, number>;
  providers: string[];
};
type Status = { system: SystemInfo; swarm: SwarmAgent[]; evolution: Evo[] };

const DIV_COLOR: Record<string, string> = {
  baja: "var(--primary)",
  media: "var(--chart-2)",
  alta: "var(--destructive)",
};
const POSTURA_LABEL: Record<string, string> = {
  A_FAVOR: "a favor",
  EN_CONTRA: "en contra",
  CAUTELA: "cautela",
};

function fmtUptime(s: number) {
  const m = Math.floor(s / 60);
  return m ? `${m}m ${s % 60}s` : `${s}s`;
}

export default function SistemaPage() {
  const [st, setSt] = useState<Status | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`${HERMES_URL}/agents/status`)
        .then((r) => r.json())
        .then((d) => alive && (setSt(d), setErr(false)))
        .catch(() => alive && setErr(true));
    load();
    const id = setInterval(load, 4000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <>
      <MatrixRain />
      <main className="relative z-10 min-h-screen px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-widest text-primary">
                ▮ Estado &amp; Evolución
              </h1>
              <p className="text-xs text-muted-foreground">
                SSC ANTIPEREZA · enjambre Hermes · monitor del sistema
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <Link href="/hermes" className="text-muted-foreground underline hover:text-primary">
                ◂ consola
              </Link>
              <Link href="/" className="text-muted-foreground underline hover:text-primary">
                inicio
              </Link>
            </div>
          </header>

          {err && (
            <p className="text-destructive">
              ⚠ No pude leer el estado desde {HERMES_URL}. ¿Hermes está arriba?
            </p>
          )}
          {!st && !err && <p className="text-muted-foreground">cargando estado…</p>}

          {st && (
            <div className="space-y-8">
              {/* Sistema */}
              <section>
                <h2 className="mb-3 text-sm uppercase tracking-wider text-muted-foreground">
                  ▸ Sistema
                </h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Tile label="Hermes" value={st.system.gemini_key ? "ONLINE · Gemini" : "ONLINE · simulado"} ok />
                  <Tile label="Modelo" value={st.system.model} />
                  <Tile label="Cadena" value={`chain ${st.system.chain_id}`} />
                  <Tile label="Propuestas" value={String(st.system.proposals)} />
                  <Tile label="Concilios" value={String(st.system.councils_run)} />
                  <Tile label="Consenso" value={st.system.consensus_rate == null ? "—" : `${st.system.consensus_rate}%`} />
                  <Tile label="Confianza media" value={st.system.avg_confidence == null ? "—" : `${st.system.avg_confidence}/10`} />
                  <Tile label="Uptime" value={fmtUptime(st.system.uptime_s)} />
                </div>
              </section>

              {/* Enjambre */}
              <section>
                <h2 className="mb-3 text-sm uppercase tracking-wider text-muted-foreground">
                  ▸ Enjambre · {st.swarm.length} agentes
                </h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {st.swarm.map((a) => (
                    <div
                      key={a.id}
                      className="border border-border bg-card p-3"
                      style={{ borderLeftColor: a.color, borderLeftWidth: 3 }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold" style={{ color: a.color }}>
                          {a.name}
                          {a.purist ? " · purista" : ""}
                        </span>
                        <span
                          className="text-[10px] uppercase tracking-wider"
                          style={{ color: a.runs > 0 ? "var(--primary)" : "var(--muted-foreground)" }}
                        >
                          <span
                            className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
                            style={{
                              backgroundColor: a.runs > 0 ? "var(--primary)" : "var(--muted-foreground)",
                              boxShadow: a.runs > 0 ? "0 0 6px var(--primary)" : "none",
                            }}
                          />
                          {a.status}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {a.lens} · temp {a.temp}
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[10px]">
                        <Stat k="análisis" v={String(a.runs)} />
                        <Stat k="conf prom" v={a.avg_confidence == null ? "—" : `${a.avg_confidence}`} />
                        <Stat k="últ. ms" v={a.last_latency_ms == null ? "—" : `${a.last_latency_ms}`} />
                        <Stat k="postura" v={a.last_postura ? POSTURA_LABEL[a.last_postura] ?? a.last_postura : "—"} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Evolución */}
              <section>
                <h2 className="mb-3 text-sm uppercase tracking-wider text-muted-foreground">
                  ▸ Evolución de Hermes · {st.evolution.length} concilios
                </h2>
                {st.evolution.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Sin concilios todavía. Convocá uno desde la{" "}
                    <Link href="/hermes" className="underline hover:text-primary">
                      consola
                    </Link>
                    .
                  </p>
                )}
                <div className="space-y-2">
                  {st.evolution.map((e, i) => (
                    <div key={i} className="border border-border bg-card p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <span className="text-card-foreground">
                          #{e.proposal_id} «{e.title}»
                        </span>
                        <span className="text-muted-foreground">
                          {e.ts.replace("T", " ").replace("+00:00", "Z")}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{e.verdict}…</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-wider">
                        <span style={{ color: DIV_COLOR[e.divergence] ?? "var(--muted-foreground)" }}>
                          divergencia {e.divergence}
                        </span>
                        <span className="text-muted-foreground">confianza {e.confidence}/10</span>
                        <span className="text-muted-foreground">
                          {Object.entries(e.posturas)
                            .map(([k, v]) => `${POSTURA_LABEL[k] ?? k}:${v}`)
                            .join(" · ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function Tile({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="border border-border bg-card p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm" style={{ color: ok ? "var(--primary)" : "var(--card-foreground)" }}>
        {value}
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-card-foreground">{v}</div>
      <div className="text-muted-foreground">{k}</div>
    </div>
  );
}
