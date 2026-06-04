# F-005 · Configurar variables de entorno (.env.local)

**id:** F-005  
**title:** Configurar variables de entorno (.env.local) con RPC URL  
**owner:** [Responsable]  
**backup:** [Backup/Pair]  
**effort:** 10 min  
**priority:** P0  
**status:** pending  
**depends_on:** F-001  
**sprint:** 1  
**layer:** frontend

---

## Por qué importa
Permite separar datos sensibles y de entorno, como la URL RPC de zkTanenbaum (Syscoin).

## Paso a paso
1. Crear archivo .env.local en la raíz del frontend.
2. Agregar `NEXT_PUBLIC_RPC_URL=https://rpc-zk.tanenbaum.io` (zkTanenbaum, Chain ID 57057).
3. Agregar `NEXT_PUBLIC_CHAIN_ID=57057` para validar la red conectada desde el cliente.

## Definition of Done
- .env.local creado y leído por Next.js.
