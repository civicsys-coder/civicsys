# B-029 · Crear ruta y controlador para Sentry Nodes

**id:** B-029
**title:** Crear ruta y controlador para Sentry Nodes
**owner:** [Responsable]
**backup:** [Backup/Pair]
**effort:** 20 min
**priority:** P0
**status:** pending
**depends_on:** B-022, B-023, B-024
**sprint:** 1
**layer:** backend

---

## Por qué importa
Expone la funcionalidad de Sentry Nodes a través de la API.

## Conceptos clave
- Rutas
- Controladores

## Pre-requisitos
- Servicio de Sentry Nodes implementado

## Paso a paso
1. Crear archivo routers/sentry.ts.
2. Implementar endpoints para listar, agregar y consultar Sentry Nodes.

## Verificación / Definition of Done
- Endpoints funcionales y documentados.

## Errores comunes
- No validar correctamente los datos de entrada.

## Lecturas
- https://expressjs.com/es/guide/routing.html

## Notas para revisor
- Confirmar que los endpoints cumplen con los tipos y validaciones.