# Threat Model — CivicSys Sprint 02

**Fecha**: 2026-05-23
**Sintetiza**: `docs/plans/executed/estrategia/sprint-02-security-hardening/03-actores-flujos-superficie.md`
**Fuente externa**: auditoría de Tatiana Portillo (`CivicSys-Auditoria-Ciberseguridad.docx`)

## Actores

| Actor | Privilegio efectivo | Cómo opera sobre el sistema |
|---|---|---|
| **Ciudadano (frontend + MetaMask)** | Wallet propio. Registra hash de DNI; vota una vez por propuesta. | Next.js → wagmi → MetaMask firma → tx a `CitizenRegistry.sol` / `Vote.sol` en zkTanenbaum. |
| **Backend Node BFF** | Solo lectura on-chain. **Sin private keys.** | `createPublicClient` viem → RPC. Expone tRPC al frontend. |
| **Hermes Python (FastAPI)** | Listener de eventos + generador de reportes con LLM. **Sin signer.** | Polling `eth_getLogs`. `Reporter.render()` con LLM. |
| **MCP Server** | (No implementado todavía). Diseño: exponer tools `register_citizen`, `cast_vote`, etc. | stdio/SSE. Política obligatoria en [`mcp-policy.md`](./mcp-policy.md). |
| **Deployer** (operador del hackathon) | Tiene `DEPLOYER_PRIVATE_KEY` para deploys. Constructor del `Vote.sol` define la propuesta única (Sprint 1). | hardhat scripts. |
| **Auditor / Lector del repo MIT** | Lectura pública del código. | git clone. |
| **Atacante externo** | Acceso al repo (MIT), al explorer de zkTanenbaum (read), a la mempool (read), a la API FastAPI (si expuesta). | Varios vectores — ver matriz. |

## Flujo principal (Sprint 1 happy path)

```
Ciudadano (DNI raw, NUNCA enviado tal cual)
  ↓ frontend: hash = keccak256(dni || PUBLIC_SALT)
  ↓ MetaMask: sign tx → CitizenRegistry.register(hash)
zkTanenbaum L2 (Chain 57057)
  ↓ tx batched → event CitizenRegistered

Ciudadano vota
  ↓ MetaMask sign tx → Vote.castVote(id, Yes|No|Abstain)
zkTanenbaum L2
  ↓ event VoteCast emitido

EventListener (Hermes Python)
  ↓ polling eth_getLogs cada N seg
  ↓ al detectar ProposalClosed:
Reporter (Hermes)
  ↓ sanitize_untrusted(title) + delimitadores
  ↓ LLM call → markdown
  ↓ (futuro) persist + HMAC + AuditLog.sol
GET /reports/{id}
```

## Superficie de ataque actual (Mayo 2026)

| ID | Vector | Aplicabilidad | Mitigación Sprint 02 | Mitigación diferida |
|---|---|---|---|---|
| S1 | Salt en `.env.example` del repo público | 100% mientras siga commiteado | Rotar + mover a `.env` (ADR-001) | HMAC + pepper en HSM (producción) |
| S2 | Voto visible en calldata del explorer | 100% testnet pública | Warning UI + doc | Commit-reveal o ZK voting (Sprint 3+) |
| S3 | RPC único bajo control del operador testnet | Alta | Failover RPC (ADR-003) | Cross-validation multi-RPC (Sprint 3+) |
| S4 | Prompt LLM con título de propuesta | **Latente** (Sprint 1 propuesta única pre-seeded) | `sanitize_untrusted` + delimitadores (ADR-005) | Monitor anomalías post-LLM (Sprint 3+) |
| S5 | MCP server sin auth (cuando se implemente) | **Latente** | Política obligatoria (ADR-004) | Implementación de auth Bearer + allow-list al construir |
| S6 | Reportes en filesystem sin HMAC (cuando se persistan) | **Latente** | HMAC helpers listos (ADR-002) | AuditLog.sol on-chain (Sprint 3+) |
| S7 | Signer custodial (NO activo hoy) | **Dormida** | Limpiar `.env.example` + doc | Multisig 2-de-3 si se reactiva |

"Latente" = el código existe o existirá pronto y la mitigación está lista.
"Dormida" = no hay código que active el vector; sólo entra en juego si se introduce.

## Asumimos confianza en

- **Operador del frontend** (deploy del Next.js): tiene acceso al salt `.env` del frontend. Compromise → comparte salt → mismo ataque de S1.
- **Operador de Hermes**: tiene acceso al `MEMORY_INTEGRITY_KEY` (HMAC) y a `ANTHROPIC_API_KEY`.
- **Deployer**: controla `DEPLOYER_PRIVATE_KEY`. Si compromete, puede redeployar contratos con lógica diferente.
- **Sequencer de zkTanenbaum**: testnet centralizada. Puede censurar, manipular timestamps en ventana acotada, ordenar tx dentro del batch.
- **Modelo base de Anthropic**: no validamos respuestas del LLM más allá de schema + delimitadores. Hallucinations o manipulación de hash de Anthropic upstream están fuera de scope.

## NO asumimos confianza en

- **Cualquier actor externo** que pueda leer el repo público o la mempool.
- **Cualquier RPC público** — sólo confiamos en él si dos RPCs independientes concuerdan (Sprint 3+).
- **Cualquier dato on-chain "user-provided"** (título de propuesta, descripción, etc.): pasa por `sanitize_untrusted` antes de ir al prompt.
- **Cualquier archivo en `agents/hermes/memory/sessions/`** (cuando exista): se verifica HMAC antes de usarse.

## Cosas que el modelo NO cubre

Out of scope per declaración del documento original (§6 de Tatiana):

- Compromiso del modelo Claude base de Anthropic.
- Bugs en el verificador PLONK on-chain de zkStack (código de Matter Labs).
- Ataques físicos a la infraestructura.
- Coerción / compra de votos vía canal off-chain (problema socio-político, no técnico).

## Mapa de mitigaciones (resumen para devs)

| Quiero defender contra... | Buscá... |
|---|---|
| Pre-cómputo de DNI | `docs/security/runbook-rotacion-salt.md` |
| Reporte alterado en VPS | `agents/app/security.py:compute_hmac / verify_hmac` |
| RPC malicioso silencioso | `agents/app/rpc.py:fetch_with_failover` (cubre RPC down; cross-val es Sprint 3+) |
| Prompt injection vía título on-chain | `agents/app/security.py:sanitize_untrusted` + delimitadores en `reporter.py` |
| Tool MCP peligrosa | [`mcp-policy.md`](./mcp-policy.md) — lista negra absoluta |
| Coerción del voto | Doc en [`known-limitations.md`](./known-limitations.md) — Sprint 3+ commit-reveal |
