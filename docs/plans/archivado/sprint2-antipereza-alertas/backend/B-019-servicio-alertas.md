# B-019 · Crear alertasService.ts y función getAlertas

**id:** B-019
**title:** Crear alertasService.ts y función getAlertas
**owner:** [Responsable]
**backup:** [Backup/Pair]
**effort:** 20 min
**priority:** P0
**status:** pending
**depends_on:** B-011, B-013, B-016, B-018
**sprint:** 1
**layer:** backend

---

## Por qué importa
Permite consultar alertas on-chain y exponerlas a la API.

## Conceptos clave
- Servicio
- Lectura de contratos

## Pre-requisitos
- Cliente viem y ABI configurados

## Paso a paso
1. Crear archivo services/alertasService.ts.
2. Implementar función getAlertas usando readContract y AlertasABI.

## Verificación / Definition of Done
- Función retorna array de alertas correctamente tipado.

## Errores comunes
- No mapear correctamente los datos del contrato a los tipos.

## Lecturas
- https://viem.sh/docs/contract/readContract.html

## Notas para revisor
- Confirmar que la función retorna datos válidos y tipados.