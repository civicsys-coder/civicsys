---
id: A-XXX
title: "Título corto en imperativo"
owner: "Nombre principal"
backup: "Nombre alterno"
effort: "1 h"
priority: P0 | P1 | P2
status: pending          # pending · in_progress · done · blocked
depends_on: [A-YYY]
sprint: 1
layer: agents
---

# A-XXX · Título descriptivo

## Por qué importa
2-4 frases sobre qué pieza del producto desbloquea esta tarea y por qué no se puede saltar. Conectar con el flujo end-to-end del [sprint1.md](../../docs/sprints/sprint1.md).

## Conceptos clave
- **Concepto 1**: explicación de una línea. Si el junior no lo conoce, leer [link].

## Pre-requisitos
- [ ] Tareas previas en `depends_on` cerradas.
- [ ] Herramientas instaladas / env vars listas.

## Paso a paso

### 1. Paso descriptivo
Explicación + comando o snippet.

```python
# código completo
```

## Verificación / Definition of Done

```bash
pytest tests/test_X.py -v
```

Salida esperada:
```
test_X.py::test_caso_a PASSED
test_X.py::test_caso_b PASSED
```

## Errores comunes
- **Error:** mensaje → solución.

## Lecturas
- [Docs externos]
- ADR / skill relacionado.

## Notas para revisor
Qué mirar en el PR — invariantes, edge cases, naming.
