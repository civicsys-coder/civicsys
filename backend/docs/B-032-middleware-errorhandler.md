# B-032 · Implementar middleware errorHandler

**id:** B-032
**title:** Implementar middleware errorHandler
**owner:** [Responsable]
**backup:** [Backup/Pair]
**effort:** 10 min
**priority:** P0
**status:** pending
**depends_on:** B-001
**sprint:** 1
**layer:** backend

---

## Por qué importa
Centraliza el manejo de errores y mejora la robustez de la API.

## Conceptos clave
- Middleware
- Manejo de errores

## Pre-requisitos
- Proyecto Node.js y TypeScript inicializado

## Paso a paso
1. Crear archivo middlewares/errorHandler.ts.
2. Implementar función que capture errores y retorne respuesta estándar.

## Verificación / Definition of Done
- Middleware usado en el servidor principal.

## Errores comunes
- No capturar errores asíncronos correctamente.

## Lecturas
- https://expressjs.com/es/guide/error-handling.html

## Notas para revisor
- Confirmar que todos los errores pasan por este middleware.