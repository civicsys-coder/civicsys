---
id: B-018
title: "Solicitar TSYS al faucet / Syscoin Foundation"
owner: "Eduardo"
backup: "Orlando"
effort: "30 min + tiempo de espera"
priority: P0
status: pending
depends_on: [B-003]
sprint: 1
layer: blockchain
---

# B-018 · Solicitar fondos TSYS

## Por qué importa
Sin TSYS no podemos pagar gas en zkTanenbaum, lo que bloquea el deploy real ([B-019](./B-019-deploy-zktanenbaum.md)) y todos los tests on-chain ([B-020](./B-020-smoke-test-onchain.md)). Este es uno de los riesgos marcados como **Alta severidad** en [sprint1.md § Riesgos](../../docs/sprints/sprint1.md#riesgos-y-mitigacion). Lo hacemos **lo antes posible** porque el faucet puede tardar horas.

## Conceptos clave
- **Faucet**: dispenser gratuito de tokens de testnet. Suelen tener rate limit (1 request por dirección por día) o requerir Twitter/Discord activo.
- **Foundation request**: si el faucet rate-limita, escribir directo al equipo de Syscoin Foundation suele desbloquear casos de hackathon. Eduardo / Mario lo coordinan.
- **Cantidad necesaria**: el deploy de los 2 contratos consume ~1-3M gas total. A precio de testnet ~1 gwei, son fracciones de TSYS. Pedir **al menos 1 TSYS** para tener margen.
- **Dirección no privada**: solo le decimos al faucet la dirección pública del deployer. NUNCA compartimos la private key.

## Pre-requisitos
- [ ] [B-003](./B-003-env-y-gitignore.md) completada (tenemos la dirección del deployer generada).
- [ ] Sin balance previo en zkTanenbaum.

## Paso a paso

### 1. Recuperar la dirección del deployer
```bash
cd blockchain
node -e "const {ethers}=require('ethers'); console.log(new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY).address)" 
# o
node -e "require('dotenv').config(); const {ethers}=require('ethers'); console.log(new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY).address)"
```

Anotala. Solo el resultado va al faucet, **NUNCA la private key**.

### 2. Identificar el faucet oficial de zkTanenbaum
Opciones a explorar (orden de preferencia):

1. **Sitio oficial de Syscoin**: https://syscoin.org/ → buscar "faucet zkSYS" o "Tanenbaum faucet".
2. **Discord oficial de Syscoin**: canal `#testnet-faucet` o equivalente.
3. **Foundation request**: enviar email a `dev@syscoin.org` o contacto de hackathon explicando el proyecto + dirección.

> Si el faucet pide login con Twitter, asegurate de usar la cuenta del **equipo** (no la personal con dudas de seguridad).

### 3. Solicitar fondos
- Pegá la dirección del deployer.
- Si te piden un mensaje, decí: *"CivicSys hackathon team, deploying CitizenRegistry + Vote.sol on zkTanenbaum chain 57057."*
- Submit.

### 4. Esperar y verificar
```bash
cd blockchain
# Después de unos minutos:
npx hardhat console --network zkTanenbaum
```

```js
const addr = (await ethers.getSigners())[0].address;
const bal = await ethers.provider.getBalance(addr);
console.log(ethers.formatEther(bal), "TSYS");
```

Si tira `0.0`, el faucet aún no procesó. Esperá 10-30 min y reintentá.

### 5. Si el faucet falla
**Plan B**: Eduardo o Mario contactan a Syscoin Foundation directamente vía:
- Telegram del equipo organizador del hackathon
- Email de contacto del evento
- DM a desarrolladores conocidos de la foundation

**Plan C**: Compartir desde una cuenta del equipo que ya tenga TSYS:
```bash
# Otro miembro del equipo con TSYS:
npx hardhat console --network zkTanenbaum
# Adentro:
const tx = await (await ethers.getSigners())[0].sendTransaction({
  to: "0x...deployer_address...",
  value: ethers.parseEther("1.0")
});
await tx.wait();
```

### 6. Registrar en docs
Agregar al `docs/sprints/sprint1.md` (sección "Estado de riesgos"):
```markdown
- [x] Faucet TSYS — resuelto 2026-05-19 (1.0 TSYS recibidos via faucet oficial)
  - tx: 0x...
  - balance disponible: 1.0 TSYS
```

### 7. Commit (solo el cambio de docs)
```bash
git add docs/sprints/sprint1.md
git commit -m "docs(sprint1): registrar recepción de TSYS desde faucet (B-018)"
```

## Verificación / Definition of Done

```bash
cd blockchain
npx hardhat console --network zkTanenbaum
> (await ethers.provider.getBalance((await ethers.getSigners())[0].address)).toString()
```

- ✅ Balance > 0.5 TSYS (margen para deploy + redeploy si fuera necesario).
- ✅ Confirmar en explorer: https://explorer-zk.tanenbaum.io/address/0x...
- ✅ docs/sprints/sprint1.md actualizado.

## Errores comunes

- **Faucet "rate limit"**
  Pedir desde otra cuenta del equipo si urge. O esperar 24 h.

- **Recibimos TSYS pero el balance no aparece en hardhat**
  Probable: usaste la dirección equivocada. Doble-check: la dirección que pediste vs `await ethers.getSigners()`.

- **Faucet pide pruebas en mainnet** (raro)
  Algunos requieren tener tx history en alguna otra cadena. Compartirlo con Eduardo.

- **Tx llega pero a address(0)**
  Faucet bug, contactar Foundation.

## Lecturas
- [ADR-0001 § Riesgos](../../docs/adr/0001-zkTanenbaum-as-target-chain.md)
- [Documentación oficial Syscoin/Tanenbaum](https://docs.syscoin.org/)

## Notas para revisor
- ⚠️ Esta tarea bloquea [B-019](./B-019-deploy-zktanenbaum.md). Si tarda demasiado, considerar avanzar el resto del sprint con solo `hardhat` local.
- Mantener al equipo informado en el daily si hay demora — Eduardo y Mario pueden escalar.
- Documentar la `tx_hash` del faucet en el sprint1.md para auditoría.
