# T-07 — Implementar `sanitize_untrusted` en `agents/app/security.py`

**Prio**: P1 · **Bloqueada por**: — · **ADR**: ADR-005

## Qué hacer

Crear `agents/app/security.py` con (ver ADR-005 para código exacto):

- Constante `INJECTION_TOKENS` (tupla de ≥18 tokens conocidos).
- Constante `CONTROL_CHARS_RE` (regex de chars de control).
- Función `sanitize_untrusted(text: str, max_len: int = 500) -> str`.

La función:
1. Trim + truncar a `max_len`.
2. Remover chars de control (preservar newlines y tabs).
3. Reemplazar cada token de inyección por `[BLOCKED:<n>chars]`.

Tipos modernos: `from __future__ import annotations` si hace falta.

## Criterio de done

- [ ] `agents/app/security.py` existe.
- [ ] `from app.security import sanitize_untrusted` funciona (sin tests todavía).
- [ ] La función tiene docstring que cita ADR-005.

## Comando de verificación

```bash
cd agents && python -c "from app.security import sanitize_untrusted; print(sanitize_untrusted('Hello world'))"
```
