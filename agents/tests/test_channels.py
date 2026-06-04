import pytest

from app.channels.base import ChannelMessage
from app.channels.coordinator import ChannelCoordinator
from app.channels.discord import DiscordChannel
from app.channels.telegram import TelegramChannel
from app.channels.whatsapp import WhatsAppChannel


def _coord() -> ChannelCoordinator:
    c = ChannelCoordinator()
    c.register_channel(TelegramChannel())
    c.register_channel(DiscordChannel())
    c.register_channel(WhatsAppChannel())
    return c


def test_canales_registrados():
    c = _coord()
    assert c.channels == ["discord", "telegram", "whatsapp"]


def test_registro_unico_cross_canal():
    c = _coord()
    r1 = c.register_person("telegram", "ana123")
    assert r1.accepted is True

    # misma persona por otro canal -> bloqueada
    r2 = c.register_person("discord", "ANA123")  # case-insensitive
    assert r2.accepted is False
    assert "telegram" in r2.reason

    # persona distinta por otro canal -> ok
    r3 = c.register_person("discord", "beto")
    assert r3.accepted is True


def test_persona_vacia_y_canal_desconocido():
    c = _coord()
    assert c.register_person("telegram", "  ").accepted is False
    assert c.register_person("signal", "x").accepted is False


def test_stats():
    c = _coord()
    c.register_person("telegram", "ana")
    c.register_person("whatsapp", "beto")
    s = c.stats()
    assert s["registered"] == 2
    assert s["by_channel"]["telegram"] == 1
    assert s["by_channel"]["whatsapp"] == 1


@pytest.mark.asyncio
async def test_transporte_mock_send_receive():
    ch = TelegramChannel()
    ch.push(ChannelMessage(person_ref="ana", text="quiero registrarme"))
    msg = await ch.receive()
    assert msg is not None and msg.person_ref == "ana"
    assert await ch.receive() is None  # cola vacía
    await ch.send("ana", "bienvenida")
    assert ch.outbox == [("ana", "bienvenida")]
