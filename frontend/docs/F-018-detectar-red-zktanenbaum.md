# F-018 · Detectar si la red es zkTanenbaum y mostrar aviso

**id:** F-018  
**title:** Detectar si la red conectada es zkTanenbaum (Syscoin) y mostrar aviso si no  
**owner:** [Responsable]  
**backup:** [Backup/Pair]  
**effort:** 10 min  
**priority:** P1  
**status:** pending  
**depends_on:** F-016  
**sprint:** 1  
**layer:** frontend

---

## Por qué importa
Si el usuario tiene MetaMask conectada a otra red (mainnet, Sepolia, Rollux, NEVM, etc.), las transacciones fallarán o se firmarán en la red equivocada. Hay que detectarlo y avisar antes de que pase.

## Conceptos clave
- zkTanenbaum (Chain ID 57057)
- `wagmi` hooks (`useChainId`, `useSwitchChain`)
- UX de red incorrecta

## Paso a paso
1. Detectar el `chainId` actual del wallet en ConnectWalletButton o en un hook (`useWallet`).
2. Comparar contra el chain ID esperado: **57057** (zkTanenbaum).
3. Si no coincide, mostrar un aviso visible ("Conectate a zkTanenbaum") y un botón que llame a `switchChain` para cambiar de red automáticamente.

## Definition of Done
- Aviso visible si la red conectada no es zkTanenbaum (57057).
- Click en el botón cambia la red en MetaMask sin recargar la página.

## Errores comunes
- Comparar contra otro chain ID (Rollux es `570`, Syscoin NEVM es `5700` — fácil confundir con 57057).
- Olvidar el caso en que el usuario rechaza el `switchChain` (el aviso debe seguir visible).
