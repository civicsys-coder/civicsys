# B-026 · Implementar función addEventoAuditoria en auditoriaService.ts

**id:** B-026
**title:** Implementar función addEventoAuditoria en auditoriaService.ts
**owner:** [Responsable]
**backup:** [Backup/Pair]
**effort:** 20 min
**priority:** P0
**status:** pending
**depends_on:** B-025
**sprint:** 1
**layer:** backend

---

## Por qué importa
Permite registrar nuevos eventos de auditoría on-chain desde la API.

## Conceptos clave
- Escritura de contratos
- Servicio

## Pre-requisitos
- Función getEventosAuditoria implementada

## Paso a paso
1. Implementar función addEventoAuditoria en auditoriaService.ts.
2. Usar cliente viem y tipos para enviar la transacción.

## Verificación / Definition of Done
- Evento de auditoría agregado correctamente en la blockchain.

## Errores comunes
- No manejar errores de transacción.

## Lecturas
- https://viem.sh/docs/contract/writeContract.html

## Notas para revisor
- Confirmar que la función maneja errores y retorna el hash de la transacción.