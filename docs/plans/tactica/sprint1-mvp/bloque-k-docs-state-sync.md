# Bloque K · Documentación + State-sync AEGIS

**Objetivo**: Escribir `docs/testing-localhost.md` (guía paso a paso para que cualquier dev levante el demo), update del README raíz para reflejar Sprint 1 entregado, devlog AEGIS, mover plan a `executed/`, append cost-ledger. Cierre formal del Sprint 1.

**Tareas**: 5
**LOC estimado**: ~300
**Dependencias**: TODOS los bloques anteriores (0, A-J) cerrados.
**Coverage gate**: no aplica.

---

## Task K.1 — `docs/testing-localhost.md`

**Files**: Create `docs/testing-localhost.md`.

- [ ] **Step 1**: Crear guía completa

```bash
cat > docs/testing-localhost.md <<'EOF'
# Testing localhost · SSC ANTIPEREZA Sprint 1

Guía paso a paso para levantar el demo end-to-end en una máquina limpia.
Target: ≤30 minutos.

## Pre-requisitos

| Tool | Versión mínima | Instalar |
|---|---|---|
| Docker Desktop | 27.x | https://www.docker.com/products/docker-desktop |
| Node.js | 20+ | https://nodejs.org |
| Python | 3.11+ | https://www.python.org/downloads |
| Foundry (anvil) | latest | `curl -L https://foundry.paradigm.xyz \| bash && foundryup` |
| MetaMask | extension | https://metamask.io |
| jq | latest | `apt install jq` / `brew install jq` / `winget install jqlang.jq` |
| gitleaks (opcional) | latest | https://github.com/gitleaks/gitleaks/releases |

Para Anthropic API key:
- Crear cuenta en https://console.anthropic.com
- Generar API key
- (Opcional) Crear key de OpenRouter en https://openrouter.ai como fallback

## Setup paso a paso

### 1. Clonar y configurar el repo

```bash
git clone https://github.com/SandroChavez/CivicSys.git
cd CivicSys

# Copiar archivos .env.example y editarlos
cp .env.example .env
cp infra/.env.example infra/.env

# Editar .env raíz con tus API keys (Anthropic mínimo)
${EDITOR:-vi} .env
```

### 2. Levantar la infraestructura

```bash
bash infra/up.sh
```

Esto arranca:
- Postgres + pgvector en `localhost:54322`
- Anvil (EVM local) en `localhost:8545` (Chain ID 31337)

Verificar:

```bash
docker compose -f infra/docker-compose.yml ps
# Ambos servicios deberían estar "healthy" / "running"
```

### 3. Deploy de contratos a Anvil

```bash
cd blockchain
pnpm add
pnpm exec hardhat compile
pnpm exec hardhat run scripts/deploy-local.ts --network localhost
cd ..
```

Output esperado: addresses de `CitizenRegistry` y `Vote`, y los ABIs copiados a `shared/abis/`.

### 4. Configurar `.env` del backend Node

```bash
REG=$(jq -r '.contracts.CitizenRegistry' blockchain/deployments/localhost.json)
VOTE=$(jq -r '.contracts.Vote' blockchain/deployments/localhost.json)

cat > backend/.env <<EOF2
CHAIN_ID=31337
REGISTRY_ADDRESS=$REG
VOTE_ADDRESS=$VOTE
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/civicsys
PORT=4000
CORS_ORIGIN=http://localhost:3000
EOF2
```

### 5. Configurar `.env` del backend Python

```bash
cat > agents/.env <<EOF2
CHAIN_ID=31337
REGISTRY_ADDRESS=$REG
VOTE_ADDRESS=$VOTE
RPC_URL=http://localhost:8545
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/civicsys
ANTHROPIC_API_KEY=sk-ant-...   # ← reemplazar con tu key
EOF2
```

### 6. Configurar `.env.local` del frontend

```bash
cat > frontend/civicsys/.env.local <<'EOF2'
NEXT_PUBLIC_RPC_URL=http://localhost:8545
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_PUBLIC_SALT=ssc-antipereza-2026-publico
NEXT_PUBLIC_TRPC_URL=http://localhost:4000/trpc
EOF2
```

### 7. Arrancar los 3 servicios

En 3 terminales separadas:

```bash
# Terminal 1: backend Node
cd backend && pnpm add && pnpm dev
# → http://localhost:4000/trpc + /health

# Terminal 2: backend Python
cd agents
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
# → http://localhost:8000/agents/health

# Terminal 3: frontend
cd frontend/civicsys && pnpm add && pnpm dev
# → http://localhost:3000
```

### 8. Configurar MetaMask

1. Abrir MetaMask → Settings → Networks → Add network manually:
   - Network name: `Anvil local`
   - RPC URL: `http://localhost:8545`
   - Chain ID: `31337`
   - Currency symbol: `ETH`

2. Importar una cuenta Anvil:
   - Settings → Accounts → Import account
   - Private key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
     (Account 0 default de Anvil, NUNCA usar en mainnet)

### 9. Demo end-to-end

1. Abrir http://localhost:3000
2. Click "Conectar wallet" → seleccionar la cuenta importada de Anvil
3. NetworkBadge debería decir "Anvil local"
4. Click "Empezar · registro" → ingresar DNI `12345678` → "Registrar" → confirmar tx en MetaMask
5. Esperar ~4s (Anvil block-time 2s)
6. Ir a `/propuesta/1` → Click "Sí" → confirmar tx
7. Tally se actualiza en vivo
8. (Opcional) Esperar a que la propuesta cierre por timestamp o forzar `close` desde `cast`
9. Ir a `/dashboard` → ver el reporte de Hermes

## Troubleshooting

### "No deployment available for chainId 31337"

El frontend lee `blockchain/deployments/localhost.json`. Si no existe, redeploy:

```bash
bash infra/down.sh --purge && bash infra/up.sh
cd blockchain && pnpm exec hardhat run scripts/deploy-local.ts --network localhost
```

### MetaMask no se conecta

- Verificar que Anvil corre: `curl http://localhost:8545 -d '{"jsonrpc":"2.0","method":"eth_chainId","id":1}'` → debe responder `0x7a69`.
- Reset Account en MetaMask Settings → Advanced → Reset account (limpia nonce stale).

### Hermes no genera reportes

- Verificar Anthropic API key válida.
- Verificar logs de `agents/`: `docker logs ...` o stdout de uvicorn.
- Si LLM falla, el reporte se persiste con `provider="unavailable"` igual.

### Postgres connection refused

- `bash infra/down.sh --purge && bash infra/up.sh` para resetear el container y volumen.

## Testing automatizado

```bash
# Blockchain
cd blockchain && pnpm test:ci

# Backend Node
cd backend && pnpm test:ci

# Backend Python
cd agents && source .venv/bin/activate && pytest

# Frontend unit
cd frontend/civicsys && pnpm test:ci

# Frontend E2E (necesita toda la stack arriba)
cd frontend/civicsys && pnpm test:e2e
```

Todos con coverage gate ≥80% (hard-bloqueante en CI).

## Demo en zkTanenbaum testnet (opcional)

1. Conseguir TSYS del faucet (URL en Discord Syscoin canal #zk-testnet-faucet).
2. Configurar `DEPLOYER_PRIVATE_KEY` en `.env` raíz.
3. Deploy:
   ```bash
   cd blockchain && pnpm exec hardhat run scripts/deploy-zktanenbaum.ts --network zkTanenbaum
   ```
4. Configurar MetaMask con la red zkTanenbaum (Chain ID 57057, RPC `https://rpc-zk.tanenbaum.io`).
5. Repetir el demo flow contra testnet.
EOF
```

- [ ] **Step 2**: Commit

```bash
git add docs/testing-localhost.md
git commit -m "docs(K.1): guía testing-localhost paso a paso (setup ≤30 min · stack completa)"
```

---

## Task K.2 — Update README raíz reflejando Sprint 1 entregado

**Files**: Modify `README.md` raíz.

- [ ] **Step 1**: Leer el README actual

```bash
cat README.md | head -20
```

- [ ] **Step 2**: Update con sección de estado Sprint 1 + links a docs

Editar manualmente para que la sección "Sprint 1" diga:

```markdown
## Sprint 1 — Prototipo inicial · ENTREGADO 2026-05-XX

**Objetivo**: Demostrar el flujo end-to-end mínimo:

```
DNI + nombre → registro on-chain (hash) → voto en zkTanenbaum → Hermes lee eventos → reporte
```

### Plan AEGIS

Ver [docs/plans/executed/tactica/sprint1-mvp/00-INDEX.md](docs/plans/executed/tactica/sprint1-mvp/00-INDEX.md) (12 bloques · ~100 tareas · cobertura 80% cross-stack).

### Como correr el demo

Ver [docs/testing-localhost.md](docs/testing-localhost.md) (≤30 min en máquina limpia).

### CI

[![CI](https://github.com/SandroChavez/CivicSys/actions/workflows/ci.yml/badge.svg)](https://github.com/SandroChavez/CivicSys/actions/workflows/ci.yml)

Hard-gate ≥80% cobertura statements en Solidity + Node + Python + Frontend.
```

- [ ] **Step 3**: Commit

```bash
git add README.md
git commit -m "docs(K.2): README raíz refleja Sprint 1 entregado + links a AEGIS plan y testing-localhost"
```

---

## Task K.3 — Devlog AEGIS

**Files**: Create `docs/aegis/devlogs/2026-05-XX-sprint1-mvp.md`.

- [ ] **Step 1**: Crear estructura aegis devlogs si no existe

```bash
mkdir -p docs/aegis/devlogs
```

- [ ] **Step 2**: Devlog

```bash
TODAY=$(date +%Y-%m-%d)
cat > "docs/aegis/devlogs/${TODAY}-sprint1-mvp.md" <<'EOF'
# Sprint 1 MVP — SSC ANTIPEREZA

**Fecha**: 2026-05-XX (completar al cierre)
**Tag**: `sprint1-mvp`
**Plan táctico**: [`../../plans/executed/tactica/sprint1-mvp/00-INDEX.md`](../../plans/executed/tactica/sprint1-mvp/00-INDEX.md)
**Estado**: Cerrado.

## Resumen

Primer slice end-to-end demoable del SSC ANTIPEREZA. Implementa la narrativa
del PPT slide 1: "La IA asesora. El ciudadano supervisa. El blockchain firma.
Hermes orquesta — y todo queda trazable." en su forma mínima: 1 propuesta
hardcoded, 1 reporte template de Hermes, 1 happy path E2E.

## Bloques cerrados

- **Bloque 0**: prep · commit deuda Rollux→zkTanenbaum · scaffolding base.
- **Bloque A**: infra Docker (Postgres+pgvector + Anvil) + scripts up/down.
- **Bloque B**: contratos Solidity (`CitizenRegistry` + `Vote`) · ≥23 tests · coverage 100%.
- **Bloque C**: scripts deploy a Anvil + zkTanenbaum · `shared/abis/` versionados.
- **Bloque D**: types canónicos + zod schemas cross-stack.
- **Bloque E**: backend Node BFF · 3 routers tRPC · vitest 80% gate.
- **Bloque F**: backend Python · FastAPI + Hermes + LLM dual provider + pgvector embeddings · pytest 80% gate.
- **Bloque G**: frontend Next.js 14 + Tailwind + shadcn · 4 páginas · 3 componentes · vitest 80% gate.
- **Bloque H**: E2E Playwright con Anvil-injected wallet · 1 happy path verde.
- **Bloque I**: CI 4 jobs paralelos + gitleaks + branch protection.
- **Bloque J**: cleanup deuda · 41 task .md de Sprint 2 alertas archivadas (no borradas).
- **Bloque K**: docs + state-sync (este devlog).

## Métricas

- Total LOC implementación: ~XXXX (completar al cierre · medible con `cloc` o `git diff --stat`)
- Total LOC tests: ~XXXX
- Tests verde: XXX (suma de los 4 jobs unit + 1 E2E)
- Coverage Solidity: XX% statements
- Coverage Node: XX% statements
- Coverage Python: XX% statements
- Coverage Frontend: XX% statements
- Commits del sprint: ~100 (~7-8 por bloque)
- Days actually taken: 5 (vs 5 planeados)

## Cambios entregados

(Llenar al cierre con detalle por bloque, similar al devlog de SEELE Sprint-05.)

## Decisiones técnicas notables

1. **Anvil como surrogate de zkTanenbaum** — emular el zkRollup completo era impráctico para hackathon. Anvil cubre 99% del flow (EVM-compatible). Las features zk únicas se prueban en testnet real.
2. **Arquitectura mixta Node + Python** — Sandro pushó scaffolding Node en Sprint 2; PPT especifica Hermes nativo Python. Splitting: Node = BFF (lectura), Python = Hermes (escritura de reportes via LLM).
3. **Hard-gate 80% coverage cross-stack** — alineado con "quality from first pass" del PPT. CI bloquea merge si alguna capa baja.
4. **Una sola propuesta hardcoded en constructor** — para Sprint 1. Multi-propuesta dinámica defer a Sprint 2-3.
5. **LLM dual provider con fallback "unavailable"** — el demo no se cae si Anthropic/OpenRouter están caídos.

## Follow-ups identificados para Sprint 2-3

- 7 subagentes especializados (Jurídico, Económico, Ético, Anticorrupción, Verificador, Social, Ambiental, Transparencia) per PPT slide 10.
- Bot Telegram bridge (PPT slide 14 día 8-11).
- Dashboard de transparencia con métricas avanzadas (charts, embeddings similarity).
- VPS Hetzner + WireGuard + Cloudflare Tunnel (PPT slide 12).
- Bias Observatory público (PPT slide 17).
- Atestación DNI con autoridad estatal (post-MVP).
- Tool errors via MCP `isError: true` si se expone API MCP propia.

## Crédito al PPT (decisiones del producto)

Slide 1 (pitch) · Slide 6 (3 capas) · Slide 10 (Hermes + 8 subagentes) ·
Slide 13 (zkTanenbaum specs) · Slide 14 (roadmap 14 días) · Slide 17 (stack
técnico + métricas de éxito).

## Cierre AEGIS

- [ ] Devlog escrito (este archivo).
- [ ] Plan movido a `docs/plans/executed/tactica/sprint1-mvp/`.
- [ ] Cost-ledger appended.
- [ ] CLAUDE.md del repo actualizado (si aplica).
- [ ] Tag git `sprint1-mvp` creado.
EOF
```

- [ ] **Step 2**: Commit

```bash
git add docs/aegis/devlogs/
git commit -m "docs(K.3): devlog AEGIS Sprint 1 MVP — resumen de los 12 bloques + métricas"
```

---

## Task K.4 — Mover plan a `executed/` + cost-ledger

**Files**: Move `docs/plans/tactica/sprint1-mvp/` → `docs/plans/executed/tactica/sprint1-mvp/`.

- [ ] **Step 1**: Mover el plan completo

```bash
mkdir -p docs/plans/executed/tactica
git mv docs/plans/tactica/sprint1-mvp docs/plans/executed/tactica/sprint1-mvp
```

- [ ] **Step 2**: Append cost-ledger

```bash
mkdir -p docs/aegis/devlogs
cat >> docs/aegis/devlogs/cost-ledger.jsonl <<'EOF'
{"date":"2026-05-XX","plan_id":"civicsys-sprint1-mvp","phase":"tactica+ejecucion+state-sync","model":"claude-opus-4-7","input_tokens":"REPLACE_AT_CLOSE","output_tokens":"REPLACE_AT_CLOSE","cost_usd":"REPLACE_AT_CLOSE","duration_min":"REPLACE_AT_CLOSE","estimated":true,"notes":"Sprint 1 MVP SSC ANTIPEREZA — 12 bloques · ~100 tareas · stack mixta Node + Python · contratos Solidity zkTanenbaum/Anvil · coverage hard-gate 80% cross-stack · Docker Compose + CI 4 jobs + Playwright E2E."}
EOF
```

> **Nota**: completar los placeholders `REPLACE_AT_CLOSE` con los valores reales al final del sprint (igual que se hace en SEELE).

- [ ] **Step 3**: Commit

```bash
git add docs/plans/ docs/aegis/devlogs/cost-ledger.jsonl
git commit -m "docs(K.4): mover plan a executed/ + append cost-ledger Sprint 1 MVP"
```

---

## Task K.5 — Tag git `sprint1-mvp` + push final

**Files**: ninguno (git ops).

- [ ] **Step 1**: Tag

```bash
git tag -a sprint1-mvp -m "Sprint 1 MVP SSC ANTIPEREZA — demo end-to-end registro + voto + reporte Hermes contra Anvil/zkTanenbaum · coverage 80% cross-stack"
```

- [ ] **Step 2**: Push (sólo si Orlando aprueba — gate humano final)

```bash
git push origin main      # o feat/sprint1-mvp si trabajamos en rama
git push origin sprint1-mvp
```

- [ ] **Step 3**: Verificar en GitHub que CI pasa verde tras el push final.

---

## Criterios de done del Bloque K

- [ ] `docs/testing-localhost.md` completa y testeable.
- [ ] README raíz actualizado con badge CI + links.
- [ ] Devlog escrito con métricas reales.
- [ ] Plan en `docs/plans/executed/tactica/sprint1-mvp/`.
- [ ] Cost-ledger appended.
- [ ] Tag `sprint1-mvp` creado.
- [ ] CI verde en main post-push.

**Gate humano FINAL del Sprint 1**: Orlando hace `bash infra/up.sh + deploy + servicios + pnpm test:e2e` en máquina limpia. Si corre verde, Sprint 1 cerrado. Apto para presentar al equipo / mentor.
