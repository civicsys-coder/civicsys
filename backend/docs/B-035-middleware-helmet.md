# B-035 · Implementar middleware helmet

**id:** B-035
**title:** Implementar middleware helmet
**owner:** [Responsable]
**backup:** [Backup/Pair]
**effort:** 5 min
**priority:** P1
**status:** pending
**depends_on:** B-001
**sprint:** 1
**layer:** backend

---

## Por qué importa
Mejora la seguridad de la API añadiendo cabeceras HTTP seguras.

## Conceptos clave
- Middleware
- Seguridad

## Pre-requisitos
- Proyecto Node.js y TypeScript inicializado

## Paso a paso
1. Instalar paquete helmet si es necesario.
2. Crear archivo middlewares/helmet.ts.
3. Configurar y exportar el middleware.

## Verificación / Definition of Done
- Middleware usado en el servidor principal.

## Errores comunes
- No configurar correctamente las políticas de seguridad.

## Lecturas
- https://expressjs.com/es/resources/middleware/helmet.html

## Notas para revisor
- Confirmar que el middleware está activo en producción.