"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MatrixRain } from "@/components/MatrixRain";
import { CouncilBlock, type Council } from "@/components/CouncilBlock";

const HERMES_URL = process.env.NEXT_PUBLIC_HERMES_URL ?? "http://localhost:8000";

type Step = { tool: string; args: Record<string, unknown>; observation: string };
type Proposal = {
  id: number;
  title: string;
  category: string;
  status: string;
  description: string;
  yes: number;
  no: number;
  abstain: number;
};
type Msg = {
  role: "user" | "hermes" | "system" | "council";
  text?: string;
  steps?: Step[];
  provider?: string;
  confidence?: number;
  council?: Council;
};

const QUICK = [
  "analizá la propuesta 1",
  "convocá al concilio sobre la propuesta 1",
  "resumen general",
  "¿cuál tiene más apoyo?",
];

function pct(part: number, total: number) {
  return total ? Math.round((1000 * part) / total) / 10 : 0;
}

function providerColor(p?: string) {
  if (p === "gemini") return "var(--primary)";
  if (p === "error") return "var(--destructive)";
  if (p === "simulado") return "var(--chart-2)";
  return "var(--accent-foreground)";
}

export default function HermesConsole() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "system",
      text:
        "HERMES v0.2 · agente de supervisión ciudadana — EN LÍNEA.\n" +
        'Escribí una consulta o tocá un comando rápido. Probá «analizá la propuesta 1».',
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [online, setOnline] = useState<boolean | null>(null);
  const [model, setModel] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${HERMES_URL}/agents/health`)
      .then((r) => r.json())
      .then((d) => {
        setOnline(true);
        setModel(d?.llm?.model ?? "");
      })
      .catch(() => setOnline(false));
    fetch(`${HERMES_URL}/agents/proposals`)
      .then((r) => r.json())
      .then((d) => setProposals(d.proposals ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setLoading(true);
    const isCouncil = /concilio|consejo|delibera|convoc/i.test(q);
    try {
      if (isCouncil) {
        const r = await fetch(`${HERMES_URL}/agents/concilio`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: q }),
        });
        const d: Council = await r.json();
        setMessages((m) => [...m, { role: "council", council: d }]);
      } else {
        const r = await fetch(`${HERMES_URL}/agents/hermes/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: q }),
        });
        const d = await r.json();
        setMessages((m) => [
          ...m,
          {
            role: "hermes",
            text: d.answer ?? "(sin respuesta)",
            steps: d.steps,
            provider: d.provider,
            confidence: d.confidence,
          },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "hermes",
          text: `⚠ No pude contactar a Hermes en ${HERMES_URL}. ¿El contenedor está arriba?`,
          provider: "error",
          confidence: 0,
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <>
      <MatrixRain />
      <main className="relative z-10 min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest text-primary">
              ▮ HERMES
            </h1>
            <p className="text-xs text-muted-foreground">
              SSC ANTIPEREZA · agente autónomo de supervisión ciudadana
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full animate-pulse"
                style={{
                  backgroundColor: online
                    ? "var(--primary)"
                    : online === false
                    ? "var(--destructive)"
                    : "var(--muted-foreground)",
                  boxShadow: online ? "0 0 8px var(--primary)" : "none",
                }}
              />
              {online === null
                ? "conectando…"
                : online
                ? "EN LÍNEA"
                : "OFFLINE"}
            </span>
            {model && (
              <span className="text-muted-foreground">
                modelo: <span className="text-secondary-foreground">{model}</span>
              </span>
            )}
            <Link href="/sistema" className="text-muted-foreground underline hover:text-primary">
              estado ▸
            </Link>
            <Link href="/" className="text-muted-foreground underline hover:text-primary">
              ← inicio
            </Link>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,1.6fr)]">
          {/* Panel de propuestas */}
          <section className="space-y-3">
            <h2 className="text-sm uppercase tracking-wider text-muted-foreground">
              ▸ Propuestas en curso
            </h2>
            {proposals.length === 0 && (
              <p className="text-xs text-muted-foreground">cargando registro…</p>
            )}
            {proposals.map((p) => {
              const total = p.yes + p.no + p.abstain;
              return (
                <button
                  key={p.id}
                  onClick={() => send(`analizá la propuesta ${p.id}`)}
                  className="block w-full border border-border bg-card p-3 text-left transition-colors hover:border-primary"
                >
                  <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span>
                      #{p.id} · {p.category}
                    </span>
                    <span
                      style={{
                        color:
                          p.status === "abierta"
                            ? "var(--primary)"
                            : "var(--muted-foreground)",
                      }}
                    >
                      {p.status}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-card-foreground">{p.title}</div>
                  <div className="mt-2 flex h-2 w-full overflow-hidden border border-border">
                    <div style={{ width: `${pct(p.yes, total)}%`, backgroundColor: "var(--primary)" }} />
                    <div style={{ width: `${pct(p.no, total)}%`, backgroundColor: "var(--destructive)" }} />
                    <div style={{ width: `${pct(p.abstain, total)}%`, backgroundColor: "var(--muted-foreground)" }} />
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    sí {pct(p.yes, total)}% · no {pct(p.no, total)}% · abst{" "}
                    {pct(p.abstain, total)}% · {total.toLocaleString()} votos
                  </div>
                </button>
              );
            })}
          </section>

          {/* Consola */}
          <section>
            <div
              className="rounded-[10px] border border-border bg-[#02122e]"
              style={{ boxShadow: "0 14px 34px rgba(0,0,0,0.40)" }}
            >
              {/* Transcript */}
              <div
                ref={scrollRef}
                className="h-[58vh] overflow-y-auto p-4 text-sm leading-relaxed"
              >
                {messages.map((m, i) => (
                  <div key={i} className="mb-4">
                    {m.role === "user" && (
                      <div className="text-primary">
                        <span className="text-muted-foreground">visitante@civicsys:~$ </span>
                        {m.text}
                      </div>
                    )}

                    {m.role === "system" && (
                      <div className="whitespace-pre-wrap text-muted-foreground">{m.text}</div>
                    )}

                    {m.role === "council" && m.council && (
                      <CouncilBlock data={m.council} />
                    )}

                    {m.role === "hermes" && (
                      <div className="space-y-2">
                        {m.steps && m.steps.length > 0 && (
                          <div className="space-y-0.5 border-l-2 border-border pl-3">
                            {m.steps.map((s, j) => (
                              <div
                                key={j}
                                className="animate-in fade-in slide-in-from-left-2 text-xs text-muted-foreground"
                              >
                                ▸ <span className="text-secondary-foreground">{s.tool}</span>(
                                {Object.keys(s.args).length
                                  ? JSON.stringify(s.args)
                                  : ""}
                                ) → {s.observation}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="whitespace-pre-wrap border-l-2 border-primary pl-3 text-card-foreground">
                          <span className="text-primary">hermes » </span>
                          {m.text}
                        </div>
                        {m.provider && (
                          <div
                            className="pl-3 text-[10px] uppercase tracking-wider"
                            style={{ color: providerColor(m.provider) }}
                          >
                            ● {m.provider}
                            {typeof m.confidence === "number"
                              ? ` · confianza ${m.confidence}/10`
                              : ""}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="text-muted-foreground">
                    hermes procesando<span className="crt-caret">&nbsp;</span>
                  </div>
                )}
              </div>

              {/* Comandos rápidos */}
              <div className="flex flex-wrap gap-2 border-t border-border p-3">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    disabled={loading}
                    className="border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex items-center gap-2 border-t border-border p-3"
              >
                <span className="text-primary">›</span>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="preguntale a Hermes…"
                  disabled={loading}
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground"
                  style={{ caretColor: "var(--primary)" }}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  ejecutar
                </button>
              </form>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Hermes razona sobre datos ficticios de demostración. Si configurás una API key de
              Gemini, el análisis lo genera el modelo; si no, usa el motor «simulado».
            </p>
          </section>
        </div>
      </div>
      </main>
    </>
  );
}
