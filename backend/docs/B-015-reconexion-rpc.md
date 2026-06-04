# B-015 · Manejar reconexión automática si el RPC falla

**id:** B-015
**title:** Manejar reconexión automática si el RPC falla
**owner:** [Responsable]
**backup:** [Backup/Pair]
**effort:** 15 min
**priority:** P0
**status:** pending
**depends_on:** B-011, B-012
**sprint:** 1
**layer:** backend

---

## Por qué importa
Aumenta la robustez del backend ante caídas temporales del nodo RPC.

## Conceptos clave
- Reconexión
- Tolerancia a fallos

## Pre-requisitos
- Clientes viem configurados

## Paso a paso
1. Implementar lógica de reconexión en los clientes o funciones utilitarias.
2. Probar desconexión y reconexión automática.

## Verificación / Definition of Done
- El backend se recupera automáticamente de caídas de RPC.

## Errores comunes
- No manejar correctamente los errores de conexión.

## Lecturas
- https://viem.sh/docs/clients/

## Notas para revisor
- Confirmar que la reconexión funciona en pruebas reales.