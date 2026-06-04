# B-030 · Crear ruta y controlador para auditoría

**id:** B-030
**title:** Crear ruta y controlador para auditoría
**owner:** [Responsable]
**backup:** [Backup/Pair]
**effort:** 20 min
**priority:** P0
**status:** pending
**depends_on:** B-025, B-026
**sprint:** 1
**layer:** backend

---

## Por qué importa
Expone la funcionalidad de auditoría a través de la API.

## Conceptos clave
- Rutas
- Controladores

## Pre-requisitos
- Servicio de auditoría implementado

## Paso a paso
1. Crear archivo routers/auditoria.ts.
2. Implementar endpoints para listar y agregar eventos de auditoría.

## Verificación / Definition of Done
- Endpoints funcionales y documentados.

## Errores comunes
- No validar correctamente los datos de entrada.

## Lecturas
- https://expressjs.com/es/guide/routing.html

## Notas para revisor
- Confirmar que los endpoints cumplen con los tipos y validaciones.