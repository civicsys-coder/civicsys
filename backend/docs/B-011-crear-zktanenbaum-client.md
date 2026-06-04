# B-011 · Crear cliente viem para zkTanenbaum en /lib/zkTanenbaumClient.ts

**id:** B-011
**title:** Crear cliente viem para zkTanenbaum en /lib/zkTanenbaumClient.ts
**owner:** [Responsable]
**backup:** [Backup/Pair]
**effort:** 15 min
**priority:** P0
**status:** pending
**depends_on:** B-003, B-007
**sprint:** 1
**layer:** backend

---

## Por qué importa
Permite interactuar con la blockchain zkSYS Testnet (zkTanenbaum, Chain ID 57057) desde el backend. Es la red destino del proyecto: una zkRollup-Validium sobre Syscoin L1.

## Conceptos clave
- viem
- zkTanenbaum (Chain ID 57057, RPC https://rpc-zk.tanenbaum.io, símbolo TSYS)

## Pre-requisitos
- viem instalado
- .env configurado (`RPC_PRIMARY` apuntando a zkTanenbaum)

## Paso a paso
1. Crear archivo /lib/zkTanenbaumClient.ts.
2. Definir la chain custom de zkTanenbaum (id 57057, símbolo TSYS, RPC desde `process.env.RPC_PRIMARY`).
3. Crear el cliente viem (`createPublicClient`) y exportarlo para uso en servicios.

## Verificación / Definition of Done
- Cliente funcional y exportado.
- `await client.getChainId()` devuelve `57057`.

## Errores comunes
- No leer la URL desde process.env.
- Confundir zkTanenbaum con Rollux o NEVM — son redes distintas del mismo ecosistema Syscoin.

## Lecturas
- https://viem.sh/docs/clients/
- https://docs.syscoin.org/docs/syscoin-zk-rollups

## Notas para revisor
- Confirmar que el cliente conecta correctamente a zkTanenbaum (`chainId === 57057`).
