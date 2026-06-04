# B-036 · Crear servidor principal en server.ts

**id:** B-036
**title:** Crear servidor principal en server.ts
**owner:** [Responsable]
**backup:** [Backup/Pair]
**effort:** 20 min
**priority:** P0
**status:** pending
**depends_on:** B-028, B-029, B-030, B-031, B-032, B-033, B-034, B-035
**sprint:** 1
**layer:** backend

---

## Por qué importa
Es el punto de entrada de la API y orquesta todos los componentes.

## Conceptos clave
- Servidor Express
- Middlewares
- Rutas

## Pre-requisitos
- Middlewares y rutas implementados

## Paso a paso
1. Crear archivo server.ts en src/.
2. Importar y usar todos los middlewares y rutas.
3. Configurar manejo de errores y health check.
4. Iniciar el servidor en el puerto definido en .env.

## Verificación / Definition of Done
- Servidor funcional y escuchando en el puerto correcto.

## Errores comunes
- No importar correctamente los middlewares o rutas.

## Lecturas
- https://expressjs.com/es/starter/hello-world.html

## Notas para revisor
- Confirmar que el servidor responde a /health y maneja errores.