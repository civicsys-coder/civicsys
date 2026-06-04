import Link from "next/link";
import Image from "next/image";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { NetworkBadge } from "@/components/NetworkBadge";
import { Button } from "@/components/ui/button";

const SYSCOIN_DOCS = "https://docs.syscoin.org";

type DocStep = { step: string; title: string; body: string };

const STEPS: DocStep[] = [
  {
    step: "1",
    title: "Te registras",
    body: "DNI hash on-chain. Tu identidad nunca sale en claro.",
  },
  {
    step: "2",
    title: "Votas",
    body: "Sí · No · Abstención. Firmado en zkTanenbaum.",
  },
  {
    step: "3",
    title: "Hermes audita",
    body: "Genera reportes trazables con fuente y confianza.",
  },
];

function DocCard({ step, title, body }: DocStep) {
  return (
    <article className="civic-doc flex flex-col text-left">
      <header className="civic-doc__header px-4 py-2.5 text-[15px]">
        {step}. {title}
      </header>
      <div className="flex-1 px-4 py-4">
        <p className="text-[13.5px] leading-relaxed text-[#48526b]">{body}</p>
      </div>
    </article>
  );
}

const PRIMARY_LINKS = [
  { href: "/hermes", label: "Hablar con Hermes" },
  { href: "/registro", label: "Registro" },
  { href: "/votacion", label: "Ver propuesta activa" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function Home() {
  return (
    <main className="relative min-h-screen">
      {/* ── Hero (centrado) ──────────────────────────────────────── */}
      <section className="relative mx-auto max-w-5xl px-5 pb-24 pt-10 text-center sm:px-8 sm:pt-14">
        <h1 className="mx-auto max-w-4xl text-pretty text-[2.5rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-white sm:text-6xl lg:text-[4.25rem]">
          La IA Asesora.
          <br />
          El Ciudadano Supervisa.
          <br />
          El Blockchain Firma.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-[1.05rem] leading-relaxed text-[#d7dde8] sm:text-xl">
          Cámara cívica deliberativa sobre Syscoin / zkTanenbaum. Coordinada por{" "}
          <strong className="font-semibold text-white">Hermes</strong>, agente
          maestro con identidad y memoria propias.
        </p>

        <div className="mx-auto mt-12 grid max-w-4xl gap-5 sm:grid-cols-3">
          {STEPS.map((s) => (
            <DocCard key={s.step} {...s} />
          ))}
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {PRIMARY_LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              <Button className="civic-shadow-red h-12 px-6 text-[15px] font-semibold">
                {l.label}
              </Button>
            </Link>
          ))}
        </div>

        <nav className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-[#9fb0d0]">
          <Link className="transition-colors hover:text-white" href="/sistema">
            Estado del enjambre →
          </Link>
          <Link className="transition-colors hover:text-white" href="/toxica">
            La Tóxica →
          </Link>
        </nav>
      </section>

      {/* ── Joya flotante: moneda Syscoin → documentación ────────── */}
      <a
        href={SYSCOIN_DOCS}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Documentación de Syscoin (se abre en una pestaña nueva)"
        className="group fixed bottom-5 right-5 z-50 flex flex-col items-center gap-1.5"
      >
        <Image
          src="/syscoin-coin.png"
          alt=""
          width={256}
          height={256}
          priority
          className="brand-float h-[72px] w-[72px] rounded-full ring-1 ring-white/15 sm:h-20 sm:w-20"
        />
        <span className="rounded-full border border-white/10 bg-[#08214f]/90 px-2.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#cdd6e8] opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          Docs Syscoin
        </span>
      </a>
    </main>
  );
}
