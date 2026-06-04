"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { NetworkBadge } from "@/components/NetworkBadge";

export default function DashboardPage() {
  const { data, isLoading } = trpc.reports.list.useQuery({ limit: 20, offset: 0 });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="max-w-3xl mx-auto px-6 py-12 space-y-6">
        <h1 className="text-3xl font-bold">Dashboard Hermes</h1>

        {isLoading && <p>Cargando reportes...</p>}

        {data && data.length === 0 && (
          <p className="text-muted-foreground">
            Todavía no hay reportes. Cuando una propuesta cierre, Hermes va a generar uno automáticamente.
          </p>
        )}

        {data?.map((r) => (
          <Card key={r.id}>
            <CardContent className="pt-6 space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Propuesta #{r.proposalId} · chain {r.chainId}</span>
                <span>Confianza {r.confidence}/10</span>
              </div>
              <pre className="text-sm whitespace-pre-wrap font-sans">{r.bodyMarkdown}</pre>
              {r.txHash && (
                <div className="text-xs text-muted-foreground">
                  TX: <code className="font-mono">{r.txHash}</code>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
