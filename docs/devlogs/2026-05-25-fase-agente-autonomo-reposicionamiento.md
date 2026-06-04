# Devlog · 2026-05-25 · Reposicionamiento hacia la fase de "agente autónomo"

## Contexto (mensajes del organizador — Fernando Paredes)

- **23/5** — Referencia para "agentes autónomos nivel pro": [`affaan-m/ECC`](https://github.com/affaan-m/ECC).
  Al estudiarlo resulta ser un *Agent Harness Performance System* (skills, memoria/instintos
  persistentes, sub-agentes especializados, orquestación multi-agente, **evals pass@k /
  quality-gates**, seguridad-primero). Marca el listón del "agente pro": **loop agéntico +
  tool-use + memoria real + auto-verificación + (opcional) multi-agente**.
- **24/5** — **Testnet zkSYS reseteada** (nuevo prover *AirBender*). Saldo TSYS en backup,
  se restaura en los próximos días. **Señal clave:** *"estamos en fase de agente autónomo,
  todavía no estamos pidiendo la integración con Blockchain."*
- **25/5** — Faucet nuevo operativo: https://faucet-zk.tanenbaum.io/

## Diagnóstico

La fase actual se evalúa por el **agente autónomo**, no por la integración blockchain.
CivicSys está construido *blockchain-first* y Hermes (el agente) es el componente más débil:

- `agents/app/main.py` → solo `/health`.
- `agents/app/reporter.py` → 1 llamada LLM sobre un template; no decide nada.
- `agents/app/memory.py` → embedder **falso** (hash SHA-256, no semántico).
- `agents/app/listener.py` → parser de logs cuyo loop de polling **no está cableado**.
- Sin loop agéntico, tool-use, planificación ni auto-evaluación.

**La fase evalúa justo lo más flaco del proyecto.**

## Decisión (sesión 2026-05-25)

1. **Reposicionar:** Hermes pasa a protagonista (agente autónomo real). La blockchain queda
   como capa de *settlement/auditoría* para la fase siguiente — ventaja ya construida
   (contratos, tests, deploy, frontend con MetaMask).
2. **Alcance de esta sesión = solo diseño + higiene.** Se escribe el spec/plan del agente;
   **la construcción se difiere** hasta confirmar los criterios de evaluación del jurado
   (Fernando indicó "contactar por interno" para coordinar).
3. **Higiene testnet:**
   - Faucet actualizado en docs → `https://faucet-zk.tanenbaum.io/`.
   - **NO** se modifican RPC ni Chain ID a ciegas. El repo asume `57057` /
     `https://rpc-zk.tanenbaum.io` para el zkEVM. El **Tanenbaum NEVM clásico es `5700`**
     (no confundir). Post-AirBender los params **pueden** haber cambiado → reverificar con
     docs/Discord oficiales **antes** de la fase blockchain.

## Próximos pasos

- [ ] Confirmar criterios de evaluación de la fase "agente autónomo" (vía interno).
- [ ] Spec + plan de implementación de Hermes-agente (loop · tools · memoria semántica ·
      auto-verificación), grounded en patrones de ECC.
- [ ] (Track paralelo) Retheme retro-futurista del frontend (verde fósforo CRT).
- [ ] Reverificar params zkSYS post-AirBender antes de retomar blockchain.

## Referencias

- ECC: https://github.com/affaan-m/ECC
- Faucet zkSYS: https://faucet-zk.tanenbaum.io/
- AirBender (prover ZKsync): https://www.zksync.io/airbender
