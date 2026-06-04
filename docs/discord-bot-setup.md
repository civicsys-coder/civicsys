# Bots de Hermes en Discord — setup y entrega (hackathon)

La entrega son **DOS bots** que corren en el canal de tu equipo (servidor **"AI Playground"**,
`discord.gg/3TaNfuFS`). Cada uno es **una app + un token de Discord aparte**. Ambos hablan con
la misma API de Hermes (FastAPI), así que **Hermes tiene que estar arriba**.

| Bot | Archivo | Token (env) | Para qué |
|---|---|---|---|
| **CivicSys** | `agents/discord_bot.py` | `DISCORD_CIVICSYS_TOKEN` | Que la gente se **registre**, **vote** y consulte al **Concilio** |
| **La Tóxica** | `agents/discord_bot_toxica.py` | `DISCORD_TOXICA_TOKEN` | **Reporta** en el canal cómo votó el **senado** vs el **pueblo** y señala la brecha |

> ⏰ **Deadline: jueves 4 a las 23:59.** Presentaciones en vivo 4/6, 14:00–17:00.

---

## Comandos

**CivicSys** (slash `/` y prefijo `!`, y responde a @menciones):
`/ayuda` · `/propuestas` · `/concilio <id>` · `/preguntar <texto>` · `/votar <id>` · `/registrarse`

**La Tóxica**:
`/ayuda` · `/toxica <id> [transcripción]` · `/brecha <id>`

> El **voto no se firma dentro de Discord** a propósito: es on-chain y no-custodial.
> `/votar` te manda a la web a firmar con MetaMask.

---

## Paso 1 — Crear DOS apps en Discord

Repetí esto **dos veces** en <https://discord.com/developers/applications>:

1. **New Application** → nombrala (1ª: `CivicSys`, 2ª: `La Tóxica`) → Create.
2. Menú **Bot** → activá **MESSAGE CONTENT INTENT** (ON) → guardá.
3. **Reset Token** → **Copy** (se muestra una sola vez).
4. **General Information** → copiá el **Application ID** (lo necesito para armarte el link de invitación).

Vas a terminar con **2 tokens** y **2 Application IDs**.

## Paso 2 — Poner los dos tokens

En `agents/.env`:
```
DISCORD_CIVICSYS_TOKEN=token-del-bot-CivicSys
DISCORD_TOXICA_TOKEN=token-del-bot-La-Toxica
HERMES_URL=http://localhost:8000      # en prod: la URL del Hermes de Railway
APP_URL=http://localhost:3000         # en prod: la URL del frontend de Vercel
```
(`.env` está gitignored — los tokens no se commitean.)

## Paso 3 — Invitar los dos bots al servidor

Por cada bot: **OAuth2 → URL Generator** → scopes `bot` + `applications.commands` →
permisos `Send Messages`, `Embed Links`, `Read Message History`, `Use Slash Commands` →
copiá la URL → abrila → elegí el servidor → **Authorize**.

> Para **"AI Playground"** necesitás permiso de *Manage Server* (o que un admin del canal
> autorice). Si me pasás los 2 **Application ID**, te genero las 2 URLs ya armadas.

## Paso 4 — (Opcional) Slash commands instantáneos

Discord → Ajustes → **Avanzado** → **Modo desarrollador** → click derecho en el servidor →
**Copiar ID** → ponelo en `agents/.env` como `DISCORD_GUILD_ID`. (Sin esto, `!concilio 1` y
las @menciones funcionan igual al instante.)

## Paso 5 — Levantar Hermes y correr los dos bots

```bash
# 1) Hermes arriba (local):  bash infra/up.sh   ·  o usá el Hermes de Railway
#    (verificá: curl http://localhost:8000/agents/health → gemini_key true)

# 2) Dos procesos (dos terminales), desde agents/:
./.venv/Scripts/python.exe discord_bot.py          # bot CivicSys
./.venv/Scripts/python.exe discord_bot_toxica.py   # bot La Tóxica
```

Cuando veas `✅ CivicSys conectado…` y `🔥 La Tóxica conectada…`, probá en el canal.

---

## Guion de la presentación en vivo

1. **CivicSys** `/propuestas` → propuestas + tally on-chain.
2. **CivicSys** `/concilio 1` → ⭐ los 4 consejeros IA deliberan con Gemini y Hermes sintetiza.
3. **CivicSys** `/registrarse` y `/votar 1` → el puente al voto on-chain no-custodial.
4. **La Tóxica** `/toxica 1` → reporte de accountability **senado vs pueblo** + la brecha.
5. `@CivicSys ¿qué opinás de la propuesta 2?` → chat libre con el agente.

---

## Despliegue 24/7 (Railway)

Cada bot es un proceso aparte → **dos servicios worker** en Railway (root `agents`,
start `python discord_bot.py` y `python discord_bot_toxica.py`), con `HERMES_URL`/`APP_URL`
apuntando a los servicios desplegados y su token correspondiente. Ver `deployment-vercel-railway.md`.

---

## Troubleshooting

| Síntoma | Causa | Fix |
|---|---|---|
| Un bot offline | Token mal/faltante | Revisá `DISCORD_CIVICSYS_TOKEN` / `DISCORD_TOXICA_TOKEN` |
| `Falta DISCORD_*_TOKEN` al arrancar | `.env` sin ese token | Pegá el token (Paso 2) |
| Los `/comandos` no aparecen | Sync global tardío | Usá `!comando` o seteá `DISCORD_GUILD_ID` |
| `!comandos` no responden | Falta Message Content Intent | Activalo en el portal (Paso 1.2) en AMBAS apps |
| "no pude contactar a Hermes" | Hermes caído | `bash infra/up.sh` o revisá la URL de Railway |
| El Concilio tarda ~15-30s | 5 llamadas a Gemini | Normal; el bot muestra "pensando…" |
