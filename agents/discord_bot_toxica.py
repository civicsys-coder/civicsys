"""
Bot «La Tóxica» en Discord — ACCOUNTABILITY.

Reporta en el canal cómo votó el **senado / congreso** contra cómo votó el **pueblo**
y señala la brecha con un post filoso. Los reportes son BORRADORES: un humano aprueba
antes de publicarlos en serio (human-in-the-loop).

App + token de Discord APARTE del bot CivicSys (`discord_bot.py`). Ambos hablan con la
misma API de Hermes.

Comandos (slash `/` y prefijo `!`):
  /ayuda · /toxica <id> [transcripción] · /brecha <id>
También responde si la @mencionás.

Correr (desde agents/, con agents/.env):
  ./.venv/Scripts/python.exe discord_bot_toxica.py
Env: DISCORD_TOXICA_TOKEN (req) · HERMES_URL · DISCORD_GUILD_ID (opc, sync instantáneo)
"""

from __future__ import annotations

import logging
import os

import discord
from discord.ext import commands

from discord_common import GUILD_ID, HERMES_URL, anchor_toxica, clip, post

TOKEN = os.getenv("DISCORD_TOXICA_TOKEN", "").strip()
RED = 0xE02134
log = logging.getLogger("hermes.toxica")

# Transcripción de sesión del senado por defecto (si no se pasa una).
_DEFAULT_TRANSCRIPT = (
    "Sesión del senado: el oficialismo aplazó el tratamiento del tema y no fijó fecha; "
    "la oposición pidió tratamiento sobre tablas. No hubo votación nominal."
)

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
    log.info("🔥 La Tóxica conectada como %s · Hermes API: %s", bot.user, HERMES_URL)
    await bot.change_presence(activity=discord.Game(name="vigilando al senado · /toxica"))


async def _analyze(proposal_id: int, transcript: str) -> dict:
    return await post("/agents/toxica/analyze", {"proposal_id": proposal_id, "transcript": transcript})


@bot.hybrid_command(name="ayuda", description="Qué hace La Tóxica")
async def ayuda(ctx: commands.Context) -> None:
    e = discord.Embed(
        title="🔥 La Tóxica · accountability",
        color=RED,
        description="Comparo lo que votó el **senado** contra lo que votó el **pueblo** y "
        "señalo la brecha. Sin pelos en la lengua.",
    )
    e.add_field(
        name="/toxica `<id>` `[transcripción]`",
        value="Reporte de accountability de una propuesta (senado vs ciudadanía).",
        inline=False,
    )
    e.add_field(name="/brecha `<id>`", value="Solo el resumen de la brecha.", inline=False)
    e.set_footer(text="Los reportes son BORRADORES — un humano aprueba antes de publicar en serio.")
    await ctx.reply(embed=e)


@bot.hybrid_command(name="toxica", description="Reporte de accountability: senado vs pueblo")
async def toxica(ctx: commands.Context, id: int = 1, *, transcripcion: str = "") -> None:
    await ctx.defer()
    try:
        d = await _analyze(id, transcripcion.strip() or _DEFAULT_TRANSCRIPT)
    except Exception as e:  # noqa: BLE001
        await ctx.reply(f"⚠ no pude contactar a Hermes ({HERMES_URL}): {e}")
        return
    e = discord.Embed(
        title=f"🔥 La Tóxica · Propuesta #{id}",
        color=RED,
        description=clip(d.get("public_post", "(sin borrador)"), 3800),
    )
    if d.get("citizen_position"):
        e.add_field(name="🗳️ El pueblo", value=clip(d["citizen_position"], 300), inline=True)
    if d.get("congress_action"):
        e.add_field(name="🏛️ El senado", value=clip(d["congress_action"], 300), inline=True)
    if d.get("gap_summary"):
        e.add_field(name="⚡ La brecha", value=clip(d["gap_summary"], 400), inline=False)
    # Anclaje on-chain (zkSYS): deja una traza inmutable y verificable del reporte.
    anchor = await anchor_toxica(
        id,
        d.get("gap_summary") or d.get("citizen_position") or "",
        d.get("public_post") or "",
    )
    if anchor and anchor.get("explorerTx"):
        e.add_field(
            name="⛓️ Anclado en blockchain (zkSYS)",
            value=f"[Ver el reporte on-chain ↗]({anchor['explorerTx']})",
            inline=False,
        )
        e.set_footer(text=f"Anclado inmutable on-chain · BORRADOR · proveedor {d.get('provider', '?')}")
    else:
        e.set_footer(
            text=f"BORRADOR · aprobación humana antes de publicar · proveedor {d.get('provider', '?')}"
        )
    await ctx.reply(embed=e)


@bot.hybrid_command(name="brecha", description="Solo el resumen de la brecha senado vs pueblo")
async def brecha(ctx: commands.Context, id: int = 1) -> None:
    await ctx.defer()
    try:
        d = await _analyze(id, _DEFAULT_TRANSCRIPT)
    except Exception as e:  # noqa: BLE001
        await ctx.reply(f"⚠ no pude contactar a Hermes: {e}")
        return
    await ctx.reply(f"⚡ **Brecha · propuesta #{id}:** {clip(d.get('gap_summary', '(sin datos)'), 1800)}")


@bot.event
async def on_message(message: discord.Message) -> None:
    if message.author.bot:
        await bot.process_commands(message)
        return
    if bot.user and bot.user in message.mentions:
        await message.reply("🔥 Usá `/toxica <id>` y te tiro el reporte de accountability **senado vs pueblo**.")
    await bot.process_commands(message)


def main() -> None:
    if not TOKEN:
        raise SystemExit(
            "Falta DISCORD_TOXICA_TOKEN en agents/.env (ver docs/discord-bot-setup.md)."
        )
    log.info("→ arrancando La Tóxica · Hermes API en %s", HERMES_URL)
    bot.run(TOKEN)


if __name__ == "__main__":
    main()
