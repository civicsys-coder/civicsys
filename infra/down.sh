#!/usr/bin/env bash
# Apaga la infra local. Acepta --purge para borrar volúmenes (resetea DB).
#
# Uso:
#   bash infra/down.sh           # detiene containers, mantiene volumen
#   bash infra/down.sh --purge   # detiene + borra volumen (Postgres se resetea)

set -euo pipefail

cd "$(dirname "$0")"

if [ "${1:-}" = "--purge" ]; then
  echo "→ docker compose down -v ..."
  docker compose --env-file .env down -v
else
  echo "→ docker compose down ..."
  docker compose --env-file .env down
fi

echo "✓ infra apagada"
