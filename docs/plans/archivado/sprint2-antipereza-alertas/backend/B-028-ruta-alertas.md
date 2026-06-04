# B-028 · Crear ruta y controlador para alertas

**id:** B-028
**title:** Crear ruta y controlador para alertas
**owner:** [Responsable]
**backup:** [Backup/Pair]
**effort:** 20 min
**priority:** P0
**status:** pending
**depends_on:** B-019, B-020, B-021
**sprint:** 1
**layer:** backend

---

## Por qué importa
Expone la funcionalidad de alertas a través de la API.

## Conceptos clave
- Rutas
- Controladores

## Pre-requisitos
- Servicio de alertas implementado

## Paso a paso
1. Crear archivo routers/alertas.ts.
2. Implementar endpoints para listar, agregar y consultar alertas.

## Verificación / Definition of Done
- Endpoints funcionales y documentados.

## Errores comunes
- No validar correctamente los datos de entrada.

## Lecturas
- https://expressjs.com/es/guide/routing.html

## Notas para revisor
- Confirmar que los endpoints cumplen con los tipos y validaciones.