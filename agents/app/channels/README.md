# Hermes Registro multicanal (Sprint 05) — funcional con transporte mock

> **Lógica funcional, transporte mockeado.** El `ChannelCoordinator` resuelve la
> unicidad cross-canal de verdad (registrate una vez, bloqueado en todos lados);
> cada `Channel` transporta con colas in-memory en vez del SDK real. La conexión
> **live** (Telegram/Discord/WhatsApp) necesita tokens del operador (L-18).
> Endpoints: `POST /agents/channels/register`, `GET /agents/channels/status`.

## Idea

Hermes de Registro recibe solicitudes de alta ciudadana por múltiples canales de
mensajería (Telegram, Discord, WhatsApp) con una **única** lógica de unicidad
compartida: un mismo humano no puede registrarse dos veces, sin importar el canal.

## Arquitectura

- `base.py` — `Channel` (Protocol): interfaz común `receive()` / `send()` /
  `verify_unique()`.
- `telegram.py` · `discord.py` · `whatsapp.py` — una clase por plataforma que
  implementa `Channel`.
- **Dedupe compartido**: todos los canales consultan el mismo `IdentityService`
  (dedupe facial, `app/identity.py`) y la unicidad on-chain (`IdentitySBT`). El
  canal solo transporta; la verificación de "humano único" es central.

## Por qué un Protocol y no una clase base

`Channel` es un `typing.Protocol`: cada plataforma trae su propio SDK y ciclo de
vida (webhooks, long-polling, etc.). El Protocol fija el **contrato** sin imponer
herencia, y permite testear con dobles.

## Pendiente (Sprint 05)

- Implementar cada canal con su SDK + verificación de webhook/firma.
- Cablear `verify_unique` contra `IdentityService` + `IdentitySBT.isRegistered`.
- Rate limiting y anti-spam por canal.
- ADR de seguridad multicanal (suplantación, verificación de identidad del canal).
