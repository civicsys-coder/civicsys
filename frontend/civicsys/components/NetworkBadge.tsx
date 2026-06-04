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
  return <Badge>{name}</Badge>;
}
