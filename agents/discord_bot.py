"""
Bot CivicSys (Hermes) en Discord — PARTICIPACIÓN CIUDADANA.

Para que la gente se registre en el blockchain, vote y consulte al Concilio Hermes.
El bot de accountability «La Tóxica» es `discord_bot_toxica.py` (app + token aparte).

Comandos (slash `/` y prefijo `!`):
  /ayuda · /propuestas · /concilio <id> · /preguntar <texto> · /votar <id> · /registrarse
También responde si lo @mencionás.

Correr (desde agents/, con agents/.env):
  ./.venv/Scripts/python.exe discord_bot.py
Env: DISCORD_CIVICSYS_TOKEN (req) · HERMES_URL · APP_URL · DISCORD_GUILD_ID (opc, sync instantáneo)
"""

from __future__ import annotations

import logging
import os

import discord
from discord.ext import commands

from discord_common import APP_URL, GUILD_ID, HERMES_URL, clip, get, post

TOKEN = (os.getenv("DISCORD_CIVICSYS_TOKEN") or os.getenv("DISCORD_BOT_TOKEN", "")).strip()
RED = 0xC71828
POSTURA_EMOJI = {"A_FAVOR": "🟢", "EN_CONTRA": "🔴", "CAUTELA": "🟡"}
log = logging.getLogger("hermes.civicsys")

intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents, help_command=None)


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
        log.warning("sync de slash commands falló: %s", e)
    log.info("✅ CivicSys conectado como %s · Hermes API: %s", bot.user, HERMES_URL)
    await bot.change_presence(activity=discord.Game(name="CivicSys · /ayuda"))


@bot.hybrid_command(name="ayuda", description="Comandos de CivicSys")
async def ayuda(ctx: commands.Context) -> None:
    e = discord.Embed(
        title="🏛️  CivicSys · Hermes",
        color=RED,
        description="Participá en la cámara cívica sobre **Syscoin / zkTanenbaum**.",
    )
    e.add_field(name="/propuestas", value="Propuestas activas y su tally", inline=False)
    e.add_field(name="/concilio `<id>`", value="4 consejeros IA deliberan y emiten veredicto", inline=False)
    e.add_field(name="/preguntar `<texto>`", value="Preguntale a Hermes", inline=False)
    e.add_field(name="/votar `<id>`", value="Link para votar (firmás con tu wallet, on-chain)", inline=False)
    e.add_field(name="/registrarse", value="Registro único cross-canal", inline=False)
    e.set_footer(text="Accountability del senado → bot «La Tóxica». $SYS es el camino 🚀")
    await ctx.reply(embed=e)


@bot.hybrid_command(name="propuestas", description="Lista las propuestas activas")
async def propuestas(ctx: commands.Context) -> None:
    await ctx.defer()
    try:
        data = await get("/agents/proposals")
    except Exception as e:  # noqa: BLE001
        await ctx.reply(f"⚠ no pude contactar a Hermes ({HERMES_URL}): {e}")
        return
    e = discord.Embed(title="📋 Propuestas en curso", color=RED)
    for p in data.get("proposals", [])[:10]:
        total = p["yes"] + p["no"] + p["abstain"]
        e.add_field(
            name=f"#{p['id']} · {clip(p['title'], 200)}",
            value=f"{p.get('category', '')} · {p.get('status', '')} — "
            f"Sí {p['yes']} / No {p['no']} / Abst {p['abstain']}  ({total} votos)",
            inline=False,
        )
    await ctx.reply(embed=e)


@bot.hybrid_command(name="concilio", description="El Concilio Hermes delibera sobre una propuesta")
async def concilio(ctx: commands.Context, id: int = 1) -> None:
    await ctx.defer()
    try:
        d = await post("/agents/concilio", {"proposal_id": id})
    except Exception as e:  # noqa: BLE001
        await ctx.reply(f"⚠ no pude contactar a Hermes ({HERMES_URL}): {e}")
        return
    p, v, dv = d["proposal"], d["verdict"], d["divergence"]
    e = discord.Embed(
        title=f"⚖️  Concilio Hermes · Propuesta #{p['id']}",
        description=f"**{clip(p['title'], 240)}**\n\n{clip(v['text'], 1400)}",
        color=RED,
    )
    for a in d["advisors"]:
        emo = POSTURA_EMOJI.get(a["postura"], "⚪")
        e.add_field(name=f"{emo} {a['name']}", value=f"_{a['lens']}_\n{clip(a['text'], 220)}", inline=False)
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
        d = await post("/agents/hermes/ask", {"message": texto})
    except Exception as e:  # noqa: BLE001
        await ctx.reply(f"⚠ no pude contactar a Hermes ({HERMES_URL}): {e}")
        return
    e = discord.Embed(title="🤖 Hermes", description=clip(d.get("answer", "(sin respuesta)"), 3900), color=RED)
    e.set_footer(text=f"proveedor: {d.get('provider', '?')} · confianza {d.get('confidence', '?')}/10")
    await ctx.reply(embed=e)


@bot.hybrid_command(name="votar", description="Link para votar una propuesta")
async def votar(ctx: commands.Context, id: int = 1) -> None:
    e = discord.Embed(
        title=f"🗳️ Votar propuesta #{id}",
        color=RED,
        description=(
            "Tu voto es **anónimo** y **on-chain**: firmás con tu wallet (no-custodial).\n\n"
            f"👉 **{APP_URL}/votacion**\n\n"
            "Sí · No · Abstención. Un *nullifier* evita el doble voto sin revelar quién sos."
        ),
    )
    await ctx.reply(embed=e)


@bot.hybrid_command(name="registrarse", description="Registro único cross-canal")
async def registrarse(ctx: commands.Context) -> None:
    await ctx.defer()
    try:
        d = await post("/agents/channels/register", {"channel": "discord", "person_ref": str(ctx.author.id)})
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
                    d = await post("/agents/hermes/ask", {"message": txt})
                    await message.reply(clip(d.get("answer", "(sin respuesta)"), 1900))
                except Exception as e:  # noqa: BLE001
                    await message.reply(f"⚠ no pude contactar a Hermes: {e}")
    await bot.process_commands(message)


def main() -> None:
    if not TOKEN:
        raise SystemExit(
            "Falta DISCORD_CIVICSYS_TOKEN en agents/.env (ver docs/discord-bot-setup.md)."
        )
    log.info("→ arrancando bot CivicSys · Hermes API en %s · app en %s", HERMES_URL, APP_URL)
    bot.run(TOKEN)


if __name__ == "__main__":
    main()
