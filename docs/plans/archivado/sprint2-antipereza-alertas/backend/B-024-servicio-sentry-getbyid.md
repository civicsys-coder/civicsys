# B-024 · Implementar función getSentryNodeById en sentryService.ts

**id:** B-024
**title:** Implementar función getSentryNodeById en sentryService.ts
**owner:** [Responsable]
**backup:** [Backup/Pair]
**effort:** 15 min
**priority:** P0
**status:** pending
**depends_on:** B-022
**sprint:** 1
**layer:** backend

---

## Por qué importa
Permite consultar un Sentry Node específico por su ID.

## Conceptos clave
- Servicio
- Lectura de contratos

## Pre-requisitos
- Función getSentryNodes implementada

## Paso a paso
1. Implementar función getSentryNodeById en sentryService.ts.
2. Usar readContract y SentryABI para obtener el nodo.

## Verificación / Definition of Done
- Función retorna el nodo correctamente tipado.

## Errores comunes
- No validar la existencia del nodo.

## Lecturas
- https://viem.sh/docs/contract/readContract.html

## Notas para revisor
- Confirmar que la función retorna null si no existe el nodo.