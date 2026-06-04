# Cómo crear una API key de Google Gemini

Hermes usa **Gemini** (`gemini-3.5-flash`) para el análisis del Concilio y La Tóxica.
Sin key, Hermes funciona igual pero con análisis **simulado** (determinista). Con key, el
análisis es **real**. Es gratis para empezar.

---

## Paso a paso

1. Entrá a **Google AI Studio**: <https://aistudio.google.com/apikey>
   (iniciá sesión con tu cuenta de Google — podés usar el Gmail nuevo del equipo).
2. Aceptá los términos de Google AI Studio si te los pide (primera vez).
3. Click en **Create API key** (Crear clave de API).
4. Elegí un **proyecto de Google Cloud** existente o dejá que cree uno nuevo
   (botón *Create API key in new project*). No necesitás configurar facturación para el
   tier gratuito.
5. Se genera la key (formato **`AIza...`**). **Copiala** (botón de copiar). Se puede volver
   a ver desde la misma página, pero tratala como secreto.

---

## Dónde va la key

CivicSys tiene **dos** formas de correr Hermes; poné la key en la que uses:

- **Hermes en Docker (recomendado, lo levanta `infra/up.sh`)** → `infra/.env.hermes`:
  ```
  GEMINI_API_KEY=AIza...tu-key
  ```
  Reiniciá el contenedor: `docker compose -f infra/docker-compose.yml up -d hermes`.

- **Hermes en host (uvicorn)** → `agents/.env`:
  ```
  GEMINI_API_KEY=AIza...tu-key
  ```

- **En producción (Railway)** → variable de entorno `GEMINI_API_KEY` del servicio Hermes.

Ambos archivos `.env`/`.env.hermes` están **gitignored** (no se commitean).

---

## Verificar que quedó activa

```bash
curl http://localhost:8000/agents/health
# Esperás:  {"status":"ok", ... "llm":{"model":"gemini-3.5-flash","gemini_key":true}}
```

`"gemini_key":true` = Hermes detectó la key. (No garantiza que sea válida; si la key fuera
inválida, Hermes cae al modo simulado en cada llamada, sin romperse.)

---

## Notas

- **Modelo**: el proyecto usa `gemini-3.5-flash` (rápido y barato). Se configura con
  `LLM_MODEL_GEMINI`.
- **Límites del tier gratuito**: hay cuota por minuto/día. Para una demo alcanza de sobra.
- **Seguridad**: nunca pegues la key en código ni en `.env.example`; solo en los `.env`
  reales (gitignored). Si se filtra, revocala en <https://aistudio.google.com/apikey> y creá otra.
- **Fallback**: Hermes también acepta `ANTHROPIC_API_KEY` u `OPENROUTER_API_KEY` como
  alternativa; con cualquiera de las tres hay análisis real.
