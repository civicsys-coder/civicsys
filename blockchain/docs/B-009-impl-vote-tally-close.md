---
id: B-009
title: "Vote.sol — closeProposal + cancelProposal + cierre por deadline"
owner: "Orlando"
backup: "Sandro"
effort: "45 min"
priority: P0
status: pending
depends_on: [B-008]
sprint: 1
layer: blockchain
---

# B-009 · `Vote.sol` — cierres

## Por qué importa
El evento `ProposalClosed` es el **trigger principal de Hermes** ([INSTINCT.md](../hermes/soul/INSTINCT.md) lo escucha y genera reporte). Si esta función no emite correctamente con el tally final, Hermes no se entera y el reporte no se genera — rompe el demo. Esta tarea cierra el ciclo del flujo `crear → votar → cerrar → reportar`.

## Conceptos clave
- **Cierre por admin vs por deadline**: en Sprint 1 cerramos manualmente (`closeProposal`). El cierre automático "después del deadline cualquiera puede invocar" lo dejamos como bonus.
- **Idempotencia**: si alguien llama `closeProposal` dos veces, la segunda debe fallar (no re-emitir el evento). Hermes asume "1 evento ProposalClosed = 1 reporte".
- **`view` que devuelve array**: devolver `uint256[]` desde `tally` cuesta gas proporcional al tamaño. Mantenemos `options.length <= 32` para limitar.
- **Diferencia "cerrar" y "cancelar"**: cerrar = "el tally es final". Cancelar = "esta propuesta nunca debió contar, ignorarla". Cancelar no emite tally.

## Pre-requisitos
- [ ] [B-008](./B-008-impl-vote-cast-vote.md) cerrada.

## Paso a paso

### 1. Reemplazar placeholders en `contracts/Vote.sol`
Borrá las dos funciones `pure` que decían `not implemented` y agregá:

```solidity
    // ---- New errors ----
    error CannotCloseYet(uint256 proposalId, uint64 deadline);
    error ProposalAlreadyFinal(uint256 proposalId, ProposalStatus status);
    error UnauthorizedClose(address caller, uint256 proposalId);

    /// @inheritdoc IVote
    /// @dev Pueden cerrar:
    ///   - admin (DEFAULT_ADMIN_ROLE)
    ///   - curador original de la propuesta
    ///   - cualquiera SI ya pasó el deadline
    function closeProposal(uint256 proposalId) external {
        Proposal storage p = _proposals[proposalId];
        if (p.id == 0) revert ProposalAlreadyFinal(proposalId, ProposalStatus.Cancelled);
        if (p.status != ProposalStatus.Active) {
            revert ProposalAlreadyFinal(proposalId, p.status);
        }

        bool isAdmin   = hasRole(DEFAULT_ADMIN_ROLE, msg.sender);
        bool isCurator = (msg.sender == p.curator);
        bool expired   = uint64(block.timestamp) > p.deadline;
        if (!isAdmin && !isCurator && !expired) {
            revert UnauthorizedClose(msg.sender, proposalId);
        }

        p.status = ProposalStatus.Closed;
        emit ProposalClosed(proposalId, _tallies[proposalId], uint64(block.timestamp));
    }

    /// @inheritdoc IVote
    function cancelProposal(uint256 proposalId)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        Proposal storage p = _proposals[proposalId];
        if (p.id == 0) revert ProposalAlreadyFinal(proposalId, ProposalStatus.Cancelled);
        if (p.status != ProposalStatus.Active) {
            revert ProposalAlreadyFinal(proposalId, p.status);
        }
        p.status = ProposalStatus.Cancelled;
        emit ProposalCancelled(proposalId, uint64(block.timestamp));
    }
```

### 2. ¿Por qué tres condiciones para cerrar?

| Caso | Quién | Por qué |
|------|-------|---------|
| Admin | DAO / equipo del demo | Para forzar cierre durante demo si hay urgencia |
| Curador | Quien creó la propuesta | Permite cerrar antes si las opciones quedaron mal formuladas |
| Cualquiera + deadline pasado | Robots/relayers | Si nadie cierra, el tally final igualmente queda fijado (Hermes puede tener un cron que llame `closeProposal` después del deadline) |

### 3. Compilar
```bash
cd blockchain
npx hardhat compile
```

Esperado: 0 errores, 0 warnings.

### 4. Test smoke local
```bash
npx hardhat console
```

```js
// (setup similar a B-008)
const dl = Math.floor(Date.now()/1000) + 3600;
await vote.createProposal("X", "Y", ["A","B"], dl);
await reg.register("0x" + "11".repeat(32), "JUAN");
await vote.castVote(1, "0x" + "11".repeat(32), 0);
const rcpt = await (await vote.closeProposal(1)).wait();
console.log("event:", rcpt.logs[0].fragment.name); // ProposalClosed
console.log("tally:", await vote.tally(1));        // [1n, 0n]

// segunda vez debe fallar
try { await vote.closeProposal(1); } catch(e) { console.log("ok rechazado:", e.shortMessage); }
```

### 5. Commit
```bash
git add blockchain/contracts/Vote.sol
git commit -m "feat(blockchain): Vote.closeProposal y cancelProposal (B-009)"
```

## Verificación / Definition of Done

- ✅ `npx hardhat compile` sin errores.
- ✅ El ABI generado contiene `closeProposal`, `cancelProposal`, eventos `ProposalClosed`, `ProposalCancelled`.
- ✅ El test E2E ([B-012](./B-012-tests-e2e.md)) eventualmente valida el flujo completo.

```bash
node -e "const a=require('./artifacts/contracts/Vote.sol/Vote.json').abi; console.log(a.filter(x=>x.type==='event').map(x=>x.name).sort())"
```

Esperado:
```
[ 'ProposalCancelled', 'ProposalClosed', 'ProposalCreated', 'RoleAdminChanged', 'RoleGranted', 'RoleRevoked', 'VoteCast' ]
```

## Errores comunes

- **No se emite `ProposalClosed`**
  Probable causa: olvidaste pasar `_tallies[proposalId]` al evento. Re-verificá que el `emit` esté después del cambio de status.

- **Cierre múltiple deja status raro**
  Si el check de `p.status != Active` falta, podría re-emitir. Confirmá con un test que la segunda llamada reverte con `ProposalAlreadyFinal`.

- **`onlyRole` en `cancelProposal` falla aunque el admin sea correcto**
  Probablemente desplegaste pasándole una dirección distinta como admin. Mirá los args del constructor de tu deploy.

## Lecturas
- [Solidity Events](https://docs.soliditylang.org/en/v0.8.24/contracts.html#events)
- [`docs/architecture/sprint1-overview.md`](../../docs/architecture/sprint1-overview.md) — flujo de cierre y reporte
- [`agents/hermes/soul/INSTINCT.md`](../../agents/hermes/soul/INSTINCT.md) — reflex sobre `votacion_cerrada`

## Notas para revisor
- Verificar que `ProposalClosed` se emite con el `tally` **del momento del cierre** — si alguien votó en el mismo bloque pero después, podría no contarse. Discutirlo si surge.
- El test E2E debe validar que Hermes recibe el evento decodificado correctamente (eso lo hace `agents/`).
- Considerar agregar un guard de gas si una propuesta tiene 32 opciones — el evento puede ser ~1500 bytes. OK para Sprint 1.
