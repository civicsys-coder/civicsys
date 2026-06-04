"""Canal Telegram de Hermes Registro (Sprint 05, transporte mock).

La lógica es real (transporta y delega el dedupe al coordinador); el SDK de
Telegram se mockea con colas in-memory. Conexión live → necesita bot token.
"""

from __future__ import annotations

from app.channels.base import Channel


class TelegramChannel(Channel):
    name = "telegram"
