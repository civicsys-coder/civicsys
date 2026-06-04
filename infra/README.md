# infra/

Infraestructura local de CivicSys / SSC ANTIPEREZA para desarrollo Sprint 1.

## Contenido

- `docker-compose.yml` — define 2 servicios: `postgres` (Supabase-compatible con pgvector) y `anvil` (EVM local).
- `.env.example` — variables que el compose consume. Copiar a `.env` local.
- `supabase/init.sql` — DDL aplicado al primer arranque de Postgres (4 tablas).
- `up.sh` — levanta los servicios + smoke checks.
- `down.sh` — apaga. Flag `--purge` borra el volumen de Postgres.

## Uso típico

```bash
cp infra/.env.example infra/.env
bash infra/up.sh    # levanta
# ... usar la app ...
bash infra/down.sh  # apagar
```

Para resetear la DB (re-aplicar `init.sql` desde cero):

```bash
bash infra/down.sh --purge
bash infra/up.sh
```

## Puertos por defecto

| Servicio | Puerto host | URL |
|---|---|---|
| postgres | 54330 | `postgresql://postgres:postgres@localhost:54330/civicsys` |
| anvil | 8545 | `http://localhost:8545` (Chain ID 31337) |

## Cuentas Anvil pre-funded

Al arrancar, Anvil genera 10 cuentas con 10000 ETH cada una. Las private keys
se imprimen en `docker logs ssca-anvil`. Cuenta 0 suele ser la del deployer.

```bash
docker logs ssca-anvil 2>&1 | head -40
```
