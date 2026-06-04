---
id: B-013
title: "Cobertura ≥ 80% + reporte HTML"
owner: "Gabriel"
backup: "Orlando"
effort: "45 min"
priority: P1
status: pending
depends_on: [B-012]
sprint: 1
layer: blockchain
---

# B-013 · Cobertura ≥ 80%

## Por qué importa
El [DoD del Sprint 1](../../docs/sprints/sprint1.md#definition-of-done) exige **≥ 80% cobertura**. Sin esta evidencia el sprint no se considera cerrado. Más práctico: cobertura es una *señal* de qué ramas del contrato no fueron probadas — y en contratos esas ramas son la parte que los atacantes más explotan.

## Conceptos clave
- **`solidity-coverage`**: plugin de Hardhat que instrumenta el bytecode para reportar qué líneas se ejecutaron. Viene con `hardhat-toolbox`.
- **Tipos de cobertura**: `line` (líneas ejecutadas), `branch` (cada rama `if/else`), `function`, `statement`. La que más importa en contratos es **branch**, porque un revert no cubierto = un revert no testeado.
- **Reportes**: `solidity-coverage` genera `coverage/index.html` navegable. Compartilo como artifact en CI.
- **Trampas comunes**: `view` functions y `pure` se cuentan a coverage; modifiers también. Si un `onlyRole` no se prueba, baja el coverage.

## Pre-requisitos
- [ ] [B-012](./B-012-tests-e2e.md) cerrada.

## Paso a paso

### 1. Configurar `solidity-coverage` (si no está)
`hardhat-toolbox` lo incluye, pero conviene confirmar:

```bash
cd blockchain
node -e "require('solidity-coverage')"
```

Si tira `Cannot find module`, instalar:
```bash
npm install --save-dev solidity-coverage
```

Y en `hardhat.config.ts` agregar al final del array de imports (después de `hardhat-toolbox`):

```ts
import "solidity-coverage";
```

> Si ya importás `hardhat-toolbox`, NO duplicar — ya lo trae.

### 2. Ignorar archivos que no cuentan a cobertura
Crear `blockchain/.solcover.js`:

```js
module.exports = {
  skipFiles: [
    "interfaces/",          // las interfaces no tienen lógica
  ],
  istanbulReporter: ["html", "text", "lcov"],
  // los tests con muchos ciudadanos consumen mucho gas instrumentado
  configureYulOptimizer: false,
};
```

### 3. Correr cobertura
```bash
npx hardhat coverage
```

Salida típica:
```
File                          |  % Stmts | % Branch |  % Funcs |  % Lines |
------------------------------|----------|----------|----------|----------|
 contracts/                   |    98.50 |    92.86 |    94.74 |    98.61 |
  CitizenRegistry.sol         |    100   |    93.75 |    100   |    100   |
  Vote.sol                    |    97.40 |    92.11 |    91.67 |    97.50 |
------------------------------|----------|----------|----------|----------|
All files                     |    98.50 |    92.86 |    94.74 |    98.61 |
```

### 4. Inspeccionar reporte HTML
```bash
# Windows:
start coverage/index.html
# Linux/Mac:
open coverage/index.html
```

Navegar por `CitizenRegistry.sol` y `Vote.sol`: cualquier línea roja es código no testeado.

### 5. Subir cobertura
Si quedó debajo de 80%, agregar los tests faltantes mirando las líneas rojas. Casos comunes que se olvidan:
- `else` no testeado de un `if`.
- `revert` por permisos.
- Helpers `view` que ningún test llama.

### 6. Documentar
Crear `blockchain/docs/COVERAGE.md` (snapshot del último run):

```markdown
# Coverage report — Sprint 1

Fecha: <YYYY-MM-DD>
Branch: main
Comando: `npx hardhat coverage`

| File | Stmts | Branch | Funcs | Lines |
|------|-------|--------|-------|-------|
| CitizenRegistry.sol | 100% | 93.75% | 100% | 100% |
| Vote.sol | 97.40% | 92.11% | 91.67% | 97.50% |
| **Total** | **98.50%** | **92.86%** | **94.74%** | **98.61%** |

DoD cumplido: ≥ 80%. ✅
```

### 7. Commit
```bash
git add blockchain/.solcover.js blockchain/docs/COVERAGE.md
git commit -m "test(blockchain): coverage config + snapshot (B-013)"
```

> No commitear `coverage/` (debe estar en `.gitignore`). El snapshot textual va al repo.

## Verificación / Definition of Done

```bash
cd blockchain
npx hardhat coverage
```

- ✅ Statements ≥ 80%.
- ✅ Branches ≥ 80%.
- ✅ Functions ≥ 80%.
- ✅ `coverage/` está en `.gitignore`.
- ✅ `docs/COVERAGE.md` actualizado.

## Errores comunes

- **`Error: cannot estimate gas`**
  `solidity-coverage` instrumenta el bytecode, hace que el gas sea mayor. Subir el `gasLimit` del network `hardhat` en `hardhat.config.ts`:
  ```ts
  networks: {
    hardhat: { chainId: 31337, blockGasLimit: 30_000_000 },
  }
  ```

- **Tests pasan en `test` pero fallan en `coverage`**
  Los tests dependen de gas exacto. Solución: no testear gas en hardhat local con coverage activado, marcalo con `.skip` si está activo el flag de coverage.

- **`Cannot find module 'solidity-coverage'`**
  Está fuera del `package.json`. Reinstalá: `npm install --save-dev solidity-coverage`.

## Lecturas
- [solidity-coverage docs](https://github.com/sc-forks/solidity-coverage)
- [Branch coverage importance](https://en.wikipedia.org/wiki/Code_coverage#Branch_coverage)

## Notas para revisor
- ⚠️ Branch coverage es la métrica que más importa. Si tenemos 100% statements pero 60% branches, igual NO cerramos la tarea.
- Si una rama está conscientemente fuera (ej. cierre por panic), documentar en `COVERAGE.md` por qué se omitió.
- Considerar subir el reporte como artifact de GitHub Actions en Sprint 2.
