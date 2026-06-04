# A11y Report — Sprint hermes-crt-contrast

**Fecha**: 2026-05-25
**Estándar**: WCAG 2.2 AA (mínimo) · AAA (donde aplica)
**Tooling**: cálculo manual de ratios (fórmula de luminancia relativa WCAG) + revisión visual. Pendiente axe-core/Lighthouse automatizado.
**Scope**: tema CRT verde fósforo (`app/globals.css`) y consola Hermes (`app/hermes/page.tsx`).

## Resumen

- ✅ Pasa: contraste de texto y no-texto, foco visible, motion-reduce.
- ❌ Falla: 0 criterios AA tras el fix.
- Antes del fix: **fallaba 1.4.3 (Contrast Min)** — texto muted en verde apagado + `text-shadow` global difuminando todo.

## Contraste

Todos los ratios contra `{surface.base}` = `#03110a` salvo indicado.

| Combinación tokens | Ratio | AA req | Estado | Notas |
|---|---|---|---|---|
| `{text.primary}` `#d6fbe6` (texto normal) | 17.4:1 | 4.5:1 | ✅ | cuerpo, respuestas de Hermes |
| `{text.secondary}` `#a6f4c8` (normal) | 14.6:1 | 4.5:1 | ✅ | énfasis suave |
| `{text.muted}` `#5fd494` (normal) | 10.5:1 | 4.5:1 | ✅ | traza de tools, metadata, placeholder |
| `{action.primary}` `#00ff66` (texto/acento) | 14.3:1 | 4.5:1 | ✅ | prompt, "hermes »", badge gemini |
| `#03210f` sobre `{action.primary}` (texto en botón) | 12.0:1 | 4.5:1 | ✅ | botón EJECUTAR |
| `{action.danger}` `#ff8a3d` | 8.3:1 | 4.5:1 | ✅ | alertas, voto No |
| `{border.default}` `#2a7d4d` (no-texto) | 3.8:1 | 3:1 | ✅ | bordes de tarjetas/consola/inputs |
| `{vote.yes}` `#00ff66` (no-texto, barra) | 14.3:1 | 3:1 | ✅ | segmento Sí |

## Keyboard navigation

| Vista | Tab order | Focus visible | Estado |
|---|---|---|---|
| /hermes | lógico (tarjetas → quick-cmds → input → ejecutar) | sí — ring `{focus.ring}` 2px, offset 2px | ✅ |

## ARIA / status

| Patrón | Implementación | Estado | Notas |
|---|---|---|---|
| LED de estado | texto "EN LÍNEA/OFFLINE" + color | ✅ | el estado NO depende solo del color (texto presente) — 1.4.1 |
| Respuesta en streaming | append a transcript | ⚠️ | pendiente `aria-live="polite"` para anunciar respuestas (mejora AAA) |

## Criterios WCAG 2.2 AA relevantes

| Criterio | Resultado | Evidencia | Acción |
|---|---|---|---|
| 1.4.1 Use of Color | ✅ | estado usa texto + color | — |
| 1.4.3 Contrast (Min) | ✅ | tabla de contraste | resuelto (antes ❌) |
| 1.4.11 Non-text Contrast | ✅ | bordes 3.8:1, barras vivas | — |
| 2.4.7 Focus Visible | ✅ | `:focus-visible` global | — |
| 2.3.3 Animation from Interactions | ✅ | `prefers-reduced-motion` desactiva caret/flicker | — |
| 4.1.3 Status Messages | ⚠️ | falta `aria-live` en transcript | mejora futura |

## Violaciones

### Falla 1 — Texto ilegible por bajo contraste (RESUELTA)

- **Ubicación**: `/hermes` (consola + panel de propuestas), tema global.
- **Criterio**: 1.4.3 Contrast (Minimum).
- **Descripción**: `--muted-foreground` (`#3aa66a`) y `--foreground` apagados + `text-shadow` global de glow difuminando todo el texto → lectura casi imposible (ver screenshot del usuario 2026-05-25).
- **Severidad**: bloqueante (AA).
- **Fix**: nueva escala `phosphor.*` con ratios verificados (10.5:1 el más bajo para texto), glow removido del body (solo en títulos), scanlines bajadas a opacidad 0.05, bordes a `#2a7d4d` (3.8:1).
- **Estado**: fixed.

## Notas

- Mejora futura (AAA): `aria-live="polite"` en el transcript para que lectores de pantalla anuncien las respuestas de Hermes; `aria-busy` durante "procesando".
- Validación automatizada (axe-core/Lighthouse) pendiente — recomendado antes del cierre formal del próximo sprint LUMEN.
