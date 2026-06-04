# B-034 · Implementar middleware CORS

**id:** B-034
**title:** Implementar middleware CORS
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
Permite que la API sea consumida desde el frontend y otros orígenes.

## Conceptos clave
- Middleware
- CORS

## Pre-requisitos
- Proyecto Node.js y TypeScript inicializado

## Paso a paso
1. Instalar paquete cors si es necesario.
2. Crear archivo middlewares/cors.ts.
3. Configurar y exportar el middleware.

## Verificación / Definition of Done
- Middleware usado en el servidor principal.

## Errores comunes
- No permitir los orígenes correctos.

## Lecturas
- https://expressjs.com/es/resources/middleware/cors.html

## Notas para revisor
- Confirmar que el middleware permite el frontend local.