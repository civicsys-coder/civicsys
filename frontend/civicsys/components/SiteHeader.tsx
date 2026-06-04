import Link from "next/link";
import Image from "next/image";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { NetworkBadge } from "@/components/NetworkBadge";

/**
 * Navbar única y consistente para TODA la app (montada en el root layout).
 * Marca = emblema CivicSys + wordmark "CivicSys". Evita que el header mute entre vistas.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#08214f]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/civicsys-mark.png"
            alt="CivicSys"
            width={256}
            height={256}
            priority
            className="h-14 w-14 object-contain drop-shadow-[0_3px_12px_rgba(0,0,0,0.6)] sm:h-[72px] sm:w-[72px]"
          />
          <span className="font-heading text-[22px] font-extrabold tracking-[-0.02em] text-white sm:text-[26px]">
            CivicSys
          </span>
        </Link>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <NetworkBadge />
          <ConnectWalletButton />
        </div>
      </div>
    </header>
  );
}
