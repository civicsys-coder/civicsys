# B-033 · Implementar middleware requestLogger

**id:** B-033
**title:** Implementar middleware requestLogger
**owner:** [Responsable]
**backup:** [Backup/Pair]
**effort:** 10 min
**priority:** P1
**status:** pending
**depends_on:** B-001
**sprint:** 1
**layer:** backend

---

## Por qué importa
Permite auditar y monitorear las peticiones recibidas por la API.

## Conceptos clave
- Middleware
- Logging

## Pre-requisitos
- Proyecto Node.js y TypeScript inicializado

## Paso a paso
1. Crear archivo middlewares/requestLogger.ts.
2. Implementar función que loguee método, ruta y tiempo de respuesta.

## Verificación / Definition of Done
- Middleware usado en el servidor principal.

## Errores comunes
- No medir correctamente el tiempo de respuesta.

## Lecturas
- https://expressjs.com/es/guide/using-middleware.html

## Notas para revisor
- Confirmar que el log incluye método, ruta y duración.