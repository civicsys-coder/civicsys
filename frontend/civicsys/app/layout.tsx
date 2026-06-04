import type { Metadata } from "next";
import { Archivo, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "./providers";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

// Display: grotesca institucional, monumental (titulares peso 800, tracking ceñido).
const display = Archivo({
  variable: "--font-display",
  subsets: ["latin"],
});

// Cuerpo / UI: IBM Plex Sans — herencia enterprise, técnica y confiable.
const plexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  subsets: ["latin"],
});

// Datos / direcciones / hashes / nullifiers: IBM Plex Mono.
const plexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CivicSys · Cámara cívica sobre Syscoin",
  description:
    "Plataforma cívica de blockchain institucional sobre Syscoin / zkTanenbaum. La IA asesora, el ciudadano supervisa, el blockchain firma — coordinado por Hermes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${display.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <SiteHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
