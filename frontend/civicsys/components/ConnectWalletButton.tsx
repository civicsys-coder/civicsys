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
        <span className="text-sm font-mono">{truncate(address)}</span>
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
