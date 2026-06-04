# B-022 · Crear sentryService.ts y función getSentryNodes

**id:** B-022
**title:** Crear sentryService.ts y función getSentryNodes
**owner:** [Responsable]
**backup:** [Backup/Pair]
**effort:** 20 min
**priority:** P0
**status:** pending
**depends_on:** B-012, B-017, B-018
**sprint:** 1
**layer:** backend

---

## Por qué importa
Permite consultar los Sentry Nodes registrados en la blockchain.

## Conceptos clave
- Servicio
- Lectura de contratos

## Pre-requisitos
- Cliente viem y ABI configurados

## Paso a paso
1. Crear archivo services/sentryService.ts.
2. Implementar función getSentryNodes usando readContract y SentryABI.

## Verificación / Definition of Done
- Función retorna array de SentryNode correctamente tipado.

## Errores comunes
- No mapear correctamente los datos del contrato a los tipos.

## Lecturas
- https://viem.sh/docs/contract/readContract.html

## Notas para revisor
- Confirmar que la función retorna datos válidos y tipados.