# B-027 · Implementar caché en memoria en /lib/cache.ts

**id:** B-027
**title:** Implementar caché en memoria en /lib/cache.ts
**owner:** [Responsable]
**backup:** [Backup/Pair]
**effort:** 20 min
**priority:** P1
**status:** pending
**depends_on:** B-001
**sprint:** 1
**layer:** backend

---

## Por qué importa
Mejora el rendimiento evitando llamadas repetidas a la blockchain.

## Conceptos clave
- Caché en memoria
- TTL (time to live)

## Pre-requisitos
- Proyecto Node.js y TypeScript inicializado

## Paso a paso
1. Crear archivo /lib/cache.ts.
2. Implementar funciones setCache, getCache, clearCache con TTL.

## Verificación / Definition of Done
- Funciones exportadas y usadas en servicios.

## Errores comunes
- No limpiar correctamente el caché expirado.

## Lecturas
- https://nodejs.org/api/timers.html

## Notas para revisor
- Confirmar que el caché expira correctamente.