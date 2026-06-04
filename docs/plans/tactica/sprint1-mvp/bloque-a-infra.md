# Bloque A · Infra Docker Compose + Supabase + Anvil

**Objetivo**: Levantar la infraestructura local con un solo `docker compose up`. Tres servicios mínimos: Anvil (blockchain), Supabase Postgres+pgvector, y un meta-service de Supabase (opcional Sprint 1). Scripts de bootstrap (`infra/up.sh`/`infra/down.sh`) para que un dev nuevo pueda arrancar el ambiente en ≤2 min.

**Tareas**: 8
**LOC estimado**: ~250
**Dependencias**: Bloque 0 cerrado (working tree limpio).
**Coverage gate**: no aplica (es infra, no código de aplicación).

---

## Task A.1 — `infra/.env.example`

**Files**: Create `infra/.env.example`.

- [ ] **Step 1**: Crear el archivo con las variables que el compose va a consumir

```bash
cat > infra/.env.example <<'EOF'
# Postgres (Supabase) — usuario admin
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=civicsys
POSTGRES_PORT=54322

# Anvil — Foundry local node simulando zkTanenbaum EVM
ANVIL_PORT=8545
ANVIL_CHAIN_ID=31337
ANVIL_BLOCK_TIME=2
EOF
```

- [ ] **Step 2**: Copiar a `.env` local (no se commitea)

```bash
cp infra/.env.example infra/.env
```

- [ ] **Step 3**: Asegurar que `infra/.env` está en `.gitignore`

Run:
```bash
grep -qE '^infra/\.env$|^\*\*/\.env$|^\.env$' .gitignore && echo "ya cubierto" || echo "agregar"
```

Si dice "agregar":
```bash
cat >> .gitignore <<'EOF'

# Local env files (never commit secrets/dev config)
infra/.env
EOF
```

- [ ] **Step 4**: Stage + commit

```bash
git add infra/.env.example .gitignore
git commit -m "infra(A.1): .env.example con vars Postgres + Anvil"
```

---

## Task A.2 — `infra/docker-compose.yml`

**Files**: Create `infra/docker-compose.yml`.

- [ ] **Step 1**: Escribir el compose con 2 servicios (Postgres + Anvil)

```bash
cat > infra/docker-compose.yml <<'EOF'
# CivicSys / SSC ANTIPEREZA · Sprint 1 MVP local infrastructure
#
# Servicios:
#   - postgres:      Supabase-compatible Postgres 17 con pgvector
#   - anvil:         Foundry Anvil (EVM local · Chain ID 31337 · surrogate zkTanenbaum)
#
# Uso:
#   bash infra/up.sh     # levanta los servicios
#   bash infra/down.sh   # los apaga + opcional purga volúmenes
#
# NOTAS:
#   - Postgres image incluye pgvector preinstalado.
#   - Anvil corre standalone (sin fork de mainnet) para iteración rápida.

services:
  postgres:
    image: pgvector/pgvector:pg17
    container_name: ssca-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: ${POSTGRES_DB:-civicsys}
    ports:
      - "${POSTGRES_PORT:-54322}:5432"
    volumes:
      - ssca-postgres-data:/var/lib/postgresql/data
      - ./supabase/init.sql:/docker-entrypoint-initdb.d/01-init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-civicsys}"]
      interval: 5s
      timeout: 3s
      retries: 10

  anvil:
    image: ghcr.io/foundry-rs/foundry:latest
    container_name: ssca-anvil
    restart: unless-stopped
    entrypoint: ["anvil"]
    command:
      - --host
      - 0.0.0.0
      - --chain-id
      - "${ANVIL_CHAIN_ID:-31337}"
      - --block-time
      - "${ANVIL_BLOCK_TIME:-2}"
      - --accounts
      - "10"
      - --balance
      - "10000"
    ports:
      - "${ANVIL_PORT:-8545}:8545"

volumes:
  ssca-postgres-data:
    name: ssca-postgres-data
EOF
```

- [ ] **Step 2**: Validar sintaxis YAML (no levantar todavía — falta el `init.sql` de A.3)

```bash
docker compose -f infra/docker-compose.yml --env-file infra/.env config > /dev/null
```

Expected: comando sale sin error. Si hay error de YAML, el compose lo reporta con línea y columna.

- [ ] **Step 3**: Stage + commit

```bash
git add infra/docker-compose.yml
git commit -m "infra(A.2): docker-compose.yml con postgres+pgvector y anvil"
```

---

## Task A.3 — `infra/supabase/init.sql` — DDL Supabase tables

**Files**: Create `infra/supabase/init.sql`.

- [ ] **Step 1**: Crear el SQL de bootstrap

```bash
mkdir -p infra/supabase
cat > infra/supabase/init.sql <<'EOF'
-- SSC ANTIPEREZA · Sprint 1 · Supabase init schema
--
-- Ejecutado automáticamente por el container Postgres en el primer arranque
-- (docker-entrypoint-initdb.d/01-init.sql).
--
-- Cuatro tablas:
--   proposals_cache  — cache on-chain refrescado por el backend Node
--   hermes_reports   — reportes generados por Hermes (markdown + metadata)
--   hermes_memory    — embeddings vectoriales para pgvector similarity
--   sessions         — audit log mínimo de interacciones cliente

CREATE EXTENSION IF NOT EXISTS vector;

-- ------------------------------------------------------------------
-- proposals_cache
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proposals_cache (
    id            BIGINT       NOT NULL,
    chain_id      INTEGER      NOT NULL,
    title         TEXT         NOT NULL,
    ipfs_cid      TEXT,
    open_at       TIMESTAMPTZ  NOT NULL,
    close_at      TIMESTAMPTZ  NOT NULL,
    closed        BOOLEAN      NOT NULL DEFAULT FALSE,
    yes           BIGINT       NOT NULL DEFAULT 0,
    no            BIGINT       NOT NULL DEFAULT 0,
    abstain       BIGINT       NOT NULL DEFAULT 0,
    refreshed_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, chain_id)
);

-- ------------------------------------------------------------------
-- hermes_reports
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hermes_reports (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id     BIGINT       NOT NULL,
    chain_id        INTEGER      NOT NULL,
    body_markdown   TEXT         NOT NULL,
    llm_provider    TEXT         NOT NULL,
    confidence      SMALLINT     NOT NULL CHECK (confidence BETWEEN 0 AND 10),
    tx_hash         TEXT,
    block_number    BIGINT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    FOREIGN KEY (proposal_id, chain_id) REFERENCES proposals_cache(id, chain_id)
);

CREATE INDEX IF NOT EXISTS idx_hermes_reports_proposal
    ON hermes_reports (proposal_id, chain_id, created_at DESC);

-- ------------------------------------------------------------------
-- hermes_memory  (pgvector embeddings · 384 dim = all-MiniLM-L6-v2)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hermes_memory (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id   UUID         NOT NULL REFERENCES hermes_reports(id) ON DELETE CASCADE,
    embedding   VECTOR(384)  NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hermes_memory_embedding
    ON hermes_memory USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ------------------------------------------------------------------
-- sessions  (audit log · no auth real Sprint 1)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    address     TEXT,
    action      TEXT         NOT NULL CHECK (action IN ('register', 'vote', 'view_report')),
    payload     JSONB,
    chain_id    INTEGER,
    tx_hash     TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_address_created
    ON sessions (address, created_at DESC);
EOF
```

- [ ] **Step 2**: Validar sintaxis SQL (sin ejecutar — solo lint visual)

```bash
cat infra/supabase/init.sql | wc -l
```

Expected: ~80 líneas. Si tiene errores tipográficos los va a atrapar Postgres en A.5 al levantar.

- [ ] **Step 3**: Stage + commit

```bash
git add infra/supabase/init.sql
git commit -m "infra(A.3): init.sql con 4 tablas + pgvector + índices"
```

---

## Task A.4 — `infra/up.sh` y `infra/down.sh`

**Files**: Create `infra/up.sh` and `infra/down.sh`.

- [ ] **Step 1**: Script para levantar la infra

```bash
cat > infra/up.sh <<'EOF'
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
echo "  postgres  → localhost:${POSTGRES_PORT:-54322}"
echo "  anvil     → localhost:${ANVIL_PORT:-8545}"
EOF

chmod +x infra/up.sh
```

- [ ] **Step 2**: Script para apagar

```bash
cat > infra/down.sh <<'EOF'
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
EOF

chmod +x infra/down.sh
```

- [ ] **Step 3**: Validar permisos ejecutables

```bash
ls -la infra/up.sh infra/down.sh
```

Expected: ambos con `-rwxr-xr-x` (x para owner/group/others).

- [ ] **Step 4**: Stage + commit

```bash
git add infra/up.sh infra/down.sh
git commit -m "infra(A.4): scripts up.sh/down.sh con health checks y purge flag"
```

---

## Task A.5 — Smoke test: levantar y verificar la infra

**Files**: ninguno (solo ejecución).

- [ ] **Step 1**: Levantar

```bash
bash infra/up.sh
```

Expected output:
```
→ docker compose up -d ...
[+] Running 3/3
 ✔ Network infra_default       Created
 ✔ Container ssca-postgres     Started
 ✔ Container ssca-anvil        Started
→ esperando postgres healthy ...
✓ postgres healthy
→ verificando anvil ...
✓ anvil OK (chain_id 31337)
Infra arriba. Puertos:
  postgres  → localhost:54322
  anvil     → localhost:8545
```

- [ ] **Step 2**: Verificar tablas creadas en Postgres

```bash
docker exec ssca-postgres psql -U postgres -d civicsys -c "\dt"
```

Expected: las 4 tablas (proposals_cache, hermes_reports, hermes_memory, sessions).

- [ ] **Step 3**: Verificar extensión pgvector

```bash
docker exec ssca-postgres psql -U postgres -d civicsys -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';"
```

Expected: una fila con `vector` y la versión instalada (≥0.7.0).

- [ ] **Step 4**: Test rápido Anvil

```bash
curl -sf -X POST http://localhost:8545 \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_accounts","params":[],"id":1}' \
  | python -m json.tool
```

Expected: array con 10 direcciones Ethereum (las cuentas pre-funded de Anvil).

- [ ] **Step 5**: Apagar (no purgar, queremos preservar el state para próximos bloques)

```bash
bash infra/down.sh
```

Expected: `✓ infra apagada`. No se borra el volumen.

- [ ] **Step 6**: No hay commit acá (es solo smoke test, no cambia archivos).

---

## Task A.6 — Documentar infra en `infra/README.md`

**Files**: Create `infra/README.md`.

- [ ] **Step 1**: README breve con uso típico

```bash
cat > infra/README.md <<'EOF'
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
| postgres | 54322 | `postgresql://postgres:postgres@localhost:54322/civicsys` |
| anvil | 8545 | `http://localhost:8545` (Chain ID 31337) |

## Cuentas Anvil pre-funded

Al arrancar, Anvil genera 10 cuentas con 10000 ETH cada una. Las private keys
se imprimen en `docker logs ssca-anvil`. Cuenta 0 suele ser la del deployer.

```bash
docker logs ssca-anvil 2>&1 | head -40
```
EOF
```

- [ ] **Step 2**: Stage + commit

```bash
git add infra/README.md
git commit -m "infra(A.6): README de uso de infra/ con puertos y comandos típicos"
```

---

## Task A.7 — Configurar nivel raíz `.env.example` consolidado

**Files**: Create `.env.example` en la raíz del repo (referencia central que apunta a los specifics por carpeta).

- [ ] **Step 1**: Verificar si existe

```bash
ls -la .env.example 2>&1
```

Si existe ya, leer su contenido antes de sobrescribir.

- [ ] **Step 2**: Escribir / sobrescribir

```bash
cat > .env.example <<'EOF'
# CivicSys / SSC ANTIPEREZA · variables consolidadas
#
# Este archivo es un índice. Cada subcarpeta tiene su propio .env.example
# con vars específicas (infra/, blockchain/, backend/, agents/, frontend/civicsys/).
# Copialos a .env locales según necesites.

# ─────────────────────────────────────────────────────────────────────────
# Blockchain — zkTanenbaum testnet (la red destino, ver PPT slide 13)
# ─────────────────────────────────────────────────────────────────────────
ZKTANENBAUM_RPC=https://rpc-zk.tanenbaum.io
ZKTANENBAUM_CHAIN_ID=57057
ZKTANENBAUM_SYMBOL=TSYS
ZKTANENBAUM_EXPLORER=https://explorer-zk.tanenbaum.io

# ─────────────────────────────────────────────────────────────────────────
# Blockchain — Anvil local (surrogate Sprint 1)
# ─────────────────────────────────────────────────────────────────────────
ANVIL_RPC=http://localhost:8545
ANVIL_CHAIN_ID=31337

# ─────────────────────────────────────────────────────────────────────────
# Salt público para hashear DNIs (NO ES SECRETO — la cadena lo necesita
# consistente entre frontend, backend y contratos)
# ─────────────────────────────────────────────────────────────────────────
PUBLIC_SALT=ssc-antipereza-2026-publico

# ─────────────────────────────────────────────────────────────────────────
# Supabase (DB local en Docker, ver infra/.env.example)
# ─────────────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/civicsys

# ─────────────────────────────────────────────────────────────────────────
# LLM providers — Hermes runtime (uno requerido, fallback opcional)
# ─────────────────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...
OPENROUTER_API_KEY=  # opcional · fallback si Anthropic falla

# ─────────────────────────────────────────────────────────────────────────
# Deployment wallet (NUNCA usar private keys de mainnet)
# ─────────────────────────────────────────────────────────────────────────
DEPLOYER_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000
EOF
```

- [ ] **Step 3**: Asegurar que `.env` (sin .example) esté en `.gitignore`

```bash
grep -qE '^\.env$|^\*\*/\.env$' .gitignore && echo "ya cubierto" || {
  echo "" >> .gitignore
  echo "# Root env (never commit)" >> .gitignore
  echo ".env" >> .gitignore
}
```

- [ ] **Step 4**: Stage + commit

```bash
git add .env.example .gitignore
git commit -m "infra(A.7): .env.example consolidado raíz con vars zkTanenbaum/Anvil/Supabase/LLM"
```

---

## Task A.8 — Smoke test integral del Bloque A

**Files**: ninguno (validación).

- [ ] **Step 1**: Tear down + boot from scratch

```bash
bash infra/down.sh --purge   # borra volumen
bash infra/up.sh             # arranca desde cero, re-aplica init.sql
```

- [ ] **Step 2**: Confirmar tablas + extensión + Anvil

```bash
docker exec ssca-postgres psql -U postgres -d civicsys -c "\dt"
docker exec ssca-postgres psql -U postgres -d civicsys -c "SELECT extname FROM pg_extension WHERE extname = 'vector';"
curl -sf -X POST http://localhost:8545 \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

Expected: 4 tablas · pgvector presente · `"result":"0x7a69"` (31337).

- [ ] **Step 3**: Tear down

```bash
bash infra/down.sh
```

---

## Criterios de done del Bloque A

- [ ] `docker compose -f infra/docker-compose.yml config` valida sin error.
- [ ] `bash infra/up.sh` levanta limpio en ≤30s en máquina con imágenes cacheadas, ≤2min en máquina fría.
- [ ] Postgres reporta 4 tablas + extensión `vector`.
- [ ] Anvil responde `eth_chainId` con `0x7a69`.
- [ ] `infra/README.md` documenta el uso.
- [ ] `.env.example` consolidado en raíz con todas las vars que los siguientes bloques van a consumir.
- [ ] 6 commits del bloque en `git log` (A.1, A.2, A.3, A.4, A.6, A.7).

**Gate humano antes de Bloque B**: Orlando verifica `bash infra/up.sh && bash infra/down.sh --purge && bash infra/up.sh` corre end-to-end. Aprueba pasar a contratos.
