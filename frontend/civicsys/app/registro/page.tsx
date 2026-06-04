import Link from "next/link";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { NetworkBadge } from "@/components/NetworkBadge";
import { WizardSteps } from "@/components/registro/WizardSteps";

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="max-w-md mx-auto px-6 py-12 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Cédula Cívica</h1>
          <p className="text-sm text-muted-foreground">
            Registrate una sola vez: DNI + rostro → wallet no-custodial → NFT soulbound que
            te identifica como humano único. Tu DNI y tu clave nunca salen de tu navegador.
          </p>
        </div>
        <WizardSteps />
      </section>
    </main>
  );
}
