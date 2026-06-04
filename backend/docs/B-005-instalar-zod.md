# B-005 · Instalar zod para validación de requests

**id:** B-005
**title:** Instalar zod para validación de requests
**owner:** [Responsable]
**backup:** [Backup/Pair]
**effort:** 5 min
**priority:** P0
**status:** pending
**depends_on:** B-001
**sprint:** 1
**layer:** backend

---

## Por qué importa
Permite validar y tipar los datos de entrada de las rutas de la API.

## Conceptos clave
- zod
- Validación de datos

## Pre-requisitos
- Proyecto Node.js y TypeScript inicializado

## Paso a paso
1. Instalar zod con npm.
2. Probar validación de un objeto de ejemplo.

## Verificación / Definition of Done
- Validación funcional en un endpoint de prueba.

## Errores comunes
- No validar los datos antes de usarlos.

## Lecturas
- https://zod.dev/

## Notas para revisor
- Confirmar que los esquemas de zod funcionan en rutas reales.