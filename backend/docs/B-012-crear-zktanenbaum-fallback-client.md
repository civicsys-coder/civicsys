# B-012 · Crear cliente viem de fallback para zkTanenbaum en /lib/zkTanenbaumFallbackClient.ts

**id:** B-012
**title:** Crear cliente viem de fallback para zkTanenbaum (RPC secundario)
**owner:** [Responsable]
**backup:** [Backup/Pair]
**effort:** 15 min
**priority:** P1
**status:** pending
**depends_on:** B-011
**sprint:** 1
**layer:** backend

---

## Por qué importa
El RPC principal de zkTanenbaum puede caerse o saturarse durante la demo. Tener un cliente de fallback evita que la app quede inservible si el RPC primario falla.

## Conceptos clave
- viem
- zkTanenbaum (Chain ID 57057)
- Fallback RPC / failover

## Pre-requisitos
- B-011 completada (cliente primario funcionando)
- .env con `RPC_FALLBACK` definido (RPC alternativo de zkTanenbaum)

## Paso a paso
1. Crear archivo /lib/zkTanenbaumFallbackClient.ts.
2. Reusar la chain custom definida en B-011 (Chain ID 57057, símbolo TSYS).
3. Crear el cliente viem (`createPublicClient`) usando `process.env.RPC_FALLBACK`.
4. Exportar un helper `getClient()` que devuelva el primario y caiga al fallback si el primario falla (timeout / error).

## Verificación / Definition of Done
- Cliente fallback funcional y exportado.
- Al apagar el RPC primario en local (o usar una URL inválida), el helper sigue respondiendo gracias al fallback.

## Errores comunes
- Definir un chainId distinto al primario (deben coincidir: ambos son 57057).
- No manejar el timeout del RPC primario — si nunca falla rápido, el fallback no se usa.

## Lecturas
- https://viem.sh/docs/clients/transports/fallback
- https://viem.sh/docs/clients/

## Notas para revisor
- Confirmar que ambos clientes (primario y fallback) reportan el mismo `chainId === 57057`.
- Confirmar que un RPC inválido en `RPC_PRIMARY` no rompe la app si `RPC_FALLBACK` es válido.
