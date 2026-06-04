---
name: civicsys-fe
version: 0.3.0
description: CivicSys / SSC ANTIPEREZA — plataforma cívica institucional Web3 sobre Syscoin (azul profundo + rojo institucional)

# ── Capa primitiva (valores absolutos) ──
colors:
  navy:
    "900": "#02122e"   # fondo profundo / interiores de consola
    "850": "#041b47"   # fondo app (primary)
    "800": "#08214f"   # navbar / sidebar (secondary)
    "750": "#0a2c73"   # centro del gradiente
    "700": "#0b2a63"   # card oscura (páginas de app)
    "650": "#0e2e6b"   # panel secundario
    "600": "#12356f"   # accent / hover surface
    "550": "#1b3a78"   # scrollbar thumb
  red:
    "600": "#a51220"   # active
    "500": "#c71828"   # primary — acción, cabecera de card-documento
    "450": "#e02134"   # hover / focus ring
  ink:
    "0":   "#ffffff"   # títulos
    "100": "#eaf0fa"   # texto sobre azul (foreground)
    "200": "#d7dde8"   # texto secundario
    "300": "#b0bcd3"   # texto terciario / muted
    "400": "#8fa0c2"   # etiquetas tenues
  paper:
    base:  "#f4f5f7"   # superficie de card-documento clara
    ink:   "#0e1e40"   # texto sobre paper
    muted: "#48526b"   # texto secundario sobre paper
  signal:
    yes:  "#2bb673"    # voto Sí / estado OK
    no:   "#e02134"    # voto No (= rojo de marca)
    warn: "#e8902a"    # alerta / destructive (ámbar, distinto del rojo de acción)
    data: "#3e8fd6"    # dato auxiliar (charts)

typography:
  display:
    fontFamily: "Archivo"        # grotesca institucional, monumental
    fontWeight: 800
    letterSpacing: "-0.03em"
  body:
    fontFamily: "IBM Plex Sans"  # enterprise, técnica, confiable
    fontSize: "16px"
    lineHeight: 1.6
  mono:
    fontFamily: "IBM Plex Mono"  # direcciones, hashes, nullifiers
  banned: [Inter, Roboto, Arial, Space Grotesk, Orbitron, "Share Tech Mono"]

spacing:
  scale: [4, 8, 12, 16, 24, 32, 48, 64, 96]

rounded:
  none: "0"
  sm: "5px"
  md: "6px"    # botones
  lg: "8px"
  xl: "10px"   # card-documento

motion:
  duration: { quick: "120ms", base: "220ms" }
  ease: { standard: "cubic-bezier(0.4, 0, 0.2, 1)" }

# ── Capa semántica (significado de uso) ──
semantics:
  background:
    base:     "{colors.navy.850}"
    deep:     "{colors.navy.900}"
    nav:      "{colors.navy.800}"
    gradient: "radial-gradient(circle at 50% 32%, {colors.navy.750} 0%, {colors.navy.850} 46%, {colors.navy.900} 100%)"
  surface:
    card:     "{colors.navy.700}"    # cards de app (oscuras)
    document: "{colors.paper.base}"  # card-documento clara (sello cívico)
    input:    "rgba(255,255,255,0.16)"
  text:
    title:     "{colors.ink.0}"
    primary:   "{colors.ink.100}"
    secondary: "{colors.ink.200}"
    muted:     "{colors.ink.300}"
    on-paper:  "{colors.paper.ink}"
    on-action: "{colors.ink.0}"
  action:
    primary:        "{colors.red.500}"
    primary-hover:  "{colors.red.450}"
    primary-active: "{colors.red.600}"
  border:
    subtle:   "rgba(255,255,255,0.12)"
    document: "rgba(255,255,255,0.15)"
  focus:
    ring: "{colors.red.450}"
    offset: "2px"
  vote:
    yes: "{colors.signal.yes}"
    no:  "{colors.signal.no}"
    abstain: "{colors.ink.300}"

components:
  Button:
    variants: [default, outline, ghost]
    states: [default, hover, focus, disabled]
  CivicDoc:
    slots: [header, body]
    note: "card-documento clara con cabecera roja — sello cívico"
  BrandMark:
    note: "emblema CivicSys grande (~88px) arriba a la IZQUIERDA + wordmark 'CivicSYS'; PNG recortado ajustado para que el emblema llene la caja"
  CoinFloat:
    note: "moneda Syscoin flotante (abajo a la derecha del hero) → docs.syscoin.org"
---

# DESIGN.md — CivicSys FE

## Overview

**"Una institución digital seria."** Plataforma cívica Web3 institucional, NO cripto
especulativa: government-tech + blockchain enterprise sobre azul profundo. La
confianza por encima del espectáculo. Tarjetas-documento **claras** (sello cívico
rojo) flotan sobre un gradiente azul profundo; titulares monumentales en blanco;
el rojo institucional como acento preciso. Debe inspirar confianza, seguridad,
transparencia, auditabilidad y sofisticación tecnológica.

> v0.3.0 reemplaza por completo el tema previo "CRT verde fósforo" (cassette-futurism).
> El director entregó la dirección estética cerrada (azul institucional + rojo); por
> eso el Gate 1 de LUMEN quedó pre-resuelto y se ejecutó Material.3 (tokens) → 3.5
> (Visual Critique multi-res). Ver `docs/design/devlogs/2026-06-03-repintado-institucional.md`.

## Colors — regla 70 / 20 / 10

- **70 % azules oscuros**: `{colors.navy.850}` (app), `{colors.navy.800}` (navbar),
  `{colors.navy.900}` (profundo). Fondo = `{semantics.background.gradient}`.
- **20 % blancos y grises**: títulos `{colors.ink.0}`, texto `{colors.ink.100/200/300}`,
  card-documento `{colors.paper.base}`.
- **10 % rojo institucional**: `{colors.red.500}` (acción, cabeceras de card, regla bajo
  titulares), hover `{colors.red.450}`, active `{colors.red.600}`.
- Voto: Sí `{semantics.vote.yes}` · No `{semantics.vote.no}` · Abstención `{semantics.vote.abstain}`.
- Contrastes verificados (WCAG 2.2 AA, piso 4.5:1 texto) sobre `{colors.navy.850}`:
  ink.100 ≈ 15:1 · ink.300 ≈ 9.8:1 · blanco s/ rojo ≈ 7.5:1 · paper.ink s/ paper ≈ 16:1.

## Typography

- Display/títulos: **Archivo** peso 800, tracking `-0.03em`. **Sin glow.**
- Cuerpo/UI: **IBM Plex Sans**.
- Datos (direcciones, hashes, nullifiers): **IBM Plex Mono**.
- Banned: `{typography.banned}` (incluye Orbitron + Share Tech Mono del tema retirado).

## Layout

- Contenedor `max-w-6xl`, centrado, padding fluido (`px-5 → px-8`).
- Hero generoso, mucho espacio negativo. Card-documentos en grid de 3 (`sm:grid-cols-3`).

## Elevation & Depth

- Card-documento: `box-shadow: 0 12px 30px rgba(0,0,0,.25)`; borde `{semantics.border.document}`.
- Botón primario: `box-shadow: 0 4px 12px rgba(199,24,40,.35)` (`.civic-shadow-red`).
- Profundidad por gradiente + sombras suaves. **Sin glassmorphism, sin glow neón.**

## Shapes

- `{rounded.md}` (6px) botones · `{rounded.xl}` (10px) cards. Redondeo moderado, no SaaS-burbuja.

## Components

- **CivicDoc** (`.civic-doc` + `.civic-doc__header`) — tarjeta-documento clara con
  cabecera roja (sello). Texto interior siempre oscuro (`{colors.paper.ink/muted}`).
- **BrandMark** — emblema CivicSys grande (~88px) **arriba a la izquierda** del navbar,
  junto al wordmark **CivicSYS**. El PNG (`public/civicsys-mark.png`) se recorta con
  umbral de alpha (>70) para quitar el glow y que el emblema llene la caja; a ~88px
  los nodos rojos + la "S" lo hacen legible directo sobre azul (con drop-shadow).
- **CoinFloat** (`.brand-float`) — moneda Syscoin flotante abajo a la derecha del hero,
  enlaza a `https://docs.syscoin.org` (target _blank, rel noopener).
- **Button** — default (rojo), outline (borde claro sobre azul), ghost.

## Do's and Don'ts (Validation)

- ✅ Fondos oscuros, gradientes suaves, poco ruido visual, mucho espacio negativo.
- ✅ Tipografía grande, botones sólidos, contraste fuerte, sombras suaves, bordes 6–10px.
- ✅ Texto de lectura ≥ 4.5:1 (AA). Foco visible rojo (`{semantics.focus.ring}`).
- ❌ Neón / cyberpunk · morados · verdes fluorescentes · gradientes arcoíris.
- ❌ Glassmorphism · bordes brillantes · efectos gamer · animaciones exageradas.
- ❌ Texto rojo sobre azul (falla AA): el rojo va en superficies/acentos, no en texto.

## Performance budget (LUMEN default)

LCP ≤ 2.0s · INP ≤ 150ms · CLS ≤ 0.05 · JS gzip crítico ≤ 80 KB. Fuentes vía
`next/font` (self-hosted). Iconos PNG optimizados en `public/` (moneda 256², sello 192²).
