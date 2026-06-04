# B-004 · Instalar dotenv para variables de entorno

**id:** B-004
**title:** Instalar dotenv para variables de entorno
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
Permite manejar variables sensibles y de entorno de forma segura y flexible.

## Conceptos clave
- dotenv
- Variables de entorno

## Pre-requisitos
- Proyecto Node.js inicializado

## Paso a paso
1. Instalar dotenv con npm.
2. Crear archivo .env y cargarlo en app.ts.

## Verificación / Definition of Done
- Variables de entorno accesibles en process.env.

## Errores comunes
- No cargar dotenv antes de usar process.env.

## Lecturas
- https://www.npmjs.com/package/dotenv

## Notas para revisor
- Confirmar que las variables se leen correctamente desde .env.