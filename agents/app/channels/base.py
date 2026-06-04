"""
Canales de Hermes Registro multicanal (Sprint 05).

Cada canal (Telegram/Discord/WhatsApp) es un transporte fino con la MISMA lógica
de unicidad compartida: un humano no puede registrarse dos veces, sin importar el
canal. El transporte real (SDK + webhooks) se mockea con colas in-memory para
testear la lógica sin tokens; la conexión live necesita tokens del operador.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ChannelMessage:
    """Mensaje entrante de un canal. `person_ref` identifica al humano en ese
    canal (ej. user id de Telegram). Es opaco; el dedupe lo normaliza."""

    person_ref: str
    text: str


class Channel:
    """Transporte base con colas in-memory (mock del SDK real).

    Subclases solo fijan `name`. La unicidad la resuelve el ChannelCoordinator,
    no el canal: el canal transporta, el coordinador decide.
    """

    name: str = "base"

    def __init__(self) -> None:
        self.inbox: list[ChannelMessage] = []
        self.outbox: list[tuple[str, str]] = []  # (to, message)

    def push(self, msg: ChannelMessage) -> None:
        """Simula un mensaje entrante (en real lo haría el webhook del SDK)."""
        self.inbox.append(msg)

    async def receive(self) -> ChannelMessage | None:
        """Devuelve el próximo mensaje entrante (o None si no hay)."""
        return self.inbox.pop(0) if self.inbox else None

    async def send(self, to: str, message: str) -> None:
        """Envía un mensaje (mock: lo encola en outbox)."""
        self.outbox.append((to, message))


@dataclass
class RegistrationResult:
    accepted: bool
    reason: str
    channel: str
    person_ref: str = field(default="")
