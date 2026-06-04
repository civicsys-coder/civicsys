# B-031 · Crear ruta y controlador de health check

**id:** B-031
**title:** Crear ruta y controlador de health check
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
Permite monitorear el estado del backend y la conexión blockchain.

## Conceptos clave
- Health check
- API

## Pre-requisitos
- Proyecto Node.js y TypeScript inicializado

## Paso a paso
1. Crear archivo routers/health.ts.
2. Implementar endpoint GET /health que verifique estado del backend y blockchain.

## Verificación / Definition of Done
- Endpoint funcional y retorna status 200 si todo está OK.

## Errores comunes
- No verificar correctamente la conexión a la blockchain.

## Lecturas
- https://expressjs.com/es/guide/routing.html

## Notas para revisor
- Confirmar que el endpoint verifica todos los servicios críticos.