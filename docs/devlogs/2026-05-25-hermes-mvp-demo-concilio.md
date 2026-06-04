# Devlog · 2026-05-25 · Hermes demoable: agente, consola CRT y Concilio (enjambre)

## Resumen

Sesión de construcción para la **fase de agente autónomo** de la hackathon. Se pasó de un
Hermes que era un stub (`/health` + un reporter sin cablear) a un **agente demoable de
punta a punta**: loop con tools sobre datos ficticios, LLM Gemini real, una **consola
interactiva CRT** y un **Concilio de agentes** (enjambre deliberativo estilo MNEMA) con una
**vista de evolución/estado** del sistema. Todo corre en localhost y está pusheado a `main`
(repo ahora **privado**). Ver el contexto estratégico en
[`2026-05-25-fase-agente-autonomo-reposicionamiento.md`](./2026-05-25-fase-agente-autonomo-reposicionamiento.md).

## Lo construido

### 1. Hermes como agente real (`agents/`)
- `app/agent.py` — `HermesAgent` con loop **percibir → decidir → actuar → responder**.
  Router de intención + tools deterministas (`list_proposals`, `get_proposal`, `get_tally`,
  `top_proposal`) sobre `app/mockdata.py` (4 propuestas ficticias). Devuelve la **traza de
  tools** para visualizar el agente "trabajando".
- LLM **Gemini** (`gemini-3.5-flash`) vía `app/llm.py` (proveedor primario; Anthropic/
  OpenRouter como fallback). Defensa anti-prompt-injection con `sanitize_untrusted` (ADR-005).
- **Fallback "simulado"** determinista: si no hay API key o el modelo falla, Hermes responde
  igual con análisis narrativo. El demo nunca se rompe en vivo.
- Endpoints: `GET /agents/health`, `GET /agents/proposals`, `POST /agents/hermes/ask`.
- Corre en **contenedor Docker aislado** (`ssca-hermes`): código copiado en la imagen, sin
  montar archivos del host, key Gemini en `infra/.env.hermes` (gitignored). No usa la cuenta
  Anthropic del dev.

### 2. Consola CRT + estética (`frontend/civicsys/`)
- Página `/hermes` — **consola terminal interactiva** (transcript, traza de tools,
  comandos rápidos, input con caret) que habla con Hermes por `POST /agents/hermes/ask`.
- Retheme **verde fósforo CRT** (cassette-futurism): `app/globals.css` retematizado, fuentes
  mono (Orbitron + Share Tech Mono), scanlines + glow.
- **Contraste corregido bajo LUMEN** (WCAG 2.2 AA piso): escala `phosphor.*` con ratios
  verificados (texto ≥ 10.5:1), glow solo en títulos, foco visible. Tokens documentados en
  `frontend/civicsys/DESIGN.md` (capa primitiva + semántica) y evidencia en
  `docs/design/evidence/2026-05-25-hermes-crt-contrast/a11y-report.md`.
- **Lluvia "Matrix"** de 0/1 de fondo (`components/MatrixRain.tsx`): canvas, `aria-hidden`,
  opacidad baja + paneles opacos → no degrada el contraste; respeta `prefers-reduced-motion`.

### 3. Concilio Hermes — enjambre de agentes (`agents/app/council.py`)
- Inspirado en el **patrón Counsel de MNEMA**: **4 consejeros con sesgos opuestos** corren
  en **paralelo** (`asyncio.gather`), sin verse entre sí (anti-sycophancy), cada uno con su
  temperatura y modo de contexto:
  - Ejecutor/Fiscal (temp 0.2), Garantista (0.5), Escéptico/Contralor (0.7),
    Primeros Principios (0.6, **purista** — solo ve los números).
- Un agente de **síntesis** compara las voces, mide la **divergencia** (desde las posturas
  `A_FAVOR`/`EN_CONTRA`/`CAUTELA`) y emite un **veredicto con disenso registrado**. La
  confianza consolidada se penaliza por divergencia.
- Ledger en memoria de sesiones (evolución) + stats por agente (estado del enjambre).
- Endpoints: `POST /agents/concilio`, `GET /agents/status`.
- Frontend: `components/CouncilBlock.tsx` (columnas de consejeros + medidor de divergencia +
  veredicto) integrado en la consola, y nueva vista **`/sistema`** (sistema + enjambre +
  evolución, autorefresh 4s).

## Decisiones técnicas clave (y por qué)

- **Modelo `gemini-3.5-flash` con `thinkingConfig.thinkingBudget: 0`.** El modelo es
  "thinking": sin cap, el razonamiento consumía 580–1150 tokens de salida y **truncaba/
  corrompía** la respuesta (aparecían artefactos `(NNN)`). Con `thinkingBudget: 0` la salida
  es completa y limpia (verificado: reportes de ~175 palabras). Default corregido en compose,
  `settings.py` y `llm.py`.
- **Datos ficticios en el propio agente**, no en la cadena/DB. El demo no depende de Anvil ni
  de MetaMask → robusto para mostrar en vivo y alineado con la fase (agente, no blockchain).
- **Divergencia determinista** (desde posturas parseadas), no otra llamada LLM: barato y estable.
- **Aislamiento de Hermes en Docker** por pedido explícito del usuario (no tocar archivos ni
  cuentas del host) — coherente con el modelo de seguridad sin signer custodial del proyecto.

## Bugs encontrados y resueltos

- **`backend/src/server.ts`**: `import "dotenv/config"` estaba después del import que lee
  `process.env` en su top-level → el backend crasheaba al arrancar. Movido al principio.
- **`frontend/.../lib/contracts.ts`**: importaba JSON **fuera de la raíz** del proyecto Next
  (`../../../shared/abis`, `../../../blockchain/deployments`) → Turbopack rompía el build
  global (500 en todas las rutas). Fix: ABIs/deployment copiados a `lib/abi/` + imports planos
  (sin `with { type: "json" }`). Reparó también las páginas blockchain.
- **Truncamiento de Gemini**: ver decisión `thinkingBudget: 0` arriba.
- **Contraste ilegible** de la primera versión del tema: resuelto con la escala `phosphor.*`
  (ver a11y-report).

## Estado del repositorio

- Pusheado a `main`: `26c2703` (agente + consola CRT + tema) y `e2f75e0` (concilio + evolución
  + Matrix + respuestas ricas). Working tree limpio, local en sync con `origin/main`.
- Repo pasó a **privado**. Acceso verificado (`git fetch` OK). Colaboradores: `SandroChavez`
  (admin), `orlando-vazquez-career` (write).
- Secretos: la `GEMINI_API_KEY` vive solo en `infra/.env.hermes` (gitignored). Cada push pasó
  un guard que escanea los archivos staged en busca del prefijo de las API keys de Google y
  aborta si la key llegara a colarse.

## Qué quedó abierto / próximos pasos

- **Fase blockchain (después)**: reverificar Chain ID/RPC de zkSYS **post-AirBender** antes de
  retomar (el repo asume `57057` / `rpc-zk.tanenbaum.io`; el Tanenbaum NEVM clásico es `5700`).
  Faucet nuevo: https://faucet-zk.tanenbaum.io/.
- **A11y AAA**: `aria-live="polite"` en el transcript para lectores de pantalla; validación
  automatizada axe-core/Lighthouse.
- **Tests `agents/`**: se agregaron `test_agent.py` y `test_council.py` pero la suite no se
  corrió en esta sesión (no se creó venv en el host por el aislamiento). Correr en CI o en un
  contenedor efímero.
- Posibles mejoras del concilio: más consejeros, reviewers ciegos (como MNEMA full), efecto
  typewriter en las respuestas.
- Onboarding para el equipo: documentar que al clonar hay que crear `infra/.env.hermes` con su
  propia key (sin key, corre en modo `simulado`).

## Archivos clave

```
agents/app/{agent,council,mockdata,llm,settings,main}.py
agents/tests/{test_agent,test_council,test_llm}.py
agents/Dockerfile · agents/.dockerignore
infra/docker-compose.yml (servicio hermes) · infra/.env.hermes (gitignored)
frontend/civicsys/app/{hermes,sistema}/page.tsx · app/{globals.css,layout.tsx,page.tsx}
frontend/civicsys/components/{MatrixRain,CouncilBlock}.tsx · DESIGN.md
docs/devlogs/2026-05-25-fase-agente-autonomo-reposicionamiento.md
docs/design/evidence/2026-05-25-hermes-crt-contrast/a11y-report.md
docs/testing-e2e-manual.md
```
