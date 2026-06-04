#!/usr/bin/env bash
# Levanta la infra local de CivicSys / SSC ANTIPEREZA
# - postgres (con init.sql aplicado en primer arranque)
# - anvil (Chain ID 31337)
#
# Uso: bash infra/up.sh

set -euo pipefail

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "⚠️  infra/.env no existe. Copiando de .env.example..."
  cp .env.example .env
fi

echo "→ docker compose up -d ..."
docker compose --env-file .env up -d

echo "→ esperando postgres healthy ..."
for i in $(seq 1 30); do
  if docker compose ps postgres | grep -q "healthy"; then
    echo "✓ postgres healthy"
    break
  fi
  sleep 2
done

echo "→ verificando anvil ..."
sleep 2
if curl -sf -X POST http://localhost:8545 \
    -H 'Content-Type: application/json' \
    -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
    | grep -q '0x7a69'; then  # 0x7a69 == 31337
  echo "✓ anvil OK (chain_id 31337)"
else
  echo "✗ anvil no responde con chain_id 31337"
  exit 1
fi

echo ""
echo "Infra arriba. Puertos:"
echo "  postgres  → localhost:${POSTGRES_PORT:-54330}"
echo "  anvil     → localhost:${ANVIL_PORT:-8545}"
