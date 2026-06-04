"""
Security helpers para Hermes.

Dos responsabilidades:

1. `sanitize_untrusted(text, max_len)` — sanitiza datos no confiables antes de
   inyectarlos en prompts LLM. Cubre payloads de prompt injection conocidos.
   Ver `docs/plans/executed/arquitectura/ADR-005-prompt-injection-defense.md`.

2. `compute_hmac` / `verify_hmac` / `hmac_path` / `IntegrityError` — HMAC-SHA256
   para anclar integridad de reportes persistidos. Detecta mutación filesystem.
   Ver `docs/plans/executed/arquitectura/ADR-002-audit-log-l1.md`.

Las dos viven en el mismo archivo porque ambas son "defensas a aplicar antes de
confiar" y el surface area es minimo. Si crece, splittear en `security/` package.
"""

from __future__ import annotations

import hashlib
import hmac
import re
from pathlib import Path
from typing import Final


# ─────────────────────────────────────────────────────────────────────────────
# Prompt injection defense (ADR-005)
# ─────────────────────────────────────────────────────────────────────────────

# Tokens de instrucción comunes en payloads de inyección.
# Lista no exhaustiva — combinar con truncamiento y delimitadores en el prompt.
INJECTION_TOKENS: Final = (
    "ignore previous",
    "ignore all previous",
    "ignore the above",
    "ignore above",
    "disregard previous",
    "disregard all",
    "system:",
    "assistant:",
    "user:",
    "<|im_start|",
    "<|im_end|",
    "<|system|",
    "<|user|",
    "<|assistant|",
    "###system",
    "###user",
    "###assistant",
    "you are now",
    "pretend you are",
    "act as",
    "new instructions:",
    "actualiza tus instrucciones",
    "ignora las instrucciones",
    "ignora todas las instrucciones",
    "olvida las instrucciones",
)

# Control chars excepto newline (\n), CR (\r) y tab (\t).
_CONTROL_CHARS_RE: Final = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def sanitize_untrusted(text: str | None, max_len: int = 500) -> str:
    """
    Sanitize text from untrusted source (on-chain data, user input) before
    embedding in an LLM prompt.

    Steps:
      1. Trim and truncate to ``max_len`` chars.
      2. Remove control chars (preserve newlines, CR, tabs).
      3. Mask known prompt-injection tokens (case-insensitive) with
         ``[BLOCKED:<n>chars]`` placeholders.

    Returns a string safe to embed inside ``<UNTRUSTED_INPUT>...
    </UNTRUSTED_INPUT>`` delimiters. Does NOT guarantee no prompt injection — combine
    with the delimiters + an explicit system-prompt instruction.

    Args:
        text: input string from untrusted source. ``None`` is accepted and
            returns empty string.
        max_len: maximum length after sanitization. Default 500.

    Returns:
        Sanitized string with same or fewer chars than ``text``.
    """
    if text is None:
        return ""

    # 1. Trim + limit length.
    sanitized = text.strip()[:max_len]

    # 2. Remove control chars (preserve newlines and tabs).
    sanitized = _CONTROL_CHARS_RE.sub("", sanitized)

    # 3. Mask injection tokens (case-insensitive).
    for token in INJECTION_TOKENS:
        if token in sanitized.lower():
            pattern = re.compile(re.escape(token), re.IGNORECASE)
            sanitized = pattern.sub(f"[BLOCKED:{len(token)}chars]", sanitized)

    return sanitized


# ─────────────────────────────────────────────────────────────────────────────
# HMAC integrity helpers (ADR-002)
# ─────────────────────────────────────────────────────────────────────────────


class IntegrityError(Exception):
    """Raised when HMAC verification fails."""


def compute_hmac(content: bytes, key: bytes) -> str:
    """
    Returns hex-encoded HMAC-SHA256 of ``content`` using ``key``.

    Use to anchor integrity of persisted reports (e.g. ``sessions/proposal_N.json``).
    Pair with ``verify_hmac`` on read.
    """
    return hmac.new(key, content, hashlib.sha256).hexdigest()


def verify_hmac(content: bytes, expected_hex: str, key: bytes) -> bool:
    """
    Constant-time comparison of computed HMAC vs expected hex.

    Returns ``True`` if matches. ``False`` otherwise (use to gate consumption of
    persisted reports).
    """
    computed = compute_hmac(content, key)
    return hmac.compare_digest(computed, expected_hex)


def hmac_path(target: Path) -> Path:
    """
    Returns the HMAC sidecar path for ``target``.

    Example: ``proposal_1.json`` -> ``proposal_1.json.hmac``.
    """
    return target.with_suffix(target.suffix + ".hmac")
