---
id: A-040
title: "Demo script + grabación final"
owner: "Eduardo"
backup: "Mario / Grecia"
effort: "2 h"
priority: P0
status: pending
depends_on: [A-037, B-020]
sprint: 1
layer: agents
---

# A-040 · Demo script + grabación

## Por qué importa
El demo es lo único que ve el jurado del hackathon. Si va bien, todo el sprint vale. Si va mal, todo el sprint queda perdido. Esta tarea documenta el **guión paso-a-paso** que evita improvisaciones y prepara la grabación.

## Conceptos clave
- **Storyboard**: secuencia de "lo que se ve" + "lo que se dice".
- **Plan B grabado**: si el demo en vivo falla, tenemos un video pre-grabado.
- **Cero claves en pantalla**: durante el demo no compartir el contenido de `.env`.

## Pre-requisitos
- [ ] [A-037](./A-037-tests-e2e-fullstack.md) y [B-020](../../blockchain/docs/B-020-smoke-test-onchain.md) cerradas.
- [ ] Acceso a OBS o equivalente para grabar.

## Paso a paso

### 1. Crear `docs/sprints/DEMO_SCRIPT.md`

```markdown
# Demo CivicSys — guión Día 7

**Duración objetivo:** 5 minutos.
**Público:** jurado UCV + comunidad Syscoin.

## Secuencia

### Slide 1 — Hook (15s)
"En Perú, el 73% de las leyes pasan sin participación ciudadana audible.
CivicSys cambia eso: cámara cívica deliberativa sobre Syscoin, firmada on-chain,
asesorada por un agente IA con identidad pública."

### Slide 2 — Diagrama (30s)
Mostrar el flujo:
- Ciudadano → API → CitizenRegistry (zkTanenbaum) [Hash del DNI]
- Ciudadano → API → Vote (zkTanenbaum) [tx firmada]
- Hermes (agente IA) escucha eventos → genera reporte trazable

### Demo en vivo (3 min)

#### Paso 1 (30s) — Registro
\```bash
curl -X POST http://localhost:8000/auth/register \
  -d '{"dni":"12345678", "full_name":"Juan Pérez"}' \
  -H "Content-Type: application/json"
\```
→ Mostrar tx_hash y abrirlo en https://explorer-zk.tanenbaum.io/tx/...

**Narración:** "El DNI nunca queda on-chain. Solo el hash."

#### Paso 2 (30s) — Crear propuesta
Mostrar `GET /proposals` con las 3 propuestas pre-sembradas.

\```bash
curl http://localhost:8000/proposals
\```

#### Paso 3 (45s) — Votar
\```bash
curl -X POST http://localhost:8000/proposals/1/vote \
  -d '{"citizen_id":"0x...", "option":0}' \
  -H "Content-Type: application/json"
\```
→ Mostrar tx en explorer.

#### Paso 4 (60s) — Cierre y reporte
Cerrar propuesta (admin):
\```bash
curl -X POST http://localhost:8000/proposals/1/close
\```

Esperar ~10s. Pedir reporte:
\```bash
curl http://localhost:8000/reports/1
\```

→ Renderizar el markdown del reporte en una vista limpia (frontend ad-hoc o glow CLI).

**Narración:** "Hermes leyó el evento on-chain, generó un reporte con observaciones,
citó el tx_hash, y declaró su nivel de confianza. Todo auditable."

#### Paso 5 (30s) — Bonus MCP
Abrir Claude Code. Mostrar:
\```
/mcp
> civicsys (6 tools)
```
Pedirle a Claude: "Lista las propuestas y dame un resumen".
→ Claude usa `list_proposals` y `generate_report` automáticamente.

### Cierre (45s)
- Vision: edgechain SSCA propia, federación Latam (2 años).
- Stack: 100% open source, MIT, sobre Syscoin (Bitcoin-anchored).
- Equipo: 7 personas UCV. Pitch al final.

## Comandos pre-cargados (alias del shell)

Tener en `.bashrc`/`PROFILE`:
\```bash
alias demo-register='curl -X POST http://localhost:8000/auth/register ...'
alias demo-vote='curl -X POST http://localhost:8000/proposals/1/vote ...'
alias demo-report='curl http://localhost:8000/reports/1 | glow'
\```

## Plan B — Video pre-grabado

1. Grabar el demo completo el Día 6 (12h antes).
2. Subir a Drive del equipo.
3. Si el demo en vivo falla, Eduardo cambia a "Veamos un video preparado".

## Checklist pre-demo (Día 7, T-2h)

- [ ] zkTanenbaum responde (verificar con `cast call`).
- [ ] Hardhat local opcional listo como plan C.
- [ ] Frontend muestra propuestas reales (no fixtures).
- [ ] OBS configurado con escenas (terminal / browser / slides).
- [ ] Mic testeado.
- [ ] `.env` cerrado en VSCode (no se ve en pantalla).
- [ ] Tema del terminal con fuente legible (≥18pt).
- [ ] Conexión a internet con backup móvil.
- [ ] Café.

## Riesgos al vivo

| Riesgo | Mitigación |
|--------|------------|
| RPC zkTanenbaum cae | Plan B: hardhat local con mismas direcciones cacheadas |
| LLM caro / lento | Cache de reporte pre-cargado |
| Faltan TSYS | Pre-fundear cuenta con sobrante |
| Frontend rompe | Demo via curl puro (siempre funciona) |
```

### 2. Grabar el "Plan B"
Día 6, en condiciones controladas:
1. Levantar todo limpio (`docker compose down && up`).
2. OBS grabar pantalla + cámara.
3. Seguir el guión exacto.
4. Editar en CapCut/DaVinci para añadir captions.
5. Subir a `https://drive.google.com/.../civicsys-demo-planB.mp4`.

### 3. Compartir
- Pasar el `DEMO_SCRIPT.md` al equipo el Día 6 EOD.
- Practicar 2-3 veces antes del demo real.

### 4. Commit
```bash
git add docs/sprints/DEMO_SCRIPT.md
git commit -m "docs: demo script + plan B (A-040)"
```

## Verificación / Definition of Done

- ✅ `DEMO_SCRIPT.md` en repo.
- ✅ Video plan B grabado y accesible.
- ✅ Equipo practicó al menos 2 veces.
- ✅ Checklist pre-demo revisado.

## Errores comunes

- **No improvisar**
  Practicado > improvisado. Cada minuto que el demo improvisa, baja calidad.

- **Compartir pantalla con `.env` abierto**
  Cerrar TODOS los `.env` antes de iniciar OBS. Doble verificación.

## Lecturas
- [How to demo your hackathon project](https://www.hackathon.com/) (genérico)
- [`docs/sprints/sprint1.md`](../../docs/sprints/sprint1.md)

## Notas para revisor
- Tatiana revisa el script y confirma que NO se muestra ninguna PII.
- Grecia coordina con marketing para promocionar el demo post-grabación.
- Eduardo y Mario co-revisan el storytelling.
