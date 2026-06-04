---
id: A-025
title: "hermes/memory/MEMORY.md y USER.md (templates Sprint 1)"
owner: "Tatiana"
backup: "Sandro"
effort: "45 min"
priority: P1
status: pending
depends_on: []
sprint: 1
layer: agents
---

# A-025 · Templates de memoria

## Por qué importa
La memoria persistente de Hermes (MEMORY.md, USER.md) ya está prometida en SOUL.md/VISION.md como producto público. Si en el demo aparece vacía, Hermes parece amnésico. En Sprint 1 dejamos **templates con estructura clara**, aunque la lógica de auto-escritura llegue en Sprint 2.

## Conceptos clave
- **MEMORY.md**: índice de "sesiones" pasadas (reportes generados). Igual que el `MEMORY.md` que Claude Code usa para auto-memory.
- **USER.md**: perfiles de usuarios recurrentes (cuando se introduzcan en Sprint 2+).
- **`.gitkeep`**: lo creamos ya en bootstrap. Esta tarea lo reemplaza con contenido.

## Pre-requisitos
- Ninguna.

## Paso a paso

### 1. Crear `agents/hermes/memory/MEMORY.md`
```markdown
# MEMORY.md — Hermes (CivicSys)

Índice persistente de sesiones, eventos y aprendizajes de Hermes.
Una línea por entrada. ≤ 200 líneas (las viejas se rotan a `archive/`).

## Sesiones (reportes de propuestas cerradas)

<!-- Cada vez que se genera un reporte, agregar acá -->
<!-- formato: - [#N] título · YYYY-MM-DD · confidence X.YY -->

## Eventos notables

<!-- ej. faucet agotado, RPC degradado, primer voto registrado -->

## Aprendizajes (Sprint 2+)

<!-- patrones que Hermes detecta y registra para uso futuro -->
```

### 2. Crear `agents/hermes/memory/USER.md`
```markdown
# USER.md — Perfiles de usuarios recurrentes (Sprint 2+)

En Sprint 1 NO usamos perfiles persistentes — todo es stateless.
Este archivo queda como placeholder estructural.

## Convención
- Cada perfil = una sección `### <citizen_id corto>`.
- NO se guarda DNI ni nombre completo. Solo el hash + nombre normalizado.
- Los perfiles se construyen a partir de interacciones explícitas con la API
  (registro, voto, consulta) — no por scraping.

## Sección de ejemplo (vacía a propósito)

### 0xabc... (Sprint 2+)
- Última interacción: TBD
- Propuestas en las que votó: TBD
- Preferencia de idioma: es | qu
```

### 3. Crear `agents/hermes/memory/sessions/.gitkeep`
```bash
touch agents/hermes/memory/sessions/.gitkeep
```

### 4. Documentar política en SOUL adicional (opcional)
Si querés, agregar al final de SOUL.md una sección "Memoria":
> ## Memoria
> Mi memoria viva está en `agents/hermes/memory/`.
> - `MEMORY.md` — índice de sesiones.
> - `USER.md` — perfiles (Sprint 2+).
> - `sessions/proposal_<id>.json` — reportes ya generados.
> Toda mi memoria es auditable y abierta.

### 5. Commit
```bash
git add agents/hermes/memory/MEMORY.md agents/hermes/memory/USER.md agents/hermes/memory/sessions/.gitkeep
git commit -m "docs(hermes): templates de memoria persistente (A-025)"
```

## Verificación / Definition of Done

- ✅ Los 3 archivos existen.
- ✅ Tienen contenido legible (no placeholders crudos).
- ✅ El `/hermes/status` muestra `soul_loaded: true` (no cambia, pero confirma path).

## Errores comunes

- **`USER.md` vacío y alguien intenta poblarlo con datos personales**
  Recordar: NO guardar PII. Solo hashes + datos derivables.

## Lecturas
- [`agents/hermes/soul/SOUL.md`](../hermes/soul/SOUL.md)
- [Auto-memory pattern en Claude Code](https://docs.anthropic.com/) — referencia de patrón

## Notas para revisor
- ¿La convención de USER.md es clara que NO se guardan DNI ni nombres en claro?
- En Sprint 2 los archivos crecen con eventos reales; mantener la rotación.
