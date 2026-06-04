---
id: B-022
title: "Mini-runbook: redeploy y rollback de emergencia"
owner: "Tatiana"
backup: "Orlando"
effort: "45 min"
priority: P2
status: pending
depends_on: [B-019]
sprint: 1
layer: blockchain
---

# B-022 · Runbook redeploy / rollback

## Por qué importa
Mid-demo, alguien encuentra un bug en `Vote.sol`. ¿Qué hacemos? Sin un runbook claro, el equipo gasta 30 min discutiendo en vez de actuar. Este documento son los pasos exactos para:

1. Redesplegar contratos.
2. Apagar el sistema en producción si hay incidente.
3. Comunicar al equipo.

Aunque los contratos son **inmutables** (no se "actualizan"), podemos:
- Desplegar versiones nuevas con direcciones nuevas.
- Marcar las viejas como "deprecated" en el README.
- Cancelar propuestas activas con `cancelProposal`.

## Conceptos clave
- **Inmutabilidad**: una vez desplegado, el bytecode no cambia. No hay "upgrade in place" en este Sprint (no usamos proxies UUPS / Transparent).
- **Pause pattern (no usado aquí)**: en Sprint 2+ podemos agregar OpenZeppelin `Pausable`. Por ahora, "pause" = "cancel todas las active proposals".
- **DNS-equivalente**: cuando redesplegamos, el `deployments/zkTanenbaum.json` actúa de DNS — los agentes leen siempre desde ahí.

## Pre-requisitos
- [ ] [B-019](./B-019-deploy-zktanenbaum.md) cerrada.

## Paso a paso

Crear `blockchain/docs/RUNBOOK.md` con el siguiente contenido:

```markdown
# Runbook · CivicSys blockchain layer

## Escenario 1 — Redeploy planificado (bug fix)

Pre-requisito: la vieja propuesta sigue activa y necesitamos un nuevo contrato.

1. Crear branch: `git checkout -b fix/<descripcion-bug>`
2. Fix code + tests + coverage.
3. Compile + test local.
4. (Solo si afecta a propuestas activas) Cancelar las viejas:
   \```bash
   npx hardhat run scripts/cancel-active.ts --network zkTanenbaum
   \```
5. Redeploy:
   \```bash
   npx hardhat run scripts/deploy.ts --network zkTanenbaum
   \```
6. `deployments/zkTanenbaum.json` se sobreescribe → commit + push.
7. Avisar a Sandro: nuevas direcciones en `agents/.env`.
8. Re-seed propuestas si era necesario:
   \```bash
   npx hardhat run scripts/seed-proposals.ts --network zkTanenbaum
   \```
9. Smoke test ([B-020](./B-020-smoke-test-onchain.md)).
10. Actualizar `blockchain/README.md` con nuevas direcciones.

## Escenario 2 — Incidente en vivo (bug crítico durante demo)

**Prioridad: minimizar exposición pública del bug.**

1. **Tatiana** anuncia en el canal del equipo: "incidente, stop demo".
2. **Eduardo** detiene cualquier demo en vivo.
3. **Orlando** evalúa:
   - ¿Es un bug en código o solo data corrupta?
   - ¿Hay propuestas activas en riesgo?
4. Si data corrupta:
   - Cancelar las propuestas afectadas con `cancelProposal(id)`.
   - Emitir comunicación pública post-mortem.
5. Si bug en código:
   - Cancelar TODAS las propuestas activas (preventivo).
   - Iniciar Escenario 1 (redeploy).
   - Pegar `Bug fix in progress` en el `README.md`.
6. **Grecia** prepara comunicado si hubo exposición pública.

## Escenario 3 — Pérdida de la deployer key

1. Considerar la key **comprometida** desde ya.
2. Generar nueva wallet ([B-003](./B-003-env-y-gitignore.md) paso 2).
3. Pedir TSYS al nuevo address ([B-018](./B-018-solicitar-faucet-tsys.md)).
4. La clave vieja **no controla los contratos desplegados** (los roles los tiene `apiSigner`, distinto).
   - SI también se perdió `apiSigner`: redesplegar todo desde cero.

## Escenario 4 — Faucet seco y deploy bloqueado

1. **Eduardo** contacta Syscoin Foundation directamente.
2. **Mario** moviliza contactos del hackathon para escalar.
3. **Plan C**: pedir TSYS prestado a otro equipo (raro pero válido en hackathon).
4. Documentar el blocker en `docs/sprints/sprint1.md` y mover plan B.

## Llamadas a hacer

- **Compromiso de key**: avisar al canal del equipo en menos de 5 min.
- **Bug crítico**: notificar a Tatiana antes que a cualquiera.
- **Faucet/RPC degradado**: Eduardo y Mario.

## Comandos de emergencia (cheat sheet)

\```bash
# Confirmar quien tiene el rol admin
cast call $REG "hasRole(bytes32,address)(bool)" $(cast keccak "DEFAULT_ADMIN_ROLE") $APISIGNER --rpc-url $RPC

# Cancelar todas las propuestas activas (loop manual)
for id in 1 2 3; do
  cast send $VOTE "cancelProposal(uint256)" $id --rpc-url $RPC --private-key $APISIGNER_PRIVKEY
done

# Revocar role en emergencia (ej. comprometieron apiSigner)
cast send $REG "revokeRole(bytes32,address)" $(cast keccak "REGISTRAR_ROLE") $APISIGNER \
  --rpc-url $RPC --private-key $ADMIN_PRIVKEY
\```
```

### 2. Commit
```bash
git add blockchain/docs/RUNBOOK.md
git commit -m "docs(blockchain): runbook redeploy y rollback (B-022)"
```

## Verificación / Definition of Done

- ✅ `RUNBOOK.md` cubre los 4 escenarios.
- ✅ Cheat sheet de `cast` funciona (probar el `hasRole` manualmente).
- ✅ Equipo leyó y aprobó en el daily.

## Errores comunes

- **El runbook queda desactualizado**
  Después de cada bug real, agregar el escenario nuevo. Es un documento vivo.

- **"No tenemos un script `cancel-active.ts`"**
  Crearlo a demanda si lo necesitan; Sprint 1 no lo precisa hasta ahora. Hacer issue: `B-022b` si decisión.

## Lecturas
- [Google SRE — Incident management](https://sre.google/sre-book/managing-incidents/)
- [Conducting blameless postmortems](https://landing.google.com/sre/sre-book/chapters/postmortem-culture/)

## Notas para revisor
- ¿Las llamadas de emergencia tienen nombres concretos? Si no, alguien no sabrá a quién llamar.
- ¿Los comandos cast están testeados o son inventados? Hay que probarlos al menos una vez en hardhat local.
- Compartir el runbook con todo el equipo en el daily — no enterrar en docs.
