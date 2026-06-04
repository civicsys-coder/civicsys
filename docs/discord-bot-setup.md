# Hermes en Discord — setup y entrega (hackathon)

El bot **Hermes** (`agents/discord_bot.py`) es la entrega: el agente de supervisión
ciudadana de CivicSys, operando en el canal de tu equipo del servidor **"AI Playground"**.
Habla con la API de Hermes (FastAPI) por HTTP, así que **Hermes tiene que estar arriba**.

> ⏰ **Deadline: jueves 4 a las 23:59.** Presentaciones en vivo 4/6, 14:00–17:00.
> Entrega: en el canal de Discord de tu equipo en "AI Playground" (`discord.gg/3TaNfuFS`).

---

## Comandos del bot

Funcionan como **slash** (`/concilio`) y como **prefijo** (`!concilio`). También responde si lo **@mencionás**.

| Comando | Qué hace |
|---|---|
| `/ayuda` | Lista de comandos |
| `/propuestas` | Propuestas activas con su tally |
| `/concilio <id>` | **El Concilio**: 4 consejeros IA con sesgos opuestos deliberan en paralelo + síntesis con veredicto y disenso |
| `/preguntar <texto>` | Preguntale cualquier cosa a Hermes |
| `/toxica <id>` | La Tóxica: accountability congreso ↔ ciudadanía (borrador, human-in-the-loop) |
| `/votar <id>` | Link para votar en la web (firmás con tu wallet, on-chain, no-custodial) |
| `/registrarse` | Registro único cross-canal (multicanal) |

> El **voto no se firma dentro de Discord** a propósito: es on-chain y no-custodial
> (Hermes nunca toca tu clave). `/votar` te manda a la web a firmar con MetaMask.

---

## Paso 1 — Crear la app y el bot en Discord

1. Andá a <https://discord.com/developers/applications> (logueado con tu cuenta de Discord).
2. **New Application** → nombre `Hermes CivicSys` → Create.
3. Menú izquierdo → **Bot**.
4. **Privileged Gateway Intents** → activá **MESSAGE CONTENT INTENT** (ON). Es lo que
   permite los comandos con `!` y responder a @menciones. Guardá los cambios.
5. **Reset Token** → **Copy**. Ese es tu `DISCORD_BOT_TOKEN` (se muestra una sola vez).

## Paso 2 — Poner el token

Pegá el token en `agents/.env`:

```
DISCORD_BOT_TOKEN=el-token-que-copiaste
HERMES_URL=http://localhost:8000
APP_URL=http://localhost:3000
```

(El `.env` está gitignored — el token no se commitea.)

## Paso 3 — Invitar el bot al servidor

1. En el portal → **OAuth2** → **URL Generator**.
2. **Scopes**: marcá `bot` **y** `applications.commands`.
3. **Bot Permissions**: `Send Messages`, `Embed Links`, `Read Message History`,
   `Use Slash Commands`.
4. Copiá la **Generated URL** (abajo), abrila en el navegador.
5. Elegí el **servidor** y **Authorize**.
   - Para **"AI Playground"**: necesitás permiso de *Manage Server* ahí, o que un admin
     del servidor/tu canal autorice el bot. Si no podés invitarlo vos, pasale la URL a
     quien administre el canal del equipo. (Para probar ya mismo, invitalo a un servidor
     tuyo de prueba.)

## Paso 4 — (Opcional) Slash commands instantáneos

Los slash commands globales pueden tardar hasta 1 h en aparecer. Para que aparezcan **ya**
en un servidor concreto:

1. Discord → Ajustes → **Avanzado** → activá **Modo desarrollador**.
2. Click derecho en el servidor → **Copiar ID del servidor**.
3. Ponelo en `agents/.env`: `DISCORD_GUILD_ID=ese-id`.

Mientras tanto, **`!concilio 1` y @menciones funcionan al instante** (no esperan sync).

## Paso 5 — Levantar Hermes y correr el bot

```bash
# 1) Hermes arriba (stack local):
bash infra/up.sh                       # postgres + anvil + hermes (Docker)
# (verificá: curl http://localhost:8000/agents/health  →  status ok, gemini_key true)

# 2) El bot (otra terminal), desde agents/:
cd agents
./.venv/Scripts/python.exe discord_bot.py
```

Cuando veas `✅ Hermes conectado como Hermes CivicSys#1234`, andá al canal y probá
`/ayuda` o `/concilio 1`.

---

## Para la presentación en vivo (guion sugerido)

1. `/propuestas` — muestra las propuestas y el tally on-chain.
2. `/concilio 1` — **el momento estrella**: 4 consejeros IA (Ejecutor, Garantista,
   Escéptico, Primeros Principios) deliberan en paralelo con Gemini y Hermes sintetiza un
   veredicto con disenso registrado.
3. `/toxica 1` — La Tóxica redacta un post de accountability (borrador, aprobás vos).
4. `@Hermes ¿qué opinás de la propuesta 2?` — chat libre con el agente.
5. `/votar 1` — cierra mostrando el puente al voto on-chain no-custodial en la web.

---

## Despliegue 24/7 (opcional, después de la demo)

Para que el bot quede prendido sin tu compu, corré `discord_bot.py` en un worker (ej. un
servicio de Railway) con `HERMES_URL`/`APP_URL` apuntando a los servicios desplegados
(ver `docs/deployment-vercel-railway.md`).

---

## Troubleshooting

| Síntoma | Causa | Fix |
|---|---|---|
| El bot aparece offline | Token mal o falta | Revisá `DISCORD_BOT_TOKEN` en `agents/.env` |
| `Falta DISCORD_BOT_TOKEN` al arrancar | `.env` sin token | Pegá el token (Paso 2) |
| Los `/comandos` no aparecen | Sync global tardío | Usá `!concilio 1` o seteá `DISCORD_GUILD_ID` |
| `!comandos` no responden | Falta Message Content Intent | Activalo en el portal (Paso 1.4) |
| "no pude contactar a Hermes" | Hermes caído | `bash infra/up.sh`; chequeá `:8000/agents/health` |
| El Concilio tarda ~15-30s | 5 llamadas a Gemini | Normal; el bot muestra "pensando…" (defer) |
