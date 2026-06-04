# B-021 · Implementar función getAlertaById en alertasService.ts

**id:** B-021
**title:** Implementar función getAlertaById en alertasService.ts
**owner:** [Responsable]
**backup:** [Backup/Pair]
**effort:** 15 min
**priority:** P0
**status:** pending
**depends_on:** B-019
**sprint:** 1
**layer:** backend

---

## Por qué importa
Permite consultar una alerta específica por su ID.

## Conceptos clave
- Servicio
- Lectura de contratos

## Pre-requisitos
- Función getAlertas implementada

## Paso a paso
1. Implementar función getAlertaById en alertasService.ts.
2. Usar readContract y AlertasABI para obtener la alerta.

## Verificación / Definition of Done
- Función retorna la alerta correctamente tipada.

## Errores comunes
- No validar la existencia de la alerta.

## Lecturas
- https://viem.sh/docs/contract/readContract.html

## Notas para revisor
- Confirmar que la función retorna null si no existe la alerta.