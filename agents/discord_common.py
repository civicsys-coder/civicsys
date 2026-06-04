"""Helpers compartidos por los bots de Discord (CivicSys y La Tóxica).

Ambos bots hablan con la misma API de Hermes (FastAPI) por HTTP. NUNCA se logean
tokens, keys ni el body de los requests; solo la ruta.
"""

from __future__ import annotations

import logging
import os

import httpx

try:
    from dotenv import load_dotenv

    load_dotenv()  # carga agents/.env si existe
except Exception:  # python-dotenv es dep de pydantic-settings, pero por las dudas
    pass

HERMES_URL = os.getenv("HERMES_URL", "http://localhost:8000").rstrip("/")
APP_URL = os.getenv("APP_URL", "http://localhost:3000").rstrip("/")
GUILD_ID = os.getenv("DISCORD_GUILD_ID", "").strip()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s discord · %(message)s")
_log = logging.getLogger("hermes.discord.http")

_http = httpx.AsyncClient(timeout=90.0)


async def get(path: str) -> dict:
    _log.info("→ GET %s", path)
    r = await _http.get(f"{HERMES_URL}{path}")
    r.raise_for_status()
    return r.json()


async def post(path: str, json: dict) -> dict:
    _log.info("→ POST %s", path)  # sin body (puede traer texto de usuario)
    r = await _http.post(f"{HERMES_URL}{path}", json=json)
    r.raise_for_status()
    return r.json()


def clip(s: str, n: int) -> str:
    s = s or ""
    return s if len(s) <= n else s[: n - 1] + "…"
