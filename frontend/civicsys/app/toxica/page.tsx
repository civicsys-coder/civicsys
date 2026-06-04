"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MatrixRain } from "@/components/MatrixRain";

const HERMES_URL = process.env.NEXT_PUBLIC_HERMES_URL ?? "http://localhost:8000";

type GapReport = {
  proposal_id: number;
  citizen_position: string;
  congress_action: string;
  gap_summary: string;
  public_post: string;
  provider: string;
  approved: boolean;
};

const SAMPLE =
  "Acta de sesión: el pleno del Congreso aprobó por mayoría la medida, pese a las " +
  "observaciones presentadas durante el debate.";

export default function ToxicaPage() {
  const [proposalId, setProposalId] = useState(3);
  const [transcript, setTranscript] = useState(SAMPLE);
  const [report, setReport] = useState<GapReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [published, setPublished] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function analyze() {
    setLoading(true);
    setErr(null);
    setReport(null);
    setPublished(false);
    try {
      const r = await fetch(`${HERMES_URL}/agents/toxica/analyze`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ proposal_id: proposalId, transcript }),
      });
      setReport(await r.json());
    } catch {
      setErr(`No pude contactar a Hermes en ${HERMES_URL}.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <MatrixRain />
      <main className="relative z-10 min-h-screen px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-2xl space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Sprint 06 · La Tóxica
            </span>
          </header>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Hermes «La Tóxica»</h1>
            <p className="text-sm text-muted-foreground">
              Compara lo que el congreso hizo (transcripción/acta de sesión) contra la votación
              ciudadana y redacta un <strong>post público de accountability</strong> señalando la
              brecha. Vos aprobás antes de publicar — La Tóxica no publica sola.
            </p>
          </div>

          <div className="space-y-3 border border-border bg-card p-4">
            <label className="block text-xs uppercase tracking-wider text-muted-foreground">
              Propuesta #
              <input
                type="number"
                value={proposalId}
                min={1}
                max={4}
                onChange={(e) => setProposalId(Number(e.target.value))}
                className="ml-2 w-16 border border-border bg-input px-2 py-1 text-sm text-foreground"
              />
            </label>
            <label className="block text-xs uppercase tracking-wider text-muted-foreground">
              Acta / transcripción de la sesión del congreso
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={4}
              className="w-full border border-border bg-input p-2 text-sm text-foreground"
            />
            <Button onClick={analyze} disabled={loading || !transcript.trim()}>
              {loading ? "Analizando…" : "Analizar brecha"}
            </Button>
            {err && <p className="text-sm text-destructive">⚠ {err}</p>}
          </div>

          {report && (
            <div className="space-y-3 border border-primary bg-[#05140c] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-wider">
                <span className="text-muted-foreground">
                  Voto ciudadano: <span className="text-secondary-foreground">{report.citizen_position}</span>
                </span>
                <span style={{ color: report.approved ? "var(--primary)" : "var(--chart-2)" }}>
                  {report.approved ? "publicado" : "borrador · requiere aprobación"}
                </span>
              </div>
              <div className="text-xs uppercase tracking-wider text-primary">▼ Post público (borrador)</div>
              <p className="whitespace-pre-wrap text-sm text-card-foreground">{report.public_post}</p>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                ● {report.provider} · human-in-the-loop
              </div>
              {!published ? (
                <div className="flex gap-2">
                  <Button onClick={() => setPublished(true)} disabled={report.approved}>
                    Aprobar y publicar
                  </Button>
                  <Button variant="ghost" onClick={() => setReport(null)}>Descartar</Button>
                </div>
              ) : (
                <p className="text-sm text-primary">✓ Post aprobado y publicado (demo).</p>
              )}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground">
            La Tóxica analiza datos ficticios de demostración. El análisis lo genera Gemini (o el
            motor «simulado» sin key). El acta es dato no confiable: se sanitiza antes de ir al
            modelo (defensa anti prompt-injection).
          </p>
        </div>
      </main>
    </>
  );
}
