# B-020 · Implementar función addAlerta en alertasService.ts

**id:** B-020
**title:** Implementar función addAlerta en alertasService.ts
**owner:** [Responsable]
**backup:** [Backup/Pair]
**effort:** 20 min
**priority:** P0
**status:** pending
**depends_on:** B-019
**sprint:** 1
**layer:** backend

---

## Por qué importa
Permite agregar nuevas alertas on-chain desde la API.

## Conceptos clave
- Escritura de contratos
- Servicio

## Pre-requisitos
- Función getAlertas implementada

## Paso a paso
1. Implementar función addAlerta en alertasService.ts.
2. Usar cliente viem y AlertasABI para enviar la transacción.

## Verificación / Definition of Done
- Alerta agregada correctamente en la blockchain.

## Errores comunes
- No manejar errores de transacción.

## Lecturas
- https://viem.sh/docs/contract/writeContract.html

## Notas para revisor
- Confirmar que la función maneja errores y retorna el hash de la transacción.