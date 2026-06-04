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
