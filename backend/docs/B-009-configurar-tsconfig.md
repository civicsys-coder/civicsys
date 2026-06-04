# B-009 · Configurar tsconfig.json

**id:** B-009
**title:** Configurar tsconfig.json
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
Permite compilar TypeScript correctamente y definir reglas de proyecto.

## Conceptos clave
- tsconfig.json
- TypeScript

## Pre-requisitos
- TypeScript instalado

## Paso a paso
1. Crear o editar tsconfig.json en la raíz del backend.
2. Configurar paths, outDir, rootDir y opciones strict.

## Verificación / Definition of Done
- El proyecto compila sin errores con npx tsc.

## Errores comunes
- No incluir todas las carpetas relevantes en include.

## Lecturas
- https://www.typescriptlang.org/tsconfig

## Notas para revisor
- Confirmar que la configuración es estricta y moderna.