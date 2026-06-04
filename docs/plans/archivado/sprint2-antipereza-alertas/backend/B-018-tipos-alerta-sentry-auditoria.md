# B-018 · Crear tipos TypeScript: Alerta, SentryNode, EventoAuditoria, ApiResponse<T>

**id:** B-018
**title:** Crear tipos TypeScript: Alerta, SentryNode, EventoAuditoria, ApiResponse<T>
**owner:** [Responsable]
**backup:** [Backup/Pair]
**effort:** 15 min
**priority:** P0
**status:** pending
**depends_on:** B-001
**sprint:** 1
**layer:** backend

---

## Por qué importa
Estandariza la estructura de datos y respuestas en todo el backend.

## Conceptos clave
- TypeScript types
- Tipado estricto

## Pre-requisitos
- Proyecto Node.js y TypeScript inicializado

## Paso a paso
1. Crear archivo /types/index.ts.
2. Definir los tipos Alerta, SentryNode, EventoAuditoria, ApiResponse<T>.

## Verificación / Definition of Done
- Tipos exportados y usados en servicios y controladores.

## Errores comunes
- No mantener los tipos sincronizados con los datos reales.

## Lecturas
- https://www.typescriptlang.org/docs/handbook/2/types-from-types.html

## Notas para revisor
- Confirmar que los tipos se usan en todo el backend.