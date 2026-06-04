"""
Bot de Discord de Hermes (CivicSys) — el agente de supervisión ciudadana, en Discord.

Es la entrega del hackathon: corre en el canal del equipo (servidor "AI Playground").
Habla con la API de Hermes (FastAPI) por HTTP, así que Hermes debe estar arriba.

Comandos (funcionan como slash `/` y como prefijo `!`):
  /ayuda            — lista de comandos
  /propuestas       — propuestas activas con su tally
  /concilio <id>    — el Concilio (4 consejeros IA con sesgos opuestos) delibera y vota
  /preguntar <txt>  — preguntale a Hermes
  /toxica <id>      — La Tóxica: accountability congreso vs ciudadanía
  /votar <id>       — link para votar (firmás con tu wallet, on-chain, no-custodial)
  /registrarse      — registro único cross-canal (multicanal)
También responde si lo @mencionás.

Correr:  ./.venv/Scripts/python.exe discord_bot.py     (desde agents/, con agents/.env)
Env:  DISCORD_BOT_TOKEN (req) · HERMES_URL (def http://localhost:8000)
      APP_URL (def http://localhost:3000) · DISCORD_GUILD_ID (opcional → sync slash instantáneo)
"""

from __future__ import annotations

import os

import discord
import httpx
from discord.ext import commands

try:
    from dotenv import load_dotenv

    load_dotenv()  # carga agents/.env si existe
except Exception:  # python-dotenv siempre está (dep de pydantic-settings), pero por las dudas
    pass

HERMES_URL = os.getenv("HERMES_URL", "http://localhost:8000").rstrip("/")
APP_URL = os.getenv("APP_URL", "http://localhost:3000").rstrip("/")
TOKEN = os.getenv("DISCORD_BOT_TOKEN", "").strip()
GUILD_ID = os.getenv("DISCORD_GUILD_ID", "").strip()

RED = 0xC71828
POSTURA_EMOJI = {"A_FAVOR": "🟢", "EN_CONTRA": "🔴", "CAUTELA": "🟡"}

intents = discord.Intents.default()
intents.message_content = True  # privilegiado: activar en el Developer Portal
bot = commands.Bot(command_prefix="!", intents=intents, help_command=None)
_http = httpx.AsyncClient(timeout=90.0)


async def _get(path: str) -> dict:
    r = await _http.get(f"{HERMES_URL}{path}")
    r.raise_for_status()
    return r.json()


async def _post(path: str, json: dict) -> dict:
    r = await _http.post(f"{HERMES_URL}{path}", json=json)
    r.raise_for_status()
    return r.json()


def _clip(s: str, n: int) -> str:
    s = s or ""
    return s if len(s) <= n else s[: n - 1] + "…"


@bot.event
async def on_ready() -> None:
    try:
        if GUILD_ID:
            g = discord.Object(id=int(GUILD_ID))
            bot.tree.copy_global_to(guild=g)
            await bot.tree.sync(guild=g)
        else:
            await bot.tree.sync()
    except Exception as e:  # noqa: BLE001
        print("⚠ sync de slash commands falló:", e)
    print(f"✅ Hermes conectado como {bot.user}  ·  Hermes API: {HERMES_URL}")
    await bot.change_presence(activity=discord.Game(name="CivicSys · /ayuda"))


@bot.hybrid_command(name="ayuda", description="Lista de comandos de Hermes")
async def ayuda(ctx: commands.Context) -> None:
    e = discord.Embed(
        title="🏛️  Hermes · CivicSys",
        color=RED,
        description="Agente de supervisión ciudadana sobre **Syscoin / zkTanenbaum**.",
    )
    e.add_field(name="/propuestas", value="Propuestas activas y su tally", inline=False)
    e.add_field(name="/concilio `<id>`", value="El Concilio (4 consejeros IA) delibera y emite veredicto", inline=False)
    e.add_field(name="/preguntar `<texto>`", value="Preguntale a Hermes", inline=False)
    e.add_field(name="/toxica `<id>`", value="La Tóxica: accountability congreso vs ciudadanía", inline=False)
    e.add_field(name="/votar `<id>`", value="Link para votar (firmás con tu wallet, on-chain)", inline=False)
    e.add_field(name="/registrarse", value="Registro único cross-canal (multicanal)", inline=False)
    e.set_footer(text="$SYS es el camino 🚀")
    await ctx.reply(embed=e)


@bot.hybrid_command(name="propuestas", description="Lista las propuestas activas")
async def propuestas(ctx: commands.Context) -> None:
    await ctx.defer()
    try:
        data = await _get("/agents/proposals")
    except Exception as e:  # noqa: BLE001
        await ctx.reply(f"⚠ no pude contactar a Hermes ({HERMES_URL}): {e}")
        return
    props = data.get("proposals", [])
    e = discord.Embed(title="📋 Propuestas en curso", color=RED)
    for p in props[:10]:
        total = p["yes"] + p["no"] + p["abstain"]
        e.add_field(
            name=f"#{p['id']} · {_clip(p['title'], 200)}",
            value=f"{p.get('category', '')} · {p.get('status', '')} — "
            f"Sí {p['yes']} / No {p['no']} / Abst {p['abstain']}  ({total} votos)",
            inline=False,
        )
    await ctx.reply(embed=e)


@bot.hybrid_command(name="concilio", description="El Concilio Hermes delibera sobre una propuesta")
async def concilio(ctx: commands.Context, id: int = 1) -> None:
    await ctx.defer()
    try:
        d = await _post("/agents/concilio", {"proposal_id": id})
    except Exception as e:  # noqa: BLE001
        await ctx.reply(f"⚠ no pude contactar a Hermes ({HERMES_URL}): {e}")
        return
    p, v, dv = d["proposal"], d["verdict"], d["divergence"]
    e = discord.Embed(
        title=f"⚖️  Concilio Hermes · Propuesta #{p['id']}",
        description=f"**{_clip(p['title'], 240)}**\n\n{_clip(v['text'], 1400)}",
        color=RED,
    )
    for a in d["advisors"]:
        emo = POSTURA_EMOJI.get(a["postura"], "⚪")
        e.add_field(name=f"{emo} {a['name']}", value=f"_{a['lens']}_\n{_clip(a['text'], 220)}", inline=False)
    e.add_field(
        name="🧭 Veredicto",
        value=f"Divergencia **{dv['level']}** · Confianza **{v['confidence']}/10** · "
        f"{'🤝 CONSENSO' if d['consensus'] else '⚔️ con disenso'} · {d['elapsed_ms']} ms",
        inline=False,
    )
    e.set_footer(text=f"4 consejeros en paralelo · proveedor: {v.get('provider', '?')}")
    await ctx.reply(embed=e)


@bot.hybrid_command(name="preguntar", description="Preguntale a Hermes")
async def preguntar(ctx: commands.Context, *, texto: str) -> None:
    await ctx.defer()
    try:
        d = await _post("/agents/hermes/ask", {"message": texto})
    except Exception as e:  # noqa: BLE001
        await ctx.reply(f"⚠ no pude contactar a Hermes ({HERMES_URL}): {e}")
        return
    e = discord.Embed(title="🤖 Hermes", description=_clip(d.get("answer", "(sin respuesta)"), 3900), color=RED)
    e.set_footer(text=f"proveedor: {d.get('provider', '?')} · confianza {d.get('confidence', '?')}/10")
    await ctx.reply(embed=e)


@bot.hybrid_command(name="toxica", description="La Tóxica: accountability de una propuesta")
async def toxica(ctx: commands.Context, id: int = 1) -> None:
    await ctx.defer()
    transcript = (
        "Sesión: el oficialismo aplazó el tratamiento del artículo 56 y no fijó fecha; "
        "la oposición pidió tratamiento sobre tablas. No hubo votación nominal."
    )
    try:
        d = await _post("/agents/toxica/analyze", {"proposal_id": id, "transcript": transcript})
    except Exception as e:  # noqa: BLE001
        await ctx.reply(f"⚠ no pude contactar a Hermes ({HERMES_URL}): {e}")
        return
    e = discord.Embed(
        title=f"🔥 La Tóxica · Propuesta #{id}",
        description=_clip(d.get("public_post", "(sin borrador)"), 3800),
        color=RED,
    )
    if d.get("gap_summary"):
        e.add_field(name="Brecha congreso ↔ ciudadanía", value=_clip(d["gap_summary"], 300), inline=False)
    e.set_footer(text=f"BORRADOR · requiere aprobación humana antes de publicar · proveedor {d.get('provider', '?')}")
    await ctx.reply(embed=e)


@bot.hybrid_command(name="votar", description="Link para votar una propuesta")
async def votar(ctx: commands.Context, id: int = 1) -> None:
    e = discord.Embed(
        title=f"🗳️ Votar propuesta #{id}",
        color=RED,
        description=(
            "Tu voto es **anónimo** y **on-chain**: firmás con tu wallet (no-custodial, "
            "Hermes nunca toca tu clave).\n\n"
            f"👉 **{APP_URL}/votacion**\n\n"
            "Sí · No · Abstención. Un *nullifier* derivado de tu identidad evita el doble voto "
            "sin revelar quién sos."
        ),
    )
    await ctx.reply(embed=e)


@bot.hybrid_command(name="registrarse", description="Registro único cross-canal")
async def registrarse(ctx: commands.Context) -> None:
    await ctx.defer()
    try:
        d = await _post("/agents/channels/register", {"channel": "discord", "person_ref": str(ctx.author.id)})
    except Exception as e:  # noqa: BLE001
        await ctx.reply(f"⚠ no pude contactar a Hermes ({HERMES_URL}): {e}")
        return
    if d.get("accepted"):
        await ctx.reply("✅ Registrado vía **Discord**. Quedás bloqueado para re-registrarte en otro canal.")
    else:
        await ctx.reply(f"⚠️ {d.get('reason', 'no aceptado')}")


@bot.event
async def on_message(message: discord.Message) -> None:
    if message.author.bot:
        await bot.process_commands(message)
        return
    if bot.user and bot.user in message.mentions:
        txt = message.content
        for m in (f"<@{bot.user.id}>", f"<@!{bot.user.id}>"):
            txt = txt.replace(m, "")
        txt = txt.strip()
        if txt:
            async with message.channel.typing():
                try:
                    d = await _post("/agents/hermes/ask", {"message": txt})
                    await message.reply(_clip(d.get("answer", "(sin respuesta)"), 1900))
                except Exception as e:  # noqa: BLE001
                    await message.reply(f"⚠ no pude contactar a Hermes: {e}")
    await bot.process_commands(message)


def main() -> None:
    if not TOKEN:
        raise SystemExit(
            "Falta DISCORD_BOT_TOKEN. Ponelo en agents/.env (ver docs/discord-bot-setup.md)."
        )
    print(f"→ arrancando bot · Hermes API en {HERMES_URL} · app en {APP_URL}")
    bot.run(TOKEN)


if __name__ == "__main__":
    main()
