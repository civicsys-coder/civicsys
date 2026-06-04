# Actores, flujos y superficie de ataque actual

Lo que sigue es el modelo de amenaza concreto **del código actual** (no del documento). Permite saber dónde golpear cuando lleguemos a Ejecución.

## Actores

| Actor | Privilegio | Vector que activa |
|---|---|---|
| **Ciudadano (frontend con MetaMask)** | Wallet propio. Sólo puede registrarse a sí mismo (con un hash) y votar una vez por propuesta. | UI Next.js → wagmi → MetaMask firma → tx a `Vote.sol`/`CitizenRegistry.sol`. |
| **Backend Node (BFF Express + tRPC)** | Solo lectura on-chain (sin private keys). Frontend lo usa para listados, status. | `createPublicClient` viem → RPC zkTanenbaum o Anvil. |
| **Hermes Python (FastAPI)** | Listener de eventos + generador de reportes con LLM. Sin signer (Sprint 1). | `EventListener` polling → Vote.sol logs → `Reporter.render()` → LLM API call. |
| **MCP Server** | (No implementado aún). Diseño: exponer tools `register_citizen`, `cast_vote`, `generate_report`, `hermes_status` a LLM clients externos. | stdio/SSE. |
| **Deployer** (Orlando, en hackathon) | Tiene `DEPLOYER_PRIVATE_KEY`. Despliega contratos. Constructor de `Vote.sol` decide el título de la única propuesta. | hardhat scripts. |
| **Auditor (Tatiana / consumidor del repo MIT)** | Lectura pública del código. Sin acceso a `.env` real. | git clone. |
| **Atacante externo (no autenticado)** | Acceso al repo público (MIT), al explorer (read), a la mempool del sequencer (read), a las APIs públicas (FastAPI si expuesta). | Multiple — ver matriz abajo. |

## Flujo principal (Sprint 1 happy path)

```
Ciudadano
  ↓ DNI + nombre (en frontend, no se envía raw)
Frontend
  ↓ compute keccak256(dni || PUBLIC_SALT)
  ↓ MetaMask sign tx → CitizenRegistry.register(hash)
zkTanenbaum L2 (Chain 57057)
  ↓ tx incluida en batch
  ↓ event CitizenRegistered emitido
  ─── (separadamente)
Ciudadano
  ↓ vota → MetaMask sign → Vote.castVote(id, Yes|No|Abstain)
zkTanenbaum L2
  ↓ event VoteCast emitido
EventListener (Hermes Python)
  ↓ poll eth_getLogs
  ↓ cuando llega ProposalClosed
Reporter (Hermes)
  ↓ build prompt con title del Vote.sol
  ↓ LLM API call (Anthropic primary, OpenRouter fallback)
  ↓ output: markdown rendered con template
GET /reports/{id}  ← (Sprint 1 no persiste — Sprint 2+ persiste)
  ↓
Frontend
  ↓ muestra al ciudadano
```

## Superficie de ataque actual (vectores reales en el código de Mayo 2026)

### S1 — Repositorio público (MIT)

- **HC-01**: `PUBLIC_SALT` literal en 3 `.env.example` commiteados.
- Vector: clonar repo → leer salt → pre-computar hash de cualquier DNI peruano (10^8 posibles).
- Aplicabilidad: 100% — el repo está público.

### S2 — Calldata on-chain (zkTanenbaum explorer público)

- **HC-03 / SC-04**: `castVote(id, Choice)` con `Choice` en claro.
- Vector: monitorear explorer-zk.tanenbaum.io → correlacionar `from` (wallet del votante) con `Choice`.
- Aplicabilidad: 100% en testnet pública.

### S3 — RPC endpoint único

- **AI-BC-01**: `rpc-zk.tanenbaum.io` es controlado por el operador de la testnet.
- Vector: si ese endpoint devuelve datos falsos, Hermes genera reportes sobre realidad fabricada.
- Aplicabilidad: alta — depende de la integridad del operador de la testnet (un solo proveedor).

### S4 — Prompt LLM (vía título de la propuesta)

- **AI-PI-01**: `_build_prompt` interpola `input.title` literal.
- Vector: en Sprint 2+ cuando se permita `createProposal()`, un atacante crea una propuesta con título que contiene instrucciones LLM.
- Aplicabilidad: **latente** — en Sprint 1 solo hay propuestas pre-seeded, pero el código no valida.

### S5 — MCP Server no implementado

- **AI-PI-02**: dir vacío, no expone tools aún.
- Vector: si futuro desarrollador implementa tools sin auth, un cliente LLM externo (Claude Code de otro usuario) podría leer `SOUL.md`, `INSTINCT.md` o tools peligrosas.
- Aplicabilidad: **latente con plazo de aplicabilidad alta** (Sprint 2 quiere implementar MCP).

### S6 — Persistencia de reportes (latente)

- **HC-05**: cuando se introduzca `sessions/proposal_N.json`, sin HMAC un atacante con shell access altera reportes sin huella.
- Vector: VPS comprometido → modificar JSON → API sirve reporte alterado.
- Aplicabilidad: alta cuando se introduzca persistencia.

### S7 — Signer custodial (no aplica Sprint 2)

- `SIGNER_PRIVATE_KEY` está declarado pero no cargado.
- Vector: si alguien introduce un signer (por ejemplo, para escribir a un futuro AuditLog.sol desde Hermes en lugar de wallet del operador), reaparece la vulnerabilidad.
- Aplicabilidad: **dormida** — sólo se activa si cambia el diseño.

## Mapa de mitigaciones por superficie

| Vector | Mitigación Sprint 02 | Mitigación futura |
|---|---|---|
| S1 (salt en VCS) | Rotación + mover a `.env` local | HMAC con pepper o ZK proof |
| S2 (votos en calldata) | Warning UI + doc | Commit-reveal o ZK voting |
| S3 (RPC único) | Failover en client | Validación cruzada multi-RPC |
| S4 (prompt injection) | Sanitización + delimitadores + tests | Monitor anomalías + revisión humana en alto impacto |
| S5 (MCP sin auth) | Política + stub auth-by-default | Auth Bearer + allow-list + observabilidad por tool |
| S6 (reportes alterables) | HMAC al persistir | AuditLog.sol on-chain |
| S7 (signer custodial dormido) | Limpiar `.env.example` + ADR multisig | Multisig + signer aislado |

## Lo que el modelo NO cubre (explícito)

- Compromiso del modelo base Anthropic (out of scope per docx §6 "Declaración del Auditor").
- Bugs en el verificador PLONK on-chain de zkStack (out of scope — código de Matter Labs).
- Ataques físicos al servidor (out of scope).
- Coerción/compra de votos vía canal off-chain (out of scope tecnológico).
