# Despliegue de CivicSys — Vercel + Railway (guía detallada)

Guía paso a paso para publicar CivicSys en la nube usando **Vercel** (frontend) y
**Railway** (backend Node, agente Hermes y Postgres), partiendo de **una cuenta Gmail
nueva**. Pensada para alguien que nunca configuró estos servicios.

> **Arquitectura del despliegue**
>
> | Componente | Carpeta | Plataforma | Puerto/URL |
> |---|---|---|---|
> | Frontend (Next.js 16) | `frontend/civicsys` | **Vercel** | `https://<tu-app>.vercel.app` |
> | Backend BFF (Node/Express/tRPC) | `backend` | **Railway** | `https://<backend>.up.railway.app` |
> | Hermes (Python/FastAPI) | `agents` | **Railway** (Dockerfile) | `https://<hermes>.up.railway.app` |
> | Postgres + pgvector | — | **Railway** (plugin) | `DATABASE_URL` interna |
> | Contratos (Solidity) | `blockchain` | **zkSYS Testnet** (zkTanenbaum, chain **57057**) | RPC `https://rpc-zk.tanenbaum.io` |
>
> El ciudadano firma sus transacciones con **MetaMask** (no custodial); el backend solo lee on-chain.

---

## Parte 0 — Crear las cuentas (con un Gmail nuevo)

### 0.1 Cuenta Gmail nueva
1. Andá a <https://accounts.google.com/signup>.
2. Completá nombre, usuario (ej. `civicsys.demo@gmail.com`) y contraseña.
3. Verificá con un número de teléfono (Google lo pide casi siempre).
4. Guardá usuario + contraseña en un gestor (ej. Bitwarden). Activá **verificación en 2 pasos** (Seguridad → Verificación en 2 pasos): GitHub/Vercel/Railway lo van a apreciar.

### 0.2 GitHub (hospeda el código y conecta el deploy)
1. <https://github.com/signup> → usá el Gmail nuevo.
2. Verificá el correo (link que llega al Gmail).
3. Activá 2FA (Settings → Password and authentication → Two-factor).
4. Creá un repositorio (o subí este). Ver **Parte 1**.

### 0.3 Vercel (frontend)
1. <https://vercel.com/signup> → **Continue with GitHub** (recomendado: así Vercel ve tus repos).
2. Autorizá a Vercel a leer tu cuenta de GitHub.
3. El plan **Hobby (gratis)** alcanza para la demo.

### 0.4 Railway (backend + Hermes + Postgres)
1. <https://railway.app> → **Login** → **Login with GitHub**.
2. Autorizá Railway.
3. Plan gratuito: incluye crédito mensual de prueba (suficiente para una demo). Si pide
   verificación, conectá una tarjeta o usá el trial. **Railway suele pedir verificar identidad
   con GitHub o tarjeta antes de permitir deploys públicos.**

### 0.5 Gemini API key (para el análisis de Hermes)
1. <https://aistudio.google.com/apikey> → iniciá sesión con el **mismo Gmail**.
2. **Create API key** → copiala (formato `AIza...`).
3. Guardala; va como variable `GEMINI_API_KEY` en Railway (Hermes). **Nunca** la commitees.

### 0.6 (Opcional) MetaMask + gas de testnet
1. Instalá la extensión MetaMask (<https://metamask.io>).
2. Agregá la red **zkSYS Testnet (zkTanenbaum)** manualmente:
   - RPC: `https://rpc-zk.tanenbaum.io`
   - Chain ID: `57057`
   - Símbolo: `TSYS`
   - Explorer: `https://explorer-zk.tanenbaum.io`
3. Pedí gas en el faucet: <https://faucet-zk.tanenbaum.io/> (pegá tu address).

---

## Parte 1 — Subir el código a GitHub

Desde la raíz del repo (`CivicSys/`):

```bash
git init                       # si todavía no es repo
git add .
git commit -m "deploy: preparar CivicSys para Vercel + Railway"
# Crear el repo vacío en github.com/new (ej. "civicsys"), luego:
git remote add origin https://github.com/<tu-usuario>/civicsys.git
git branch -M main
git push -u origin main
```

> ⚠️ **Verificá que NO se suban secretos**: `.env`, `.env.local`, `.env.hermes` están en
> `.gitignore` (patrón `.env` / `.env.*`). Confirmá con `git status` que no aparezcan.
> El repo ya trae `pre-commit` con **gitleaks** (`pip install pre-commit && pre-commit install`).

---

## Parte 2 — Postgres en Railway

1. En Railway: **New Project** → **Provision PostgreSQL**.
2. Abrí el servicio Postgres → pestaña **Variables** → copiá `DATABASE_URL` (formato
   `postgresql://postgres:...@...railway.app:5432/railway`).
3. **Aplicar el schema** (`infra/supabase/init.sql` crea `hermes_reports`, `proposals_cache`,
   `hermes_memory` + extensión `pgvector`). Railway no corre `init.sql` solo. Opciones:
   - **Desde tu máquina** (con `psql` instalado):
     ```bash
     psql "<DATABASE_URL-publica-de-Railway>" -f infra/supabase/init.sql
     ```
   - O pegá el contenido de `init.sql` en la pestaña **Data → Query** de Railway.
4. Verificá la extensión: `CREATE EXTENSION IF NOT EXISTS vector;` (init.sql ya lo incluye).

---

## Parte 3 — Hermes (agente Python) en Railway

`agents/` ya tiene `Dockerfile`, así que Railway lo construye directo.

1. Railway → en el mismo proyecto → **New** → **GitHub Repo** → elegí `civicsys`.
2. **Settings → Root Directory** = `agents`.
3. **Settings → Build**: Railway detecta el `Dockerfile` automáticamente. Si no, elegí
   "Dockerfile" como builder.
4. **Variables** (Settings → Variables → RAW editor):
   ```
   CHAIN_ID=57057
   RPC_URL=https://rpc-zk.tanenbaum.io
   REGISTRY_ADDRESS=<IdentitySBT desplegado en zkTanenbaum — ver Parte 6>
   VOTE_ADDRESS=<Vote desplegado en zkTanenbaum — ver Parte 6>
   DATABASE_URL=${{Postgres.DATABASE_URL}}   # referencia al servicio Postgres del proyecto
   GEMINI_API_KEY=AIza...                    # tu key de 0.5
   LLM_MODEL_GEMINI=gemini-3.5-flash
   API_HOST=0.0.0.0
   API_PORT=${{PORT}}                        # Railway inyecta $PORT
   CORS_ORIGINS=https://<tu-app>.vercel.app
   ```
   > `${{Postgres.DATABASE_URL}}` es la sintaxis de **referencia entre servicios** de Railway.
   > Si el Dockerfile fija `--port 8000`, cambialo a `--port $PORT` o exponé 8000 y mapealo.
5. **Settings → Networking → Generate Domain** → copiá la URL pública (`https://<hermes>.up.railway.app`).
6. Probá: `https://<hermes>.up.railway.app/agents/health` → debe responder
   `{"status":"ok", ... "gemini_key":true}`.

---

## Parte 4 — Backend BFF (Node) en Railway

1. Railway → **New** → **GitHub Repo** → `civicsys` (otra vez, otro servicio).
2. **Root Directory** = `backend`.
3. **Build**: Nixpacks detecta Node. Comandos (Settings → Deploy):
   - Build: `pnpm install && pnpm build`  (o dejá que Nixpacks infiera)
   - Start: `pnpm start`  (corre `node dist/server.js`)  ·  alternativa sin build: `pnpm dev` (`tsx src/server.ts`)
4. **Variables**:
   ```
   CHAIN_ID=57057
   RPC_URL=https://rpc-zk.tanenbaum.io
   REGISTRY_ADDRESS=<IdentitySBT en zkTanenbaum>
   VOTE_ADDRESS=<Vote en zkTanenbaum>
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   PORT=${{PORT}}
   CORS_ORIGIN=https://<tu-app>.vercel.app
   ```
5. **Generate Domain** → copiá `https://<backend>.up.railway.app`.
6. Probá: `https://<backend>.up.railway.app/health` → `{"status":"ok","chain":"57057"}`.

---

## Parte 5 — Frontend (Next.js) en Vercel

1. Vercel → **Add New… → Project** → importá `civicsys` desde GitHub.
2. **Root Directory** = `frontend/civicsys`  (click *Edit* y seleccioná la subcarpeta).
3. Framework: **Next.js** (autodetectado). Build command y output: dejar por defecto.
   - Package manager: Vercel detecta `pnpm` por el `pnpm-lock.yaml`. Si falla, en
     *Settings → General → Install Command* poné `pnpm install`.
4. **Environment Variables** (Settings → Environment Variables):
   ```
   NEXT_PUBLIC_CHAIN_ID=57057
   NEXT_PUBLIC_RPC_URL=https://rpc-zk.tanenbaum.io
   NEXT_PUBLIC_ZKSYS_RPC_URL=https://rpc-zk.tanenbaum.io
   NEXT_PUBLIC_PUBLIC_SALT=<el MISMO salt que usan backend y deploy de contratos>
   NEXT_PUBLIC_TRPC_URL=https://<backend>.up.railway.app/trpc
   NEXT_PUBLIC_HERMES_URL=https://<hermes>.up.railway.app
   ```
   > `PUBLIC_SALT` debe ser **idéntico** en frontend, backend y en el deploy de contratos,
   > o los hashes de identidad no coinciden. Generá uno con `openssl rand -hex 32` y reusalo.
5. **Deploy**. Vercel te da `https://<tu-app>.vercel.app`.
6. **Volvé a Railway** y poné esa URL exacta en `CORS_ORIGIN` (backend) y `CORS_ORIGINS`
   (Hermes); redeploy ambos. Sin esto, el navegador bloquea las llamadas por CORS.

---

## Parte 6 — Contratos en zkSYS Testnet (zkTanenbaum)

> Solo si querés la demo **on-chain real** (no Anvil local). Recordá que la testnet zkSYS fue
> reseteada (AirBender) y restablecida — pedí gas fresco en el faucet.

1. Conseguí una **wallet de deploy** con TSYS de gas (faucet 0.6). Exportá su private key.
2. En `blockchain/.env`:
   ```
   RPC_URL=https://rpc-zk.tanenbaum.io
   CHAIN_ID=57057
   DEPLOYER_PRIVATE_KEY=0x<clave-con-gas>     # NUNCA una key de mainnet
   PUBLIC_SALT=<el mismo salt de todos los componentes>
   ```
3. Desplegá:
   ```bash
   cd blockchain
   pnpm install
   pnpm exec hardhat run scripts/deploy-zktanenbaum.ts --network zktanenbaum
   ```
4. El script escribe las direcciones (probablemente en `deployments/zktanenbaum.json`).
   **Copialas** a:
   - Railway Hermes → `REGISTRY_ADDRESS`, `VOTE_ADDRESS`
   - Railway backend → `REGISTRY_ADDRESS`, `VOTE_ADDRESS`
   - Frontend: actualizá el JSON de direcciones que consume `frontend/civicsys/lib/abi/`
     (hoy lee `localhost.json`; para prod, agregá/seleccioná el de zkTanenbaum) y commiteá.
5. Redeploy de los 3 servicios.

---

## Parte 7 — Checklist final (smoke test en prod)

```bash
# Backend
curl https://<backend>.up.railway.app/health           # {"status":"ok","chain":"57057"}
# Hermes
curl https://<hermes>.up.railway.app/agents/health     # {"status":"ok",...,"gemini_key":true}
curl https://<hermes>.up.railway.app/agents/status     # swarm + 4 advisors
# Frontend
curl -I https://<tu-app>.vercel.app                    # HTTP 200
```

En el navegador: abrí la app, conectá MetaMask en zkTanenbaum, y recorré
`/registro → /votacion → /hermes → /toxica → /sistema`.

---

## Troubleshooting

| Síntoma | Causa probable | Fix |
|---|---|---|
| Frontend carga pero "No pude contactar a Hermes" | `NEXT_PUBLIC_HERMES_URL` mal o CORS | Verificá la URL de Railway y que `CORS_ORIGINS` del Hermes incluya el dominio Vercel |
| Llamadas al backend dan error CORS | `CORS_ORIGIN` no coincide | Poné la URL Vercel EXACTA (sin `/` final) y redeploy |
| Hermes responde `gemini_key:false` | Falta `GEMINI_API_KEY` | Agregala en Variables de Railway y redeploy |
| Hermes crashea al boot (pydantic ValidationError) | Falta `REGISTRY_ADDRESS`/`VOTE_ADDRESS`/`RPC_URL`/`DATABASE_URL` | Son **requeridos** (ver `agents/app/settings.py`); completalos |
| `relation "hermes_reports" does not exist` | No corriste `init.sql` | Aplicá `infra/supabase/init.sql` al Postgres de Railway (Parte 2.3) |
| Vercel no encuentra el proyecto Next | Root Directory mal | Debe ser `frontend/civicsys` |
| Build de Hermes lento/falla | Builder equivocado | Forzá **Dockerfile** como builder en Railway |
| Lecturas on-chain vacías | Direcciones de contrato desincronizadas | Mismas addresses en frontend, backend y Hermes; redeploy |

---

## Resumen de variables por servicio

**Vercel (frontend)** — todas `NEXT_PUBLIC_*`: `CHAIN_ID`, `RPC_URL`, `ZKSYS_RPC_URL`,
`PUBLIC_SALT`, `TRPC_URL`, `HERMES_URL`.

**Railway · backend**: `CHAIN_ID`, `RPC_URL`, `REGISTRY_ADDRESS`, `VOTE_ADDRESS`,
`DATABASE_URL`, `PORT`, `CORS_ORIGIN`.

**Railway · Hermes**: `CHAIN_ID`, `RPC_URL`, `REGISTRY_ADDRESS`, `VOTE_ADDRESS`,
`DATABASE_URL`, `GEMINI_API_KEY`, `LLM_MODEL_GEMINI`, `API_HOST`, `API_PORT`, `CORS_ORIGINS`.

**Railway · Postgres**: provee `DATABASE_URL` (referenciala con `${{Postgres.DATABASE_URL}}`).

> Regla de oro: **un solo `PUBLIC_SALT`** en todos lados, y las **mismas direcciones de
> contrato** en frontend + backend + Hermes.
