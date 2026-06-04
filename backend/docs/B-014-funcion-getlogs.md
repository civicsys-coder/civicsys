# B-014 · Crear función utilitaria getLogs para leer eventos por bloque

**id:** B-014
**title:** Crear función utilitaria getLogs para leer eventos por bloque
**owner:** [Responsable]
**backup:** [Backup/Pair]
**effort:** 15 min
**priority:** P0
**status:** pending
**depends_on:** B-011, B-012
**sprint:** 1
**layer:** backend

---

## Por qué importa
Permite obtener eventos históricos de contratos de forma eficiente.

## Conceptos clave
- viem
- Logs de eventos

## Pre-requisitos
- Clientes viem configurados

## Paso a paso
1. Crear función getLogs en /lib.
2. Permitir filtrar por address, topics y rango de bloques.

## Verificación / Definition of Done
- Función usable desde cualquier servicio.

## Errores comunes
- No manejar correctamente los filtros de logs.

## Lecturas
- https://viem.sh/docs/actions/public/getLogs.html

## Notas para revisor
- Confirmar que la función soporta filtros y rangos.