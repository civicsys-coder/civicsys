# Bloque I · CI workflow GitHub Actions con coverage gate hard-bloqueante

**Objetivo**: `.github/workflows/ci.yml` que corre 4 jobs en paralelo (blockchain, backend Node, agents Python, frontend Next.js), cada uno con su coverage check ≥80% hard-bloqueante para merge. Más un job E2E que arranca toda la stack en GitHub Runner y corre Playwright.

**Tareas**: 5
**LOC estimado**: ~250
**Dependencias**: Bloques B, E, F, G, H todos cerrados (cada uno con su `test:ci` funcionando local).
**Coverage gate**: el workflow ES el gate. Si pasa, los gates locales se cumplen.

---

## Task I.1 — Workflow base con 4 jobs paralelos

**Files**: Create `.github/workflows/ci.yml`.

- [ ] **Step 1**: Crear

```bash
mkdir -p .github/workflows
cat > .github/workflows/ci.yml <<'EOF'
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  # ─────────────────────────────────────────────────────────────────────
  # Job 1: Solidity contracts · hardhat test + coverage gate
  # ─────────────────────────────────────────────────────────────────────
  blockchain:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: blockchain
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          cache-dependency-path: blockchain/pnpm-lock.yaml
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec hardhat compile
      - run: pnpm test:ci
      - name: Upload coverage report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: blockchain-coverage
          path: blockchain/coverage/
          retention-days: 7

  # ─────────────────────────────────────────────────────────────────────
  # Job 2: Backend Node · vitest + coverage gate
  # ─────────────────────────────────────────────────────────────────────
  backend-node:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          cache-dependency-path: backend/pnpm-lock.yaml
      - run: pnpm install --frozen-lockfile
      # blockchain ABIs son input — los regeneramos rapidito compilando contracts
      - name: Compile contracts to populate shared/abis
        working-directory: blockchain
        run: |
          pnpm install --frozen-lockfile
          pnpm exec hardhat compile
          mkdir -p ../shared/abis
          cp artifacts/contracts/CitizenRegistry.sol/CitizenRegistry.json ../shared/abis/
          cp artifacts/contracts/Vote.sol/Vote.json ../shared/abis/
      - run: pnpm test:ci

  # ─────────────────────────────────────────────────────────────────────
  # Job 3: Backend Python · pytest --cov-fail-under=80
  # ─────────────────────────────────────────────────────────────────────
  backend-python:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: agents
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: pip
      - run: pip install -e ".[dev]"
      - run: pytest
        env:
          # vars mínimas para que Settings cargue
          CHAIN_ID: "31337"
          REGISTRY_ADDRESS: "0x0000000000000000000000000000000000000001"
          VOTE_ADDRESS: "0x0000000000000000000000000000000000000002"
          RPC_URL: "http://localhost:8545"
          DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/civicsys"
          ANTHROPIC_API_KEY: "sk-ant-fake-ci"

  # ─────────────────────────────────────────────────────────────────────
  # Job 4: Frontend Next.js · vitest + coverage gate
  # ─────────────────────────────────────────────────────────────────────
  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend/civicsys
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          cache-dependency-path: frontend/civicsys/pnpm-lock.yaml
      - run: pnpm install --frozen-lockfile
      # ABIs + deployments necesarios para que el frontend importe
      - name: Compile + deploy mock para tener shared/abis y deployments/localhost.json
        run: |
          cd ../../blockchain
          pnpm install --frozen-lockfile
          pnpm exec hardhat compile
          mkdir -p ../shared/abis
          cp artifacts/contracts/CitizenRegistry.sol/CitizenRegistry.json ../shared/abis/
          cp artifacts/contracts/Vote.sol/Vote.json ../shared/abis/
          mkdir -p deployments
          cat > deployments/localhost.json <<'JSON'
          {
            "chainId": 31337,
            "network": "localhost",
            "contracts": {
              "CitizenRegistry": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
              "Vote": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
            },
            "seedProposal": {
              "id": 1, "title": "CI mock", "ipfsCid": "",
              "openAt": "0", "closeAt": "999999999"
            }
          }
          JSON
      - run: pnpm test:ci

  # ─────────────────────────────────────────────────────────────────────
  # Job 5: gitleaks scan
  # ─────────────────────────────────────────────────────────────────────
  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITLEAKS_CONFIG: .gitleaks.toml
EOF
```

- [ ] **Step 2**: Commit

```bash
git add .github/workflows/ci.yml
git commit -m "ci(I.1): workflow con 4 jobs paralelos (blockchain/node/python/frontend) + gitleaks"
```

---

## Task I.2 — Verificar CI corre verde en PR de prueba

**Files**: ninguno (acción remota).

- [ ] **Step 1**: Push a una rama de feature + abrir PR draft

```bash
git push -u origin feat/sprint1-mvp  # si no estabas en main directo
gh pr create --draft --title "Sprint 1 MVP — work in progress" --body "Plan AEGIS en ejecución · ver docs/plans/tactica/sprint1-mvp/"
```

- [ ] **Step 2**: Esperar runs

```bash
gh run watch
```

Expected: los 5 jobs verde en ~5-10 min. Si alguno falla, leer logs y corregir antes de avanzar.

- [ ] **Step 3**: No commit acá (solo verificación).

---

## Task I.3 — Branch protection rule (administrativo)

**Files**: ninguno (configuración GitHub Settings UI).

- [ ] **Step 1**: En GitHub Settings → Branches → Add rule for `main`:
  - "Require status checks to pass before merging"
  - Marcar los 5 jobs: blockchain, backend-node, backend-python, frontend, gitleaks
  - "Require branches to be up to date before merging"
  - "Do not allow bypassing the above settings"

> **Decisión Sprint 1**: para velocidad de hackathon, esta regla puede ser **soft** (solo "Require status checks" sin "Do not allow bypassing") — Orlando como owner puede mergear a main directo si necesita. Después de Sprint 1, hardenear.

- [ ] **Step 2**: No commit (config remota).

---

## Task I.4 — Job E2E opcional (Sprint 1 stretch)

**Files**: Modify `.github/workflows/ci.yml`.

> **Nota**: el E2E con Playwright + Anvil + backend + agents + frontend levantando todo en un GitHub Runner es complejo. Sprint 1 puede dejarlo como **stretch** y correrlo manualmente local. Si querés el job en CI, agregar:

```yaml
  e2e:
    runs-on: ubuntu-latest
    needs: [blockchain, backend-node, backend-python, frontend]
    services:
      postgres:
        image: pgvector/pgvector:pg17
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: civicsys
        ports: ["5432:5432"]
        options: --health-cmd pg_isready --health-interval 5s
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - uses: actions/setup-python@v5
        with: { python-version: "3.11" }
      # Foundry para Anvil
      - uses: foundry-rs/foundry-toolchain@v1
      # Postgres init
      - name: Apply Supabase schema
        run: psql postgresql://postgres:postgres@localhost:5432/civicsys -f infra/supabase/init.sql
        env: { PGPASSWORD: postgres }
      # Boot Anvil background
      - run: anvil --chain-id 31337 --block-time 2 &
      - run: sleep 3
      # Compile + deploy
      - name: Deploy contracts
        working-directory: blockchain
        run: |
          pnpm install --frozen-lockfile
          pnpm exec hardhat compile
          pnpm exec hardhat run scripts/deploy-local.ts --network localhost
      # Backend + agents en background
      - name: Start backend Node
        working-directory: backend
        run: |
          pnpm install --frozen-lockfile
          REG=$(jq -r '.contracts.CitizenRegistry' ../blockchain/deployments/localhost.json)
          VOTE=$(jq -r '.contracts.Vote' ../blockchain/deployments/localhost.json)
          CHAIN_ID=31337 REGISTRY_ADDRESS=$REG VOTE_ADDRESS=$VOTE DATABASE_URL=postgresql://postgres:postgres@localhost:5432/civicsys pnpm dev &
      - name: Start agents Python
        working-directory: agents
        run: |
          pip install -e ".[dev]"
          REG=$(jq -r '.contracts.CitizenRegistry' ../blockchain/deployments/localhost.json)
          VOTE=$(jq -r '.contracts.Vote' ../blockchain/deployments/localhost.json)
          CHAIN_ID=31337 REGISTRY_ADDRESS=$REG VOTE_ADDRESS=$VOTE RPC_URL=http://localhost:8545 DATABASE_URL=postgresql://postgres:postgres@localhost:5432/civicsys ANTHROPIC_API_KEY=sk-fake uvicorn app.main:app --port 8000 &
      - run: sleep 5
      # Frontend + Playwright
      - name: Install + run E2E
        working-directory: frontend/civicsys
        run: |
          pnpm install --frozen-lockfile
          pnpm exec playwright install --with-deps chromium
          pnpm test:e2e
```

> **Decisión Sprint 1**: si tu free tier de GitHub Actions tiene los runners ocupados con otros proyectos, el E2E lo podés tener **manualmente local** y solo correr los 4 unit jobs en CI. Cuando haya bandwidth, agregar el job E2E.

- [ ] **Step 1**: Decidir si agregás el job E2E o lo dejás manual. Si lo agregás, copiar el snippet de arriba al final de `ci.yml`.

- [ ] **Step 2**: Commit (si se agregó)

```bash
git add .github/workflows/ci.yml
git commit -m "ci(I.4): job E2E opcional con Anvil + Postgres + backend + agents + Playwright"
```

---

## Task I.5 — README badge + verificación final

**Files**: Modify `README.md` raíz.

- [ ] **Step 1**: Agregar badge de CI status al README raíz

Editar (manualmente, o con sed):

```markdown
# CivicSys — SSC ANTIPEREZA

[![CI](https://github.com/SandroChavez/CivicSys/actions/workflows/ci.yml/badge.svg)](https://github.com/SandroChavez/CivicSys/actions/workflows/ci.yml)
```

- [ ] **Step 2**: Commit

```bash
git add README.md
git commit -m "ci(I.5): badge de CI status en README raíz"
```

---

## Criterios de done del Bloque I

- [ ] `.github/workflows/ci.yml` con 5 jobs (4 unit + gitleaks).
- [ ] Los 5 jobs verde en al menos 1 PR / push a main.
- [ ] Branch protection rule configurada (al menos soft).
- [ ] (Opcional Sprint 1) job E2E corre Playwright contra stack completa.
- [ ] Badge en README raíz.

**Gate humano antes de Bloque J**: Orlando verifica un run verde de CI. Aprueba pasar a cleanup deuda Sprint 2.
