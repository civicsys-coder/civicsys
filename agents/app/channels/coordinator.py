"""
ChannelCoordinator: unicidad de registro COMPARTIDA entre todos los canales.

El valor del multicanal es "registrate una vez, bloqueado en todos lados". Cada
canal transporta; el coordinador decide. Mantiene el set de personas ya
registradas (across canales) y responde el alta. En producción, el dedupe
delegaría además en `IdentityService` (rostro) y en `IdentitySBT.isRegistered`
(on-chain); acá centraliza por `person_ref` normalizado.
"""

from __future__ import annotations

from app.channels.base import Channel, RegistrationResult


def _normalize(channel: str, person_ref: str) -> str:
    # Clave global del humano. En real, mapear a una identidad canónica (no al id
    # del canal). Para la demo, el par (canal, ref) se normaliza a un sujeto.
    return f"{channel}:{person_ref.strip().lower()}"


class ChannelCoordinator:
    def __init__(self) -> None:
        self._channels: dict[str, Channel] = {}
        # subject_key -> canal donde se registró primero
        self._registered: dict[str, str] = {}
        # mapeo person_ref (sin canal) -> sujeto, para detectar la MISMA persona
        # llegando por canales distintos (demo: mismo person_ref = misma persona).
        self._by_person: dict[str, str] = {}

    def register_channel(self, channel: Channel) -> None:
        self._channels[channel.name] = channel

    @property
    def channels(self) -> list[str]:
        return sorted(self._channels)

    def register_person(self, channel: str, person_ref: str) -> RegistrationResult:
        if channel not in self._channels:
            return RegistrationResult(False, f"canal desconocido: {channel}", channel)
        ref = person_ref.strip().lower()
        if not ref:
            return RegistrationResult(False, "person_ref vacío", channel)
        # ¿La misma persona ya se registró por CUALQUIER canal?
        if ref in self._by_person:
            prev = self._by_person[ref]
            return RegistrationResult(
                False, f"ya registrado vía {prev} (no se permite doble registro)", channel, ref
            )
        self._by_person[ref] = channel
        self._registered[_normalize(channel, person_ref)] = channel
        return RegistrationResult(True, "registrado", channel, ref)

    def is_registered(self, person_ref: str) -> bool:
        return person_ref.strip().lower() in self._by_person

    def stats(self) -> dict:
        return {
            "channels": self.channels,
            "registered": len(self._by_person),
            "by_channel": {
                ch: sum(1 for v in self._by_person.values() if v == ch) for ch in self.channels
            },
        }
