---
id: B-XXX
title: "Título corto en imperativo"
owner: "Nombre principal"
backup: "Nombre alterno (opcional)"
effort: "1 h"            # estimación honesta
priority: P0 | P1 | P2
status: pending          # pending · in_progress · done · blocked
depends_on: [B-YYY]      # IDs de tareas previas
sprint: 1
layer: blockchain
---

# B-XXX · Título descriptivo

## Por qué importa
Explicación corta (2-4 frases) de qué pedazo del producto desbloquea esta tarea y por qué no se puede saltar. Conectar con el flujo end-to-end del [sprint1.md](../../docs/sprints/sprint1.md).

## Conceptos clave
- **Concepto 1**: explicación de una línea. Si el junior no lo conoce, leer [link].
- **Concepto 2**: idem.

## Pre-requisitos
- [ ] Tarea(s) `depends_on` completadas.
- [ ] Herramientas instaladas: …
- [ ] Variables de entorno necesarias: …

## Paso a paso

### 1. Título del paso
Explicación de qué hace este paso y *por qué*. Cuando hay algo "raro" (un flag, un patrón poco intuitivo) explicarlo en lugar de pedir que se confíe.

```bash
# comando concreto
```

### 2. Siguiente paso
…

## Snippet completo (copy-paste)
```solidity
// código terminado para pegar
```

## Verificación / Definition of Done
Lista de comandos que deben pasar antes de marcar `done`:

```bash
npx hardhat compile
npx hardhat test test/MiArchivo.test.ts
```

Y la **salida esperada**, para que se pueda comparar:
```
  Vote
    ✓ registers a proposal (XXXms)
  …
```

## Errores comunes
- **Error:** "InvalidNonce" al desplegar → solución.
- **Error:** "out of gas" → cómo subir el gasLimit.

## Lecturas
- [Docs Hardhat — Configuration](https://hardhat.org/hardhat-runner/docs/config)
- ADR / threat model relacionado.

## Notas para revisor
Qué mirar en el PR. Ej: "Asegurarse que el evento incluye el `citizenId` indexado, sin esto Hermes no puede filtrar logs."
