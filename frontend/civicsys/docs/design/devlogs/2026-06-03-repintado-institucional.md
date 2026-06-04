# LUMEN devlog — 2026-06-03 · Repintado institucional (azul + rojo)

**Protocolo**: LUMEN v0.11.0 · **Escala**: M-L · **DESIGN.md**: 0.2.0 → 0.3.0 (cambio MAJOR de tokens)
**Repo**: CivicSys / frontend (Next.js 16.2.6 · Tailwind v4 · shadcn/Base-UI)

## Qué cambió

Reemplazo total del tema **"CRT verde fósforo"** (cassette-futurism) por un sistema
**institucional Web3**: azul profundo (`#041B47`) + rojo institucional (`#C71828`),
regla 70/20/10, tarjetas-documento claras con cabecera roja, titulares monumentales.

- **Tokens** (`app/globals.css`): paleta navy+red semántica (`:root`/`.dark`), gradiente
  radial de fondo fijo, radius 2px→8px, foco rojo, scrollbar/selección institucionales.
  Retirados scanlines CRT, glow de títulos y caret de terminal.
- **Tipografía** (`app/layout.tsx`): Orbitron + Share Tech Mono → **Archivo** (display 800,
  tracking −0.03em) + **IBM Plex Sans** (cuerpo) + **IBM Plex Mono** (direcciones/hashes).
- **Landing** (`app/page.tsx`): hero reescrito — chip de red, titular monumental + regla
  roja, 3 card-documento claras (`.civic-doc`), CTAs rojo/outline, nav secundaria.
- **Joyas de marca**: emblema CivicSys sobre **sello claro circular** arriba a la derecha
  del navbar; **moneda Syscoin flotante** abajo a la derecha del hero → `docs.syscoin.org`.
  Ambos PNG (transparentes en origen) recortados + optimizados a `public/`
  (`syscoin-coin.png` 256², `civicsys-mark.png` 192², `civicsys-logo.png` 560×384).
- **MatrixRain** neutralizada: el canvas de "lluvia 0/1" (gamer) pasa a fondo institucional
  estático (rejilla ledger tenue + halo radial); un solo cambio cubre las 4 páginas que la usan.
- **Fuga de color**: consola Hermes `#04140c` + glow verde → azul profundo `#02122e` + sombra neutra.

## Gate 1 — pre-resuelto

El director entregó la dirección estética **cerrada** (paleta exacta, do/don't, tokens,
referencias government-tech/enterprise). Material.0 Aesthetic Pillars y Material.1 Variation
quedaron cumplidos por el brief humano; se ejecutó Material.3 (tokens) → Material.4 (build)
→ 3.5 (Visual Critique) directamente.

## Fase 3.5 — Visual Critique Loop (multi-resolución)

Capturas Playwright headless en 320 / 768 / 1024 / 1440 / 1920 px
(`docs/design/critique/2026-06-03-institucional/`). 200 OK y **sin errores de consola** en
los 5 breakpoints.

- **Round 1** — weak point: emblema CivicSys arriba a la derecha ilegible (especta tenue).
  Causa real: bajo contraste del metálico plateado sobre azul (no tamaño).
- **Fix** — emblema sobre **sello claro circular** (`#F4F5F7`) → legible como insignia oficial.
- 1920 px: whitespace **simétrico** (contenedor centrado) — no es el anti-pattern de
  whitespace asimétrico; composición institucional correcta.

## Evidence (resumen)

- Contrastes AA verificados (ver DESIGN.md): texto ≥ 9.8:1 sobre azul; blanco/rojo 7.5:1;
  texto oscuro sobre paper 16:1.
- `prefers-reduced-motion` respetado en `.brand-float`.
- Sin errores de página en landing + 6 rutas internas (hermes, registro, votacion, sistema,
  toxica, dashboard).

## Pendiente (fuera de alcance de este repintado)

- Pulido fino por página interna (consola Hermes, sistema) más allá del re-tematizado global.
- a11y/perf report formal (Lighthouse/CWV) — el budget está declarado, falta medición.
