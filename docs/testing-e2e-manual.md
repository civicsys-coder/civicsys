# Guía de pruebas E2E manuales · localhost

Checklist para corroborar el stack completo de CivicSys / SSC ANTIPEREZA capa por capa,
de abajo hacia arriba. Marcá cada `[ ]` a medida que verifiques.

> **Setup particular de este entorno:**
> - **Hermes (agents) corre en un contenedor Docker aislado** (`ssca-hermes`), no en un venv del host.
> - LLM = **Gemini** (`LLM_MODEL_GEMINI=gemini-flash-3.5`). La key va en `infra/.env.hermes`.
> - Backend Node y frontend Next.js corren en el **host**.
>
> **Windows / PowerShell:** los comandos `curl` de abajo funcionan tal cual en Git Bash.
> En PowerShell usá `curl.exe` (no el alias `curl`) para que la sintaxis `-d`/`-s` funcione.

---

## 0. Credenciales y datos de acceso

**No hay login usuario/contraseña.** El acceso a la dApp es por **wallet (MetaMask)**.
Las "credenciales" para entrar son las cuentas de prueba del nodo Anvil.

### Red local (agregar en MetaMask)

| Campo | Valor |
|---|---|
| Network name | `Anvil local` |
| RPC URL | `http://localhost:8545` |
| Chain ID | `31337` |
| Currency symbol | `ETH` |

### Cuentas Anvil (mnemónico `test test … junk`)

> ⚠️ **Claves de prueba PÚBLICAS y conocidas. NUNCA usarlas en mainnet ni con fondos reales.**

| # | Address | Private key (importar en MetaMask) |
|---|---------|-------------------------------------|
| 0 (deployer) | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| 1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| 2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |
| 3 | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` |
| 4 | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | `0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a` |

> Hay 10 cuentas en total (0–9), cada una con 10000 ETH. Para probar **varios votantes**,
> importá cuentas distintas (cada address se registra y vota una sola vez).

### Base de datos (Postgres en Docker)

| Campo | Valor |
|---|---|
| Host / puerto | `localhost:54330` |
| Usuario / password | `postgres` / `postgres` |
| Database | `civicsys` |
| Connection string | `postgresql://postgres:postgres@localhost:54330/civicsys` |

### Contratos desplegados (Anvil, chain 31337)

| Contrato | Address |
|---|---|
| CitizenRegistry | `0x5fbdb2315678afecb367f032d93f642f64180aa3` |
| Vote | `0xe7f1725e7734ce288f8367e1bb143e90bb3f0512` |

---

## 1. Capa infraestructura (Docker)

```bash
docker compose -f infra/docker-compose.yml ps
```

- [ ] `ssca-postgres` → `Up (healthy)`, puerto `54330`
- [ ] `ssca-anvil` → `Up`, puerto `8545`
- [ ] `ssca-hermes` → `Up`, puerto `8000`

```bash
# Anvil responde con chain 31337 (0x7a69)
curl -s http://localhost:8545 -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```
- [ ] Respuesta: `{"jsonrpc":"2.0","id":1,"result":"0x7a69"}`

```bash
docker exec ssca-postgres pg_isready -U postgres -d civicsys
```
- [ ] `accepting connections`

---

## 2. Capa base de datos

```bash
docker exec ssca-postgres psql -U postgres -d civicsys -c "\dt"
```
- [ ] Existen las tablas: `hermes_memory`, `hermes_reports`, `proposals_cache`, `sessions`

---

## 3. Capa contratos

```bash
cat blockchain/deployments/localhost.json
```
- [ ] `chainId: 31337`
- [ ] `contracts.CitizenRegistry` y `contracts.Vote` con las addresses de la sección 0
- [ ] Existe `seedProposal` con `id: 1`

```bash
# El código de los contratos está realmente en la cadena (no es 0x)
curl -s http://localhost:8545 -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_getCode","params":["0xe7f1725e7734ce288f8367e1bb143e90bb3f0512","latest"],"id":1}'
```
- [ ] `result` largo (bytecode), no `"0x"`

---

## 4. Capa backend Node (tRPC, host)

```bash
curl -s http://localhost:4000/health
```
- [ ] `{"status":"ok","chain":"31337"}`

```bash
curl -s "http://localhost:4000/trpc/proposals.list"
```
- [ ] Devuelve la propuesta 1, `"closed":false`, título "Demo Sprint 1 · Reforma del artículo 56…"

```bash
curl -s "http://localhost:4000/trpc/proposals.tally?input=%7B%22id%22%3A%221%22%7D"
```
- [ ] `{"result":{"data":{"yes":"0","no":"0","abstain":"0"}}}` (antes de votar)

```bash
# isRegistered de la cuenta 0 (aún sin registrar)
curl -s "http://localhost:4000/trpc/citizens.isRegistered?input=%7B%22address%22%3A%220xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266%22%7D"
```
- [ ] `{"result":{"data":false}}`

```bash
curl -s "http://localhost:4000/trpc/reports.list?input=%7B%7D"
```
- [ ] `{"result":{"data":[]}}` (sin reportes todavía)

---

## 5. Capa Hermes (agents, Docker aislado)

```bash
curl -s http://localhost:8000/agents/health
```
- [ ] `{"status":"ok","chain_id":31337,"agent":"hermes","version":"0.1.0"}`

```bash
docker logs ssca-hermes --tail 5
```
- [ ] `Application startup complete.` / `Uvicorn running on http://0.0.0.0:8000`

**Gemini configurado (key):**
```bash
docker exec ssca-hermes python -c "from app.settings import get_settings as g; s=g(); print('model:', s.llm_model_gemini, '| key set:', bool(s.gemini_api_key) and not s.gemini_api_key.startswith('<'))"
```
- [ ] `model: gemini-flash-3.5 | key set: True` ← si dice `False`, pegá tu key en `infra/.env.hermes` y `docker compose -f infra/docker-compose.yml up -d hermes`

---

## 6. Capa frontend (Next.js, host)

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000
```
- [ ] `200`

En el navegador, abrí **http://localhost:3000**:
- [ ] Carga la landing "CivicSys · SSC ANTIPEREZA"
- [ ] Botón **"Conectar wallet"** visible
- [ ] **NetworkBadge** presente en el header

---

## 7. Flujo E2E de usuario (navegador + MetaMask)

### 7.1 Conectar wallet
1. MetaMask → agregá la red **Anvil local** (sección 0) e importá la **cuenta 0**.
2. En http://localhost:3000 → **"Conectar wallet"** → elegí la cuenta Anvil.

- [ ] Wallet conectada (se ve la address)
- [ ] **NetworkBadge** dice **"Anvil local"** (chain 31337). Si dice "red incorrecta", cambiá de red en MetaMask.

### 7.2 Registrarse como ciudadano
1. Ir a **"Empezar / registro"** (`/registro`).
2. Ingresar DNI de 8 dígitos, ej. `12345678`.
3. Aparece preview `Hash on-chain: …` → click **"Registrar"** → **confirmar tx en MetaMask**.

- [ ] El botón NO está deshabilitado por "salt no configurado" (el salt está en `.env.local`)
- [ ] MetaMask abre la confirmación y la tx se mina (~2-4 s, block-time 2 s)
- [ ] Verificación API:
  ```bash
  curl -s "http://localhost:4000/trpc/citizens.isRegistered?input=%7B%22address%22%3A%220x<TU_ADDRESS>%22%7D"
  ```
  → `"data":true`

### 7.3 Votar
1. Ir a **`/propuesta/1`**.
2. Se ve el título y el tally en vivo (Sí / No / Abstención), refrescando cada 5 s.
3. Como estás registrado y la propuesta está abierta, aparecen los 3 botones + un aviso de visibilidad del voto.
4. Click **"Sí"** (choice 0) → **confirmar tx en MetaMask**.

- [ ] La tx se confirma
- [ ] El contador **"Sí"** sube a `1` (esperá ~2-4 s; refresca solo)
- [ ] Verificación API:
  ```bash
  curl -s "http://localhost:4000/trpc/proposals.tally?input=%7B%22id%22%3A%221%22%7D"
  ```
  → `"yes":"1"`
- [ ] (Opcional) Intentar votar de nuevo con la misma cuenta → la tx revierte (un voto por address)

> Choices: **0 = Sí · 1 = No · 2 = Abstención**.
> Para más votos, importá otra cuenta Anvil, registrala (7.2) y votá.

### 7.4 Dashboard de reportes Hermes
1. Ir a **`/dashboard`**.

- [ ] La página carga sin error
- [ ] Lista de reportes (vacía hasta que Hermes genere alguno).

> **Nota Gemini:** con `gemini-flash-3.5` (modelo inexistente en la API de Google) las
> llamadas LLM devuelven 404 y el reporte saldría con `llmProvider="unavailable"`.
> Para análisis real, poné un modelo válido en `LLM_MODEL_GEMINI` (`infra/.env`,
> ej. `gemini-2.5-flash`) + key en `infra/.env.hermes`, y reiniciá Hermes.

---

## 8. Verificación de persistencia (DB)

```bash
# Reportes generados por Hermes (si los hubo)
docker exec ssca-postgres psql -U postgres -d civicsys -c "SELECT id, proposal_id, llm_provider, confidence, created_at FROM hermes_reports ORDER BY created_at DESC LIMIT 5;"
```
- [ ] Filas presentes si Hermes generó reportes (o vacío si aún no)

---

## 9. Reset / troubleshooting

| Síntoma | Acción |
|---|---|
| "No deployment available for chainId 31337" en el front | Re-deploy: `cd blockchain && pnpm exec hardhat run scripts/deploy-local.ts --network localhost` |
| MetaMask no firma / nonce raro | MetaMask → Settings → Advanced → **Reset account** |
| Tally no sube | Esperá un bloque (2 s) y verificá la tx en MetaMask; confirmá que estás en chain 31337 |
| Quiero empezar de cero (borra datos) | `bash infra/down.sh --purge && bash infra/up.sh` + re-deploy contratos |
| Reiniciar solo Hermes (tras editar la key) | `docker compose -f infra/docker-compose.yml up -d hermes` |

### Levantar todo desde cero (orden)
```bash
docker compose -f infra/docker-compose.yml --env-file infra/.env up -d postgres anvil
cd blockchain && pnpm compile && pnpm exec hardhat run scripts/deploy-local.ts --network localhost && cd ..
docker compose -f infra/docker-compose.yml --env-file infra/.env up -d --build hermes
cd backend && pnpm dev          # terminal aparte → :4000
cd frontend/civicsys && pnpm dev  # terminal aparte → :3000
```
