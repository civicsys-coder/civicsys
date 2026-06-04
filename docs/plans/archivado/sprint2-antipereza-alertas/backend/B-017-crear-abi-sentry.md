# B-017 · Crear archivo abi/SentryABI.ts con el ABI del precompile 0x62

**id:** B-017
**title:** Crear archivo abi/SentryABI.ts con el ABI del precompile 0x62
**owner:** [Responsable]
**backup:** [Backup/Pair]
**effort:** 10 min
**priority:** P0
**status:** pending
**depends_on:** B-008
**sprint:** 1
**layer:** backend

---

## Por qué importa
Permite interactuar correctamente con el precompile 0x62 desde el backend.

## Conceptos clave
- ABI
- Precompile 0x62

## Pre-requisitos
- ABI exportado del precompile

## Paso a paso
1. Crear archivo abi/SentryABI.ts.
2. Copiar el ABI del precompile 0x62.

## Verificación / Definition of Done
- ABI disponible y exportado para uso en servicios.

## Errores comunes
- ABI desactualizado respecto al precompile real.

## Lecturas
- https://docs.ethers.org/v6/

## Notas para revisor
- Confirmar que el ABI corresponde al precompile real.