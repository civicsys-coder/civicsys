# blockchain/ — Smart contracts CivicSys / SSC ANTIPEREZA

Contratos Solidity desplegados sobre **zkSYS Testnet (zkTanenbaum, Chain ID 57057)**, la edgechain de Syscoin basada en zkStack.

## Contratos

- **`CitizenRegistry.sol`** — registro on-chain de ciudadanos por hash de DNI (off-chain `keccak256(dni + PUBLIC_SALT)`).
- **`Vote.sol`** — voto consultivo sobre una propuesta única preseeded en el constructor.

## Stack

- **Solidity** 0.8.24
- **Hardhat 2** + `@nomicfoundation/hardhat-toolbox-viem` 3.0 (viem nativo, no ethers)
- **TypeScript** 5.9 · **viem** 2.x · **chai** 4.x · **mocha**
- **solidity-coverage** + **cross-env** (requerido por viem plugin)
- **pnpm** (no npm — preferencia de seguridad)

## Setup

```bash
pnpm install
pnpm compile
pnpm test         # 23 unit + E2E tests
pnpm test:ci      # tests + coverage hard-gate 80%
```

Coverage actual (Sprint 1 cierre Bloque B):
- Statements **100%** · Branches **96.88%** · Functions **100%** · Lines **100%**

## Deploy

### Local (Anvil)

Pre-requisito: Anvil corriendo (`bash ../infra/up.sh`).

```bash
pnpm exec hardhat run scripts/deploy-local.ts --network localhost
```

Side effects:
- `deployments/localhost.json` con las addresses
- `../shared/abis/{CitizenRegistry,Vote}.json` copiados desde `artifacts/`

### zkTanenbaum testnet

Pre-requisitos:
- `DEPLOYER_PRIVATE_KEY` en `.env` con cuenta financiada del faucet
- ≥0.05 TSYS de balance

```bash
pnpm exec hardhat run scripts/deploy-zktanenbaum.ts --network zkTanenbaum
```

## Redes configuradas

| Red | Chain ID | RPC | Símbolo |
|---|---|---|---|
| `localhost` (Anvil) | 31337 | `http://localhost:8545` | ETH |
| `zkTanenbaum` (testnet real) | 57057 | `https://rpc-zk.tanenbaum.io` | TSYS |

> **Cuidado**: no confundir con Rollux (Chain ID 570) ni Syscoin NEVM (Chain ID 5700). Son redes diferentes del mismo ecosistema Syscoin.

## Producto de cara al PPT

> Concepto SSC ANTIPEREZA: *"La IA asesora. El ciudadano supervisa. El blockchain firma."*
>
> Esta capa = el **"blockchain firma"**. Sprint 1 cubre el escenario MVP: 1 propuesta, 3 opciones (Sí/No/Abstención), cierre por timestamp.

Ver plan AEGIS: [`../docs/plans/tactica/sprint1-mvp/`](../docs/plans/tactica/sprint1-mvp/).
