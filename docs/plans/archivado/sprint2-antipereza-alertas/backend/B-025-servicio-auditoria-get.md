# B-025 · Crear auditoriaService.ts y función getEventosAuditoria

**id:** B-025
**title:** Crear auditoriaService.ts y función getEventosAuditoria
**owner:** [Responsable]
**backup:** [Backup/Pair]
**effort:** 20 min
**priority:** P0
**status:** pending
**depends_on:** B-011, B-013, B-018
**sprint:** 1
**layer:** backend

---

## Por qué importa
Permite consultar eventos de auditoría registrados en la blockchain.

## Conceptos clave
- Servicio
- Lectura de contratos

## Pre-requisitos
- Cliente viem y tipos configurados

## Paso a paso
1. Crear archivo services/auditoriaService.ts.
2. Implementar función getEventosAuditoria usando getLogs y tipos.

## Verificación / Definition of Done
- Función retorna array de EventoAuditoria correctamente tipado.

## Errores comunes
- No mapear correctamente los logs a los tipos.

## Lecturas
- https://viem.sh/docs/actions/public/getLogs.html

## Notas para revisor
- Confirmar que la función retorna datos válidos y tipados.