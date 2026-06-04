"""Canal WhatsApp de Hermes Registro (Sprint 05, transporte mock)."""

from __future__ import annotations

from app.channels.base import Channel


class WhatsAppChannel(Channel):
    name = "whatsapp"
