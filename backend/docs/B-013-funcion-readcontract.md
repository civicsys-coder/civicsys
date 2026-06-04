# B-013 · Crear función utilitaria readContract genérica

**id:** B-013
**title:** Crear función utilitaria readContract genérica
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
Facilita la lectura de datos de cualquier contrato desde los servicios.

## Conceptos clave
- viem
- Smart contracts

## Pre-requisitos
- Clientes viem configurados

## Paso a paso
1. Crear función readContract en /lib.
2. Permitir pasar address, abi, método y argumentos.

## Verificación / Definition of Done
- Función usable desde cualquier servicio.

## Errores comunes
- No tipar correctamente los argumentos.

## Lecturas
- https://viem.sh/docs/contract/readContract.html

## Notas para revisor
- Confirmar que la función es reutilizable y genérica.