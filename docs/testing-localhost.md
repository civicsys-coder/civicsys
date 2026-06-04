# Testing localhost · SSC ANTIPEREZA Sprint 1

Guía paso a paso para levantar el demo end-to-end en una máquina limpia. Target: ≤30 min.

## Pre-requisitos

| Tool | Versión mínima | Cómo instalar |
|---|---|---|
| Docker Desktop | 27.x | https://www.docker.com/products/docker-desktop |
| Node.js | 20+ | https://nodejs.org |
| pnpm | 10.x | `npm install -g pnpm` o `corepack enable && corepack prepare pnpm@latest --activate` |
| Python | 3.11+ | https://www.python.org/downloads |
| MetaMask | extension navegador | https://metamask.io |
| jq | latest | `apt install jq` / `brew install jq` / `winget install jqlang.jq` |

Una `ANTHROPIC_API_KEY` (https://console.anthropic.com) es opcional — sin ella Hermes persiste reportes con `provider="unavailable"` y el demo sigue funcionando.

## Setup paso a paso

### 1. Clonar + entrar al repo

```bash
git clone https://github.com/SandroChavez/CivicSys.git
cd CivicSys
git checkout feat/sprint1-mvp
cp .env.example .env  # editar con tus API keys si las tenés
```

### 2. Levantar la infraestructura

```bash
bash infra/up.sh
```

Esto arranca:
- Postgres + pgvector en `localhost:54330`
- Anvil (EVM local) en `localhost:8545` (Chain ID 31337)

Verificar:
```bash
docker compose -f infra/docker-compose.yml ps
docker exec ssca-postgres psql -U postgres -d civicsys -c "\dt"
```

### 3. Deploy de contratos a Anvil

```bash
cd blockchain
pnpm install --frozen-lockfile
pnpm compile
pnpm exec hardhat run scripts/deploy-local.ts --network localhost
cd ..
```

Output esperado: addresses de `CitizenRegistry` y `Vote`, ABIs copiados a `shared/abis/`.

### 4. Configurar `.env` del backend Node

```bash
REG=$(jq -r '.contracts.CitizenRegistry' blockchain/deployments/localhost.json)
VOTE=$(jq -r '.contracts.Vote' blockchain/deployments/localhost.json)

cat > backend/.env <<EOF
CHAIN_ID=31337
REGISTRY_ADDRESS=$REG
VOTE_ADDRESS=$VOTE
DATABASE_URL=postgresql://postgres:postgres@localhost:54330/civicsys
PORT=4000
CORS_ORIGIN=http://localhost:3000
EOF
```

### 5. Configurar `.env` del backend Python

```bash
cat > agents/.env <<EOF
CHAIN_ID=31337
REGISTRY_ADDRESS=$REG
VOTE_ADDRESS=$VOTE
RPC_URL=http://localhost:8545
DATABASE_URL=postgresql://postgres:postgres@localhost:54330/civicsys
ANTHROPIC_API_KEY=sk-ant-PLACEHOLDER
EOF
```

### 6. Configurar `.env.local` del frontend

```bash
cp frontend/civicsys/.env.local.example frontend/civicsys/.env.local
```

### 7. Arrancar los 3 servicios

En 3 terminales separadas:

```bash
# Terminal 1: backend Node
cd backend && pnpm install --frozen-lockfile && pnpm dev
# → http://localhost:4000/trpc + /health

# Terminal 2: backend Python
cd agents
python -m venv .venv && source .venv/Scripts/activate  # Windows
# o: source .venv/bin/activate  (Linux/Mac)
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
# → http://localhost:8000/agents/health

# Terminal 3: frontend
cd frontend/civicsys && pnpm install --frozen-lockfile && pnpm dev
# → http://localhost:3000
```

### 8. Configurar MetaMask

1. Abrir MetaMask → Settings → Networks → Add network manually:
   - Name: `Anvil local`
   - RPC URL: `http://localhost:8545`
   - Chain ID: `31337`
   - Currency symbol: `ETH`

2. Importar una cuenta Anvil:
   - Settings → Accounts → Import account
   - Private key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
     (Account 0 default de Anvil, NUNCA usar en mainnet)

### 9. Demo end-to-end

1. Abrir http://localhost:3000
2. Click "Conectar wallet" → seleccionar la cuenta Anvil importada
3. NetworkBadge debería decir "Anvil local"
4. "Empezar · registro" → ingresar DNI `12345678` → "Registrar" → confirmar tx en MetaMask
5. Esperar ~4s (Anvil block-time 2s)
6. Ir a `/propuesta/1` → Click "Sí" → confirmar tx
7. Tally se actualiza en vivo
8. Ir a `/dashboard` → ver reportes Hermes (si configuraste Anthropic API key)

## Troubleshooting

### "No deployment available for chainId 31337"

El frontend lee `blockchain/deployments/localhost.json`. Si no existe, redeploy:

```bash
bash infra/down.sh --purge && bash infra/up.sh
cd blockchain && pnpm exec hardhat run scripts/deploy-local.ts --network localhost
```

### MetaMask no se conecta

- Verificar que Anvil corre: `curl http://localhost:8545 -d '{"jsonrpc":"2.0","method":"eth_chainId","id":1}'` → debe responder `0x7a69` (31337).
- Reset Account en MetaMask Settings → Advanced → Reset account (limpia nonce stale).

### Postgres connection refused

- `bash infra/down.sh --purge && bash infra/up.sh` para resetear container y volumen.

## Testing automatizado

```bash
# Blockchain (Solidity)
cd blockchain && pnpm test:ci
# 23 tests · coverage 100%

# Backend Node (tRPC)
cd backend && pnpm test:ci
# 22 tests · coverage 96.9%

# Backend Python (FastAPI + Hermes)
cd agents && source .venv/Scripts/activate && pytest
# 23 tests · coverage 100%

# Frontend (Next.js + RTL)
cd frontend/civicsys && pnpm test:ci
# 21 tests · coverage 80%
```

Todos con hard-gate ≥80% statements en CI.

## Demo en zkTanenbaum testnet (opcional)

1. Conseguir TSYS del faucet (Discord Syscoin canal #zk-testnet-faucet).
2. Configurar `DEPLOYER_PRIVATE_KEY` en `.env` raíz.
3. Deploy:
   ```bash
   cd blockchain && pnpm exec hardhat run scripts/deploy-zktanenbaum.ts --network zkTanenbaum
   ```
4. Configurar MetaMask con la red zkTanenbaum (Chain ID 57057, RPC `https://rpc-zk.tanenbaum.io`).
5. Repetir el demo flow contra testnet.
