# B-010 · Configurar script dev con tsx watch

**id:** B-010
**title:** Configurar script dev con tsx watch
**owner:** [Responsable]
**backup:** [Backup/Pair]
**effort:** 5 min
**priority:** P0
**status:** pending
**depends_on:** B-001, B-009
**sprint:** 1
**layer:** backend

---

## Por qué importa
Permite desarrollo rápido con recarga automática al guardar cambios.

## Conceptos clave
- tsx
- Hot reload

## Pre-requisitos
- TypeScript y tsx instalados

## Paso a paso
1. Instalar tsx como devDependency.
2. Agregar script dev en package.json: "dev": "tsx watch src/server.ts"

## Verificación / Definition of Done
- El backend se reinicia automáticamente al guardar cambios.

## Errores comunes
- No instalar tsx como devDependency.

## Lecturas
- https://github.com/esbuild/tsx

## Notas para revisor
- Confirmar que el script dev funciona correctamente.