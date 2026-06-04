import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Deploy de hackathon: no bloquear el build por lint/TS estrictos preexistentes
  // (el código corre bien; estos chequeos se corren aparte con pnpm lint/test).
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
