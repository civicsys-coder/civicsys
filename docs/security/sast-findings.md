# SAST findings — CivicSys contratos

**Fecha**: 2026-05-23
**Sprint**: 02 Security Hardening
**Tarea**: T-16 del plan táctico.
**Herramientas**:
- **solhint** v6.2.1 — config `blockchain/.solhint.json` (extiende `solhint:recommended`).
- **slither** — no instalado en el entorno Windows del orquestador. Recomendable correr en CI Linux (próximo sprint).

**Comando reproducible**:
```bash
cd blockchain && pnpm scan
# o equivalente:
cd blockchain && npx solhint 'contracts/**/*.sol'
```

## Resumen

| Severidad | Cantidad | Status |
|---|---|---|
| Critical | 0 | — |
| High | 0 | — |
| Medium | 0 | — |
| Low (warning) | 52 | aceptadas (gas + natspec) |
| Info | — | — |

✅ **Cero findings de severidad explotable**. Los 52 warnings son **optimizaciones de gas + documentación natspec**, no vulnerabilidades de seguridad.

## Detalle por categoría

### 1. `gas-custom-errors` (≈12 warnings)

Sugiere reemplazar `require(cond, "msg")` por `error CustomName()` + `revert CustomName()`. Optimización de gas (~5-10 gas por revert).

**Decisión**: ACEPTAR EL WARNING — los `require` con mensajes son más legibles para humanos y el ahorro de gas es marginal en una operación de votación (no es DeFi de alto volumen). Reabrir en Sprint 03 si se ataca mainnet con presupuesto de gas estricto.

**Archivos afectados**: `CitizenRegistry.sol`, `Vote.sol`.

### 2. `gas-strict-inequalities` (2 warnings en `Vote.sol`)

Sugiere reemplazar `>=`/`<=` con `>`/`<` cuando sea posible. Optimización mínima (~3 gas).

**Decisión**: ACEPTAR — las inequalities estrictas cambian semántica (`closeAt > openAt` vs `closeAt >= openAt`). El código actual usa la semántica correcta para una ventana de votación cerrada en ambos extremos. No cambiar.

### 3. `gas-increment-by-one` (3 warnings en `Vote.sol::castVote`)

Sugiere `++variable` en vez de `variable++`. Optimización mínima.

**Decisión**: ACEPTAR — usaremos `++variable` si Sprint 03 toca esta función por otra razón. No vale la pena un PR sólo para esto.

### 4. `gas-indexed-events` (4 warnings)

Sugiere marcar parámetros de eventos como `indexed` para que los logs sean queryables por filter. Pero hay un límite de 3 indexed params por evento.

**Decisión**: ACEPTAR para Sprint 02. Si en Sprint 03 el frontend o backend necesita filtrar por `proposalId` en `VoteCast` o `ProposalClosed`, agregar `indexed`. Por ahora consumimos los eventos completos sin filter on-chain.

### 5. `use-natspec` (≈25 warnings)

Faltan tags `@author`, `@notice`, `@param`, `@return` en interfaces y contratos.

**Decisión**: COMPLETAR PARCIALMENTE — agregar `@notice` y `@param` a los símbolos públicos en el próximo PR de mantenimiento. No bloqueante.

### 6. `immutable-vars-naming` (1 warning)

`Vote.sol::registry` debería llamarse `REGISTRY` por convención de inmutables.

**Decisión**: ACEPTAR — el nombre actual es legible y se accede como `registry.isRegistered(...)`. Cambiar a `REGISTRY.isRegistered(...)` reduce legibilidad. Decisión de estilo, no de seguridad.

## Reproducción

```bash
cd blockchain
pnpm install
pnpm scan
```

Output esperado: `52 problems (0 errors, 52 warnings)`. Si aparece un nuevo `error`, **bloquea CI**.

## Para Sprint 03+

- Instalar slither en CI runners Linux (`pip install slither-analyzer`).
- Correr slither como parte del job de tests del blockchain en GitHub Actions.
- Endurecer `.solhint.json` para tratar warnings de gas como errores cuando se prepare mainnet deploy.
- Completar tags natspec de `@author`, `@notice`, `@param`, `@return` en interfaces.

## Para auditoría externa profesional

Estos findings de solhint **no sustituyen** la auditoría externa profesional descrita en [`audit-scope.md`](audit-scope.md). Solhint cubre conformance estática; auditoría humana cubre lógica de negocio + economía + ataques específicos al stack zkStack.

## Output crudo (para diff futuros)

```
contracts\Vote.sol
   9:1   warning  Missing @author tag in contract 'Vote'                                                          use-natspec
  11:5   warning  Immutable variables name are set to be in capitalized SNAKE_CASE                                immutable-vars-naming
  31:9   warning  GC: Use Custom Errors instead of require statements                                             gas-custom-errors
  ... (47 more — ver output completo en CI log)

contracts\CitizenRegistry.sol
  10:1  warning  Missing @author tag in contract 'CitizenRegistry'    use-natspec
  16:9  warning  GC: Use Custom Errors instead of require statements  gas-custom-errors
  17:9  warning  GC: Use Custom Errors instead of require statements  gas-custom-errors

contracts\interfaces\IVote.sol
  ...

contracts\interfaces\ICitizenRegistry.sol
  ...

✖ 52 problems (0 errors, 52 warnings)
```

## Histórico

- 2026-05-23: primera corrida (Sprint 02 T-16). 52 warnings, 0 errors. Estado: ACEPTADO.
