# B-007 · Configurar .env con RPC URL de zkTanenbaum (primario + fallback)

**id:** B-007
**title:** Configurar .env con RPC URL de zkTanenbaum (primario + fallback)
**owner:** [Responsable]
**backup:** [Backup/Pair]
**effort:** 5 min
**priority:** P0
**status:** pending
**depends_on:** B-004
**sprint:** 1
**layer:** backend

---

## Por qué importa
Permite separar y proteger las URLs de los nodos blockchain y otras variables sensibles.

## Conceptos clave
- Variables de entorno
- Seguridad

## Pre-requisitos
- dotenv instalado

## Paso a paso
1. Crear archivo .env en la raíz de backend.
2. Agregar `RPC_PRIMARY=https://rpc-zk.tanenbaum.io` y `RPC_FALLBACK=` (RPC alternativo de zkTanenbaum, si se consigue uno).

## Verificación / Definition of Done
- Variables accesibles desde process.env.

## Errores comunes
- No agregar .env al .gitignore.

## Lecturas
- https://12factor.net/config

## Notas para revisor
- Confirmar que .env no está en el repo.