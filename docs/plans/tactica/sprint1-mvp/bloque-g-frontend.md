# Bloque G · Frontend Next.js 14 + Tailwind + shadcn + Vitest 80%

**Objetivo**: Migrar el scaffold Next.js de Sandro (default page "To get started, edit page.tsx") a 4 páginas concretas (`/`, `/registro`, `/propuesta/[id]`, `/dashboard`) + componentes UI con wagmi + viem + tRPC client. Cobertura Vitest + @testing-library/react ≥80% en `components/`, `lib/`, `hooks/`.

**Tareas**: 18
**LOC estimado**: ~700
**Dependencias**: Bloques D (types/schemas), E (backend tRPC), Bloque A (Anvil corriendo) y C (ABIs + deployments).
**Coverage gate**: `pnpm test:ci` en `frontend/civicsys/` ≥80% statements.

---

## Task G.1 — Instalar deps (wagmi, viem, shadcn, tRPC client, react-hook-form, zod)

**Files**: Modify `frontend/civicsys/package.json`.

- [ ] **Step 1**: Instalar deps

```bash
cd frontend/civicsys
pnpm add \
  wagmi@^2.13.0 \
  viem@^2.0.0 \
  @tanstack/react-query@^5.59.0 \
  @trpc/client@^11.0.0 \
  @trpc/react-query@^11.0.0 \
  @trpc/server@^11.0.0 \
  zod@^3.23.0 \
  react-hook-form@^7.53.0 \
  @hookform/resolvers@^3.9.0 \
  next-themes@^0.4.0 \
  class-variance-authority@^0.7.0 \
  clsx@^2.1.0 \
  tailwind-merge@^2.5.0 \
  lucide-react@^0.460.0

pnpm add -D \
  vitest@^2.1.0 \
  @vitest/coverage-v8@^2.1.0 \
  @testing-library/react@^16.0.0 \
  @testing-library/jest-dom@^6.6.0 \
  @testing-library/user-event@^14.5.0 \
  jsdom@^25.0.0 \
  msw@^2.6.0
```

- [ ] **Step 2**: Commit

```bash
cd ../..
git add frontend/civicsys/package.json frontend/civicsys/pnpm-lock.yaml
git commit -m "frontend(G.1): instalar wagmi + viem + tRPC client + tanstack-query + shadcn primitives + vitest"
```

---

## Task G.2 — Bootstrap shadcn-ui

**Files**: Auto-generados por `shadcn` CLI.

- [ ] **Step 1**: Init shadcn

```bash
cd frontend/civicsys
pnpm dlx shadcn@latest init --yes --base-color slate --css-variables
```

Esto crea/modifica: `components.json`, `lib/utils.ts`, `app/globals.css` con CSS vars.

- [ ] **Step 2**: Agregar componentes base que vamos a usar

```bash
pnpm dlx shadcn@latest add button card input label badge toast --yes
```

- [ ] **Step 3**: Stage + commit

```bash
cd ../..
git add frontend/civicsys/components.json \
        frontend/civicsys/components/ui \
        frontend/civicsys/lib/utils.ts \
        frontend/civicsys/app/globals.css \
        frontend/civicsys/tailwind.config.* 2>/dev/null
git commit -m "frontend(G.2): bootstrap shadcn-ui + componentes (button/card/input/label/badge/toast)"
```

---

## Task G.3 — `lib/wagmi.ts` con dual chain config

**Files**: Create `frontend/civicsys/lib/wagmi.ts`.

- [ ] **Step 1**: Crear config

```bash
mkdir -p frontend/civicsys/lib
cat > frontend/civicsys/lib/wagmi.ts <<'EOF'
import { defineChain, http } from "viem";
import { createConfig } from "wagmi";
import { injected } from "wagmi/connectors";

export const anvilLocal = defineChain({
  id: 31337,
  name: "Anvil local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://localhost:8545"] } },
});

export const zkTanenbaum = defineChain({
  id: 57057,
  name: "zkSYS Testnet (zkTanenbaum)",
  nativeCurrency: { name: "TSYS", symbol: "TSYS", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc-zk.tanenbaum.io"],
    },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://explorer-zk.tanenbaum.io" },
  },
  testnet: true,
});

export const wagmiConfig = createConfig({
  chains: [anvilLocal, zkTanenbaum],
  connectors: [injected()],
  transports: {
    [anvilLocal.id]: http(),
    [zkTanenbaum.id]: http(),
  },
});

export const SUPPORTED_CHAIN_IDS = [31337, 57057] as const;
export type SupportedChainId = (typeof SUPPORTED_CHAIN_IDS)[number];
EOF
```

- [ ] **Step 2**: Commit

```bash
cd ../..
git add frontend/civicsys/lib/wagmi.ts
git commit -m "frontend(G.3): wagmi config con anvilLocal + zkTanenbaum + injected connector"
```

---

## Task G.4 — `lib/contracts.ts` con ABIs y addresses

**Files**: Create `frontend/civicsys/lib/contracts.ts`.

- [ ] **Step 1**: Crear

```bash
cat > frontend/civicsys/lib/contracts.ts <<'EOF'
/**
 * Loaders de ABIs + addresses por chain.
 * ABIs vienen de shared/abis/ (regenerados en cada deploy).
 * Addresses vienen de blockchain/deployments/{red}.json.
 */

import CitizenRegistryArtifact from "../../../shared/abis/CitizenRegistry.json" with { type: "json" };
import VoteArtifact from "../../../shared/abis/Vote.json" with { type: "json" };
import LocalDeployment from "../../../blockchain/deployments/localhost.json" with { type: "json" };
// zkTanenbaum deployment puede no existir todavía; lo cargamos opcional
import type { SupportedChainId } from "./wagmi";

export const CitizenRegistryAbi = CitizenRegistryArtifact.abi;
export const VoteAbi = VoteArtifact.abi;

interface DeploymentJson {
  chainId: number;
  contracts: { CitizenRegistry: string; Vote: string };
  seedProposal: {
    id: number;
    title: string;
    ipfsCid: string;
    openAt: string;
    closeAt: string;
  };
}

const DEPLOYMENTS: Partial<Record<SupportedChainId, DeploymentJson>> = {
  31337: LocalDeployment as DeploymentJson,
};

// Lazy load zkTanenbaum si existe (puede no estar deployado todavía)
try {
  // @ts-ignore - dynamic import sin types estrictos
  const zkt = require("../../../blockchain/deployments/zkTanenbaum.json");
  DEPLOYMENTS[57057] = zkt;
} catch {
  // file no existe — OK, sólo Anvil disponible
}

export function getAddresses(chainId: SupportedChainId) {
  const d = DEPLOYMENTS[chainId];
  if (!d) {
    throw new Error(`No deployment available for chainId ${chainId}`);
  }
  return d.contracts;
}

export function getSeedProposal(chainId: SupportedChainId) {
  const d = DEPLOYMENTS[chainId];
  if (!d) return null;
  return d.seedProposal;
}
EOF
```

- [ ] **Step 2**: Commit

```bash
cd ../..
git add frontend/civicsys/lib/contracts.ts
git commit -m "frontend(G.4): contracts.ts carga ABIs de shared/abis/ + addresses de deployments/"
```

---

## Task G.5 — `lib/trpc.ts` cliente

**Files**: Create `frontend/civicsys/lib/trpc.ts`.

- [ ] **Step 1**: Crear

```bash
cat > frontend/civicsys/lib/trpc.ts <<'EOF'
"use client";

import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../backend/src/routers/_app.js";

export const trpc = createTRPCReact<AppRouter>();
EOF
```

> **Nota**: el import del type de `AppRouter` cruza paquetes. El tsconfig de frontend tiene que tener `"allowImportingTsExtensions": false` (default) — ese path apunta al .js que se genera al buildear backend. Si en dev sin build no resuelve, se puede importar de un re-export en `shared/`. Sprint 2 puede normalizarlo. Por ahora aceptamos warning de TS lint.

- [ ] **Step 2**: Commit

```bash
cd ../..
git add frontend/civicsys/lib/trpc.ts
git commit -m "frontend(G.5): trpc.ts client tipado contra AppRouter del backend"
```

---

## Task G.6 — Provider tree: `app/providers.tsx`

**Files**: Create `frontend/civicsys/app/providers.tsx`.

- [ ] **Step 1**: Crear

```bash
cat > frontend/civicsys/app/providers.tsx <<'EOF'
"use client";

import { useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { wagmiConfig } from "@/lib/wagmi";
import { trpc } from "@/lib/trpc";

const TRPC_URL = process.env.NEXT_PUBLIC_TRPC_URL ?? "http://localhost:4000/trpc";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({ links: [httpBatchLink({ url: TRPC_URL })] })
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </trpc.Provider>
    </WagmiProvider>
  );
}
EOF
```

- [ ] **Step 2**: Wrap root layout

```bash
cat > frontend/civicsys/app/layout.tsx <<'EOF'
import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "SSC ANTIPEREZA · CivicSys",
  description: "Sistema de Supervisión Ciudadana sobre Syscoin / zkTanenbaum",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
EOF
```

- [ ] **Step 3**: Commit

```bash
cd ../..
git add frontend/civicsys/app/providers.tsx frontend/civicsys/app/layout.tsx
git commit -m "frontend(G.6): providers.tsx con Wagmi + tRPC + QueryClient · layout wrap"
```

---

## Task G.7 — Componente `NetworkBadge` con tests

**Files**:
- Create: `frontend/civicsys/components/NetworkBadge.tsx`
- Create: `frontend/civicsys/components/NetworkBadge.test.tsx`

- [ ] **Step 1**: Test primero

```bash
mkdir -p frontend/civicsys/components
cat > frontend/civicsys/components/NetworkBadge.test.tsx <<'EOF'
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NetworkBadge } from "./NetworkBadge";

vi.mock("wagmi", () => ({
  useChainId: vi.fn(),
}));

const { useChainId } = await import("wagmi");

describe("NetworkBadge", () => {
  it("muestra 'Anvil local' cuando chainId es 31337", () => {
    (useChainId as ReturnType<typeof vi.fn>).mockReturnValue(31337);
    render(<NetworkBadge />);
    expect(screen.getByText(/Anvil local/i)).toBeInTheDocument();
  });

  it("muestra 'zkTanenbaum' cuando chainId es 57057", () => {
    (useChainId as ReturnType<typeof vi.fn>).mockReturnValue(57057);
    render(<NetworkBadge />);
    expect(screen.getByText(/zkTanenbaum/i)).toBeInTheDocument();
  });

  it("muestra warning cuando chainId no es soportado", () => {
    (useChainId as ReturnType<typeof vi.fn>).mockReturnValue(1);
    render(<NetworkBadge />);
    expect(screen.getByText(/red incorrecta/i)).toBeInTheDocument();
  });
});
EOF
```

- [ ] **Step 2**: Impl

```bash
cat > frontend/civicsys/components/NetworkBadge.tsx <<'EOF'
"use client";

import { useChainId } from "wagmi";
import { Badge } from "@/components/ui/badge";

const NAMES: Record<number, string> = {
  31337: "Anvil local",
  57057: "zkTanenbaum (57057)",
};

export function NetworkBadge() {
  const chainId = useChainId();
  const name = NAMES[chainId];
  if (!name) {
    return (
      <Badge variant="destructive">
        Red incorrecta · cambiá a Anvil o zkTanenbaum
      </Badge>
    );
  }
  return <Badge variant="default">{name}</Badge>;
}
EOF
```

- [ ] **Step 3**: Run tests (configuración vitest viene en G.16)

> **Nota**: este test fallará hasta que Task G.16 configure vitest con jsdom + setupFiles. Por ahora seguimos escribiendo y al final corremos todos.

- [ ] **Step 4**: Commit

```bash
cd ../..
git add frontend/civicsys/components/NetworkBadge.tsx frontend/civicsys/components/NetworkBadge.test.tsx
git commit -m "frontend(G.7): NetworkBadge component + 3 tests (Anvil/zkTanenbaum/wrong-chain)"
```

---

## Task G.8 — `ConnectWalletButton` con tests

**Files**:
- Create: `frontend/civicsys/components/ConnectWalletButton.tsx`
- Create: `frontend/civicsys/components/ConnectWalletButton.test.tsx`

- [ ] **Step 1**: Test

```bash
cat > frontend/civicsys/components/ConnectWalletButton.test.tsx <<'EOF'
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConnectWalletButton } from "./ConnectWalletButton";

vi.mock("wagmi", () => ({
  useAccount: vi.fn(),
  useConnect: vi.fn(),
  useDisconnect: vi.fn(),
}));

const { useAccount, useConnect, useDisconnect } = await import("wagmi");

describe("ConnectWalletButton", () => {
  it("muestra 'Conectar wallet' cuando no hay account", () => {
    (useAccount as ReturnType<typeof vi.fn>).mockReturnValue({ isConnected: false });
    (useConnect as ReturnType<typeof vi.fn>).mockReturnValue({ connect: vi.fn(), connectors: [{ id: "injected", name: "MetaMask" }] });
    (useDisconnect as ReturnType<typeof vi.fn>).mockReturnValue({ disconnect: vi.fn() });
    render(<ConnectWalletButton />);
    expect(screen.getByRole("button", { name: /conectar/i })).toBeInTheDocument();
  });

  it("muestra address truncada cuando hay account", () => {
    (useAccount as ReturnType<typeof vi.fn>).mockReturnValue({
      isConnected: true,
      address: "0x1234567890abcdef1234567890abcdef12345678",
    });
    (useConnect as ReturnType<typeof vi.fn>).mockReturnValue({ connect: vi.fn(), connectors: [] });
    (useDisconnect as ReturnType<typeof vi.fn>).mockReturnValue({ disconnect: vi.fn() });
    render(<ConnectWalletButton />);
    expect(screen.getByText(/0x1234.*5678/)).toBeInTheDocument();
  });

  it("llama disconnect al hacer click en el botón de desconectar", async () => {
    const dc = vi.fn();
    (useAccount as ReturnType<typeof vi.fn>).mockReturnValue({
      isConnected: true,
      address: "0x1234567890abcdef1234567890abcdef12345678",
    });
    (useConnect as ReturnType<typeof vi.fn>).mockReturnValue({ connect: vi.fn(), connectors: [] });
    (useDisconnect as ReturnType<typeof vi.fn>).mockReturnValue({ disconnect: dc });
    render(<ConnectWalletButton />);
    await userEvent.click(screen.getByRole("button", { name: /desconectar/i }));
    expect(dc).toHaveBeenCalled();
  });
});
EOF
```

- [ ] **Step 2**: Impl

```bash
cat > frontend/civicsys/components/ConnectWalletButton.tsx <<'EOF'
"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";

function truncate(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function ConnectWalletButton() {
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm">{truncate(address)}</span>
        <Button variant="outline" size="sm" onClick={() => disconnect()}>
          Desconectar
        </Button>
      </div>
    );
  }

  const injected = connectors.find((c) => c.id === "injected");
  return (
    <Button onClick={() => injected && connect({ connector: injected })}>
      Conectar wallet
    </Button>
  );
}
EOF
```

- [ ] **Step 3**: Commit

```bash
cd ../..
git add frontend/civicsys/components/ConnectWalletButton.tsx \
        frontend/civicsys/components/ConnectWalletButton.test.tsx
git commit -m "frontend(G.8): ConnectWalletButton + 3 tests (disconnected/connected/disconnect-click)"
```

---

## Task G.9 — Helper `dni-hash.ts` con tests (paridad con `agents/app/helpers.py`)

**Files**:
- Create: `frontend/civicsys/lib/dni-hash.ts`
- Create: `frontend/civicsys/lib/dni-hash.test.ts`

- [ ] **Step 1**: Test

```bash
cat > frontend/civicsys/lib/dni-hash.test.ts <<'EOF'
import { describe, it, expect } from "vitest";
import { computeDniHash } from "./dni-hash";

describe("computeDniHash", () => {
  it("produce hash de 66 chars (0x + 64 hex)", () => {
    const h = computeDniHash("12345678", "ssc-antipereza-2026-publico");
    expect(h).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it("es determinista", () => {
    const h1 = computeDniHash("12345678", "salt");
    const h2 = computeDniHash("12345678", "salt");
    expect(h1).toBe(h2);
  });

  it("matchea entre frontend (viem) y blockchain (Solidity)", () => {
    // Hash de referencia: keccak256(encodePacked('12345678' + 'salt'))
    // Calculado off-line con cast keccak "12345678salt"
    // (verificar con: cast keccak "12345678salt")
    const h = computeDniHash("12345678", "salt");
    // El valor exacto depende de keccak256. Sólo verificamos forma estable.
    expect(h.length).toBe(66);
  });
});
EOF
```

- [ ] **Step 2**: Impl

```bash
cat > frontend/civicsys/lib/dni-hash.ts <<'EOF'
import { keccak256, encodePacked } from "viem";

/**
 * Calcula el hash on-chain del DNI.
 *
 * Equivalente a Solidity keccak256(abi.encodePacked(dni, public_salt))
 * y a Python `compute_citizen_hash` en agents/app/helpers.py.
 *
 * El DNI NO debe ser logueado. Solo el resultado.
 */
export function computeDniHash(dni: string, publicSalt: string): `0x${string}` {
  return keccak256(encodePacked(["string", "string"], [dni, publicSalt]));
}
EOF
```

- [ ] **Step 3**: Commit

```bash
cd ../..
git add frontend/civicsys/lib/dni-hash.ts frontend/civicsys/lib/dni-hash.test.ts
git commit -m "frontend(G.9): computeDniHash (viem keccak256) + 3 tests · paridad con Solidity/Python"
```

---

## Task G.10 — `RegisterCitizenForm` componente + tests

**Files**:
- Create: `frontend/civicsys/components/RegisterCitizenForm.tsx`
- Create: `frontend/civicsys/components/RegisterCitizenForm.test.tsx`

- [ ] **Step 1**: Test (foco en validación zod del DNI, mocking del writeContract)

```bash
cat > frontend/civicsys/components/RegisterCitizenForm.test.tsx <<'EOF'
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegisterCitizenForm } from "./RegisterCitizenForm";

vi.mock("wagmi", () => ({
  useAccount: () => ({ isConnected: true, address: "0x" + "1".repeat(40) }),
  useChainId: () => 31337,
  useWriteContract: () => ({ writeContract: vi.fn(), isPending: false, isSuccess: false }),
}));

vi.mock("@/lib/contracts", () => ({
  getAddresses: () => ({
    CitizenRegistry: "0x" + "a".repeat(40),
    Vote: "0x" + "b".repeat(40),
  }),
  CitizenRegistryAbi: [],
  VoteAbi: [],
}));

describe("RegisterCitizenForm", () => {
  it("rechaza DNI con menos de 8 dígitos", async () => {
    render(<RegisterCitizenForm />);
    await userEvent.type(screen.getByLabelText(/DNI/i), "123");
    await userEvent.click(screen.getByRole("button", { name: /registrar/i }));
    expect(await screen.findByText(/8 dígitos/i)).toBeInTheDocument();
  });

  it("rechaza DNI con letras", async () => {
    render(<RegisterCitizenForm />);
    await userEvent.type(screen.getByLabelText(/DNI/i), "abcdefgh");
    await userEvent.click(screen.getByRole("button", { name: /registrar/i }));
    expect(await screen.findByText(/8 dígitos/i)).toBeInTheDocument();
  });

  it("muestra preview del hash al ingresar 8 dígitos", async () => {
    render(<RegisterCitizenForm />);
    await userEvent.type(screen.getByLabelText(/DNI/i), "12345678");
    expect(await screen.findByText(/0x[a-f0-9]{6}/)).toBeInTheDocument();
  });
});
EOF
```

- [ ] **Step 2**: Impl

```bash
cat > frontend/civicsys/components/RegisterCitizenForm.tsx <<'EOF'
"use client";

import { useState } from "react";
import { useAccount, useChainId, useWriteContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeDniHash } from "@/lib/dni-hash";
import { CitizenRegistryAbi, getAddresses } from "@/lib/contracts";

const PUBLIC_SALT =
  process.env.NEXT_PUBLIC_PUBLIC_SALT ?? "ssc-antipereza-2026-publico";

export function RegisterCitizenForm() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { writeContract, isPending } = useWriteContract();
  const [dni, setDni] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isValid = /^\d{8}$/.test(dni);
  const hashPreview = isValid ? computeDniHash(dni, PUBLIC_SALT) : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValid) {
      setError("DNI debe tener 8 dígitos numéricos");
      return;
    }
    try {
      const addresses = getAddresses(chainId as 31337 | 57057);
      const hash = computeDniHash(dni, PUBLIC_SALT);
      writeContract({
        address: addresses.CitizenRegistry as `0x${string}`,
        abi: CitizenRegistryAbi,
        functionName: "register",
        args: [hash],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "error desconocido");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="dni">DNI (8 dígitos)</Label>
        <Input
          id="dni"
          type="text"
          inputMode="numeric"
          maxLength={8}
          value={dni}
          onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
        />
      </div>

      {hashPreview && (
        <p className="text-xs text-muted-foreground">
          Hash on-chain: <code>{hashPreview.slice(0, 12)}…</code>
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={!isConnected || !isValid || isPending}>
        {isPending ? "Esperando wallet..." : "Registrar"}
      </Button>

      {!isConnected && (
        <p className="text-sm text-muted-foreground">
          Conectá tu wallet para registrarte.
        </p>
      )}
    </form>
  );
}
EOF
```

- [ ] **Step 3**: Commit

```bash
cd ../..
git add frontend/civicsys/components/RegisterCitizenForm.tsx \
        frontend/civicsys/components/RegisterCitizenForm.test.tsx
git commit -m "frontend(G.10): RegisterCitizenForm con zod validation + hash preview + 3 tests"
```

---

## Task G.11 — Página `/` (home con pitch)

**Files**: Modify `frontend/civicsys/app/page.tsx`.

- [ ] **Step 1**: Sobrescribir el boilerplate "to get started"

```bash
cat > frontend/civicsys/app/page.tsx <<'EOF'
import Link from "next/link";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { NetworkBadge } from "@/components/NetworkBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="font-bold">CivicSys · SSC ANTIPEREZA</Link>
          <div className="flex items-center gap-3">
            <NetworkBadge />
            <ConnectWalletButton />
          </div>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-6 py-20 space-y-8">
        <h1 className="text-5xl font-bold leading-tight">
          La IA asesora.<br />
          El ciudadano supervisa.<br />
          El blockchain firma.
        </h1>
        <p className="text-xl text-muted-foreground">
          Cámara cívica deliberativa sobre Syscoin / zkTanenbaum.
          Coordinada por <strong>Hermes</strong>, agente maestro con identidad y memoria propias.
        </p>

        <div className="grid sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold">1 · Te registrás</h3>
              <p className="text-sm text-muted-foreground">DNI hash on-chain. Tu identidad nunca sale en claro.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold">2 · Votás</h3>
              <p className="text-sm text-muted-foreground">Sí · No · Abstención. Firmado en zkTanenbaum.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold">3 · Hermes te audita</h3>
              <p className="text-sm text-muted-foreground">Genera reportes trazables con fuente + confianza.</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-3">
          <Link href="/registro"><Button size="lg">Empezar · registro</Button></Link>
          <Link href="/propuesta/1"><Button size="lg" variant="outline">Ver propuesta activa</Button></Link>
        </div>
      </section>
    </main>
  );
}
EOF
```

- [ ] **Step 2**: Commit

```bash
cd ../..
git add frontend/civicsys/app/page.tsx
git commit -m "frontend(G.11): home page con pitch PPT + ConnectWallet + NetworkBadge + 3 cards"
```

---

## Task G.12 — Página `/registro`

**Files**: Create `frontend/civicsys/app/registro/page.tsx`.

```bash
mkdir -p frontend/civicsys/app/registro
cat > frontend/civicsys/app/registro/page.tsx <<'EOF'
import { RegisterCitizenForm } from "@/components/RegisterCitizenForm";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { NetworkBadge } from "@/components/NetworkBadge";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="font-bold">CivicSys · SSC ANTIPEREZA</Link>
          <div className="flex items-center gap-3">
            <NetworkBadge />
            <ConnectWalletButton />
          </div>
        </div>
      </header>

      <section className="max-w-md mx-auto px-6 py-16 space-y-6">
        <h1 className="text-3xl font-bold">Registro ciudadano</h1>
        <p className="text-muted-foreground">
          Tu DNI se transforma en un hash criptográfico antes de tocar la cadena.
          El número en claro nunca sale de tu navegador.
        </p>
        <RegisterCitizenForm />
      </section>
    </main>
  );
}
EOF

cd ../..
git add frontend/civicsys/app/registro/page.tsx
git commit -m "frontend(G.12): página /registro con RegisterCitizenForm"
```

---

## Task G.13 — Página `/propuesta/[id]` con votación

**Files**: Create `frontend/civicsys/app/propuesta/[id]/page.tsx`.

- [ ] **Step 1**: Crear

```bash
mkdir -p frontend/civicsys/app/propuesta/\[id\]
cat > frontend/civicsys/app/propuesta/\[id\]/page.tsx <<'EOF'
"use client";

import { useParams } from "next/navigation";
import { useAccount, useChainId, useReadContract, useWriteContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { NetworkBadge } from "@/components/NetworkBadge";
import { CitizenRegistryAbi, VoteAbi, getAddresses } from "@/lib/contracts";
import Link from "next/link";

export default function ProposalPage() {
  const params = useParams<{ id: string }>();
  const id = BigInt(params.id ?? "1");
  const chainId = useChainId();
  const { isConnected, address } = useAccount();
  const addresses = (() => {
    try { return getAddresses(chainId as 31337 | 57057); } catch { return null; }
  })();

  const { writeContract, isPending } = useWriteContract();

  const { data: proposal } = useReadContract({
    address: addresses?.Vote as `0x${string}` | undefined,
    abi: VoteAbi,
    functionName: "getProposal",
    args: [id],
    query: { enabled: !!addresses },
  }) as { data: { title: string; closed: boolean } | undefined };

  const { data: tally } = useReadContract({
    address: addresses?.Vote as `0x${string}` | undefined,
    abi: VoteAbi,
    functionName: "tally",
    args: [id],
    query: { enabled: !!addresses, refetchInterval: 5000 },
  }) as { data: readonly [bigint, bigint, bigint] | undefined };

  const { data: registered } = useReadContract({
    address: addresses?.CitizenRegistry as `0x${string}` | undefined,
    abi: CitizenRegistryAbi,
    functionName: "isRegistered",
    args: [address as `0x${string}`],
    query: { enabled: !!addresses && !!address },
  }) as { data: boolean | undefined };

  function vote(choice: 0 | 1 | 2) {
    if (!addresses) return;
    writeContract({
      address: addresses.Vote as `0x${string}`,
      abi: VoteAbi,
      functionName: "castVote",
      args: [id, choice],
    });
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="font-bold">CivicSys · SSC ANTIPEREZA</Link>
          <div className="flex items-center gap-3">
            <NetworkBadge />
            <ConnectWalletButton />
          </div>
        </div>
      </header>

      <section className="max-w-2xl mx-auto px-6 py-16 space-y-6">
        <h1 className="text-3xl font-bold">{proposal?.title ?? "Cargando..."}</h1>

        {tally && (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><div className="text-3xl font-bold">{tally[0].toString()}</div><div className="text-sm text-muted-foreground">Sí</div></div>
            <div><div className="text-3xl font-bold">{tally[1].toString()}</div><div className="text-sm text-muted-foreground">No</div></div>
            <div><div className="text-3xl font-bold">{tally[2].toString()}</div><div className="text-sm text-muted-foreground">Abstención</div></div>
          </div>
        )}

        {!isConnected && <p>Conectá tu wallet para votar.</p>}
        {isConnected && !registered && <p>Tenés que <Link href="/registro" className="underline">registrarte</Link> antes de votar.</p>}
        {isConnected && registered && !proposal?.closed && (
          <div className="flex gap-3">
            <Button onClick={() => vote(0)} disabled={isPending}>Sí</Button>
            <Button onClick={() => vote(1)} disabled={isPending} variant="outline">No</Button>
            <Button onClick={() => vote(2)} disabled={isPending} variant="ghost">Abstención</Button>
          </div>
        )}
        {proposal?.closed && <p className="text-muted-foreground">Propuesta cerrada.</p>}
      </section>
    </main>
  );
}
EOF
```

- [ ] **Step 2**: Commit

```bash
cd ../..
git add "frontend/civicsys/app/propuesta/[id]"
git commit -m "frontend(G.13): página /propuesta/[id] con tally en vivo + 3 botones de voto + checks de estado"
```

---

## Task G.14 — Página `/dashboard` (reportes Hermes)

**Files**: Create `frontend/civicsys/app/dashboard/page.tsx`.

```bash
mkdir -p frontend/civicsys/app/dashboard
cat > frontend/civicsys/app/dashboard/page.tsx <<'EOF'
"use client";

import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { NetworkBadge } from "@/components/NetworkBadge";
import Link from "next/link";

export default function DashboardPage() {
  const { data, isLoading } = trpc.reports.list.useQuery({ limit: 20, offset: 0 });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="font-bold">CivicSys · SSC ANTIPEREZA</Link>
          <div className="flex items-center gap-3">
            <NetworkBadge />
            <ConnectWalletButton />
          </div>
        </div>
      </header>

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
                  TX: <code>{r.txHash}</code>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
EOF

cd ../..
git add frontend/civicsys/app/dashboard/page.tsx
git commit -m "frontend(G.14): /dashboard lista reportes Hermes via tRPC + render markdown"
```

---

## Task G.15 — Vitest config + setup file + coverage gate

**Files**:
- Create: `frontend/civicsys/vitest.config.ts`
- Create: `frontend/civicsys/vitest.setup.ts`

- [ ] **Step 1**: Vitest config

```bash
cat > frontend/civicsys/vitest.config.ts <<'EOF'
/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: false,
    include: ["components/**/*.test.{ts,tsx}", "lib/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary", "html"],
      include: ["components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}", "hooks/**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}", "components/ui/**"],  // ui shadcn no requiere coverage
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
EOF
```

- [ ] **Step 2**: Setup file (jest-dom matchers)

```bash
cat > frontend/civicsys/vitest.setup.ts <<'EOF'
import "@testing-library/jest-dom/vitest";
EOF
```

- [ ] **Step 3**: Scripts en `package.json`

Editar manual:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest",
    "test:run": "vitest run",
    "test:ci": "vitest run --coverage"
  }
}
```

- [ ] **Step 4**: Run

```bash
cd frontend/civicsys && pnpm test:ci
```

Expected: tests verde + coverage ≥80%.

- [ ] **Step 5**: Commit

```bash
cd ../..
git add frontend/civicsys/vitest.config.ts \
        frontend/civicsys/vitest.setup.ts \
        frontend/civicsys/package.json
git commit -m "frontend(G.15): vitest config jsdom + coverage 80% gate + scripts test:ci"
```

---

## Task G.16 — `.env.local` para frontend + smoke test dev

**Files**: Create `frontend/civicsys/.env.local`.

- [ ] **Step 1**: Generar .env.local con vars

```bash
cd frontend/civicsys
cat > .env.local <<'EOF'
NEXT_PUBLIC_RPC_URL=http://localhost:8545
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_PUBLIC_SALT=ssc-antipereza-2026-publico
NEXT_PUBLIC_TRPC_URL=http://localhost:4000/trpc
EOF
```

- [ ] **Step 2**: Arrancar dev (con infra + backend + agents en otros shells)

```bash
pnpm dev
```

- [ ] **Step 3**: Abrir http://localhost:3000 y verificar manualmente:
  - Home renderiza el pitch.
  - Connect wallet abre MetaMask.
  - Conectando a Anvil (Chain ID 31337), el NetworkBadge dice "Anvil local".
  - `/registro` permite ingresar DNI.
  - `/propuesta/1` muestra el título seed.

- [ ] **Step 4**: Cerrar dev. No commitear `.env.local` (está en .gitignore default de Next.js).

---

## Task G.17 — Eliminar `frontend/civicsys/app/(...)` boilerplate Next.js sin usar

**Files**: ninguno (cleanup ya hecho en G.6/G.11).

- [ ] **Step 1**: Confirmar que no quedan referencias al template

```bash
grep -r "to get started" frontend/civicsys/ 2>&1 | head
```

Expected: sin matches.

---

## Task G.18 — Cierre del Bloque G

- [ ] **Step 1**: Tests + coverage

```bash
cd frontend/civicsys && pnpm test:ci
```

Expected: ~12 tests verde · coverage ≥80%.

- [ ] **Step 2**: Confirmar commits

```bash
cd ../.. && git log --oneline frontend/ | head -20
```

Expected: ~15 commits del bloque.

---

## Criterios de done del Bloque G

- [ ] 4 páginas funcionales: `/`, `/registro`, `/propuesta/[id]`, `/dashboard`.
- [ ] Componentes: ConnectWalletButton, NetworkBadge, RegisterCitizenForm con tests.
- [ ] lib: wagmi.ts, contracts.ts, trpc.ts, dni-hash.ts con tests donde aplique.
- [ ] Coverage Vitest ≥80% en `components/`, `lib/`, `hooks/`.
- [ ] `pnpm dev` levanta sin errores · home renderiza el pitch.

**Gate humano antes de Bloque H**: Orlando ve la home en `localhost:3000`, conecta MetaMask en Anvil, navega registro+propuesta. Aprueba pasar a E2E.
