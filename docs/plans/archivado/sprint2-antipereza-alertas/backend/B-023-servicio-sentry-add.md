# B-023 · Implementar función addSentryNode en sentryService.ts

**id:** B-023
**title:** Implementar función addSentryNode en sentryService.ts
**owner:** [Responsable]
**backup:** [Backup/Pair]
**effort:** 20 min
**priority:** P0
**status:** pending
**depends_on:** B-022
**sprint:** 1
**layer:** backend

---

## Por qué importa
Permite registrar nuevos Sentry Nodes on-chain desde la API.

## Conceptos clave
- Escritura de contratos
- Servicio

## Pre-requisitos
- Función getSentryNodes implementada

## Paso a paso
1. Implementar función addSentryNode en sentryService.ts.
2. Usar cliente viem y SentryABI para enviar la transacción.

## Verificación / Definition of Done
- SentryNode agregado correctamente en la blockchain.

## Errores comunes
- No manejar errores de transacción.

## Lecturas
- https://viem.sh/docs/contract/writeContract.html

## Notas para revisor
- Confirmar que la función maneja errores y retorna el hash de la transacción.