---
id: B-016
title: "scripts/seed-proposals.ts — crear propuestas de prueba"
owner: "Orlando"
backup: "junior"
effort: "45 min"
priority: P1
status: pending
depends_on: [B-014]
sprint: 1
layer: blockchain
---

# B-016 · `scripts/seed-proposals.ts`

## Por qué importa
Para grabar el demo del Día 7 necesitamos propuestas **realistas pre-cargadas** en zkTanenbaum, no creadas de cero en vivo. Si dependiéramos de crear propuestas en el momento, una falla del RPC arruina el video. Este script crea 3 propuestas representativas con descripciones legibles, que Sandro puede usar para probar el endpoint `GET /proposals` desde el inicio.

## Conceptos clave
- **Seeding**: cargar datos iniciales a un sistema. Práctica estándar en DBs, también aplica a blockchain.
- **Determinismo**: las propuestas deben ser estables (mismo título, misma descripción) para que el demo siempre se vea igual.
- **Deadline relativo**: usar `block.timestamp + N días` permite re-correr el seed sin que las propuestas queden expiradas.

## Pre-requisitos
- [ ] [B-014](./B-014-script-deploy.md) completado.
- [ ] `deployments/<network>.json` existe con direcciones.

## Paso a paso

### 1. Crear `scripts/seed-proposals.ts`
```ts
import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface SeedProposal {
  title: string;
  description: string;
  options: string[];
  durationSeconds: number;
}

const SEED: SeedProposal[] = [
  {
    title: "Aprobar pavimentación en San Juan de Lurigancho",
    description:
      "El gobierno regional propone invertir 5M soles en obras viales en el distrito de SJL durante 2026-2027, con prioridad en las avenidas Pirámide del Sol y Próceres.",
    options: ["A favor", "En contra", "Abstención"],
    durationSeconds: 7 * 86_400, // 7 días
  },
  {
    title: "Transparencia de contratos públicos > 100 UIT",
    description:
      "Toda contratación pública por encima de 100 UIT debería publicarse con detalle (proveedor, monto, justificación) en un portal central durante 30 días para observaciones ciudadanas.",
    options: ["Obligatorio", "Opcional", "Status quo"],
    durationSeconds: 5 * 86_400,
  },
  {
    title: "Tarifa diferenciada de agua para grandes consumidores",
    description:
      "Aplicar tarifa progresiva al consumo doméstico mayor a 30 m³/mes, dirigiendo el excedente a infraestructura de zonas sin acceso continuo.",
    options: ["Progresiva", "Plana", "Subsidio cruzado", "Abstención"],
    durationSeconds: 10 * 86_400,
  },
];

async function main() {
  const deploymentsPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error(`No existe ${deploymentsPath}. Correr scripts/deploy.ts primero.`);
  }
  const dep = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));

  const [signer] = await ethers.getSigners();
  console.log(`Sembrando propuestas en ${network.name} (chainId ${network.config.chainId})`);
  console.log(`Signer: ${signer.address}`);
  console.log(`Vote @ ${dep.Vote.address}`);

  const vote = await ethers.getContractAt("Vote", dep.Vote.address, signer);

  // Verificar que el signer tenga CURATOR_ROLE
  const role = await vote.CURATOR_ROLE();
  const can = await vote.hasRole(role, signer.address);
  if (!can) {
    throw new Error(`Signer ${signer.address} no tiene CURATOR_ROLE. grantRole primero.`);
  }

  const now = Math.floor(Date.now() / 1000);
  const created: { id: bigint; title: string; txHash: string }[] = [];

  for (const [idx, p] of SEED.entries()) {
    const deadline = now + p.durationSeconds;
    console.log(`\n→ [${idx + 1}/${SEED.length}] ${p.title}`);
    const tx = await vote.createProposal(p.title, p.description, p.options, deadline);
    const rcpt = await tx.wait(2);
    const log = rcpt!.logs.find((l: any) => l.fragment?.name === "ProposalCreated") as any;
    const id: bigint = log.args[0];
    created.push({ id, title: p.title, txHash: tx.hash });
    console.log(`  ✓ proposalId ${id} | tx ${tx.hash}`);
  }

  // Persistir como artefacto
  const outFile = path.join(
    __dirname,
    "..",
    "deployments",
    `seed-${network.name}.json`
  );
  fs.writeFileSync(
    outFile,
    JSON.stringify({ network: network.name, seededAt: new Date().toISOString(), proposals: created.map(c => ({ id: c.id.toString(), title: c.title, txHash: c.txHash })) }, null, 2) + "\n"
  );
  console.log(`\n✓ Seed escrito en ${outFile}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
```

### 2. Probar en `hardhat` local
```bash
cd blockchain
npx hardhat run scripts/deploy.ts                  # genera deployments/hardhat.json
npx hardhat run scripts/seed-proposals.ts          # genera seed-hardhat.json
cat deployments/seed-hardhat.json
```

Esperado:
```json
{
  "network": "hardhat",
  "seededAt": "2026-05-19T...",
  "proposals": [
    {"id": "1", "title": "Aprobar pavimentación en San Juan de Lurigancho", ...},
    {"id": "2", ...},
    {"id": "3", ...}
  ]
}
```

### 3. Agregar script al `package.json`
```json
"scripts": {
  ...
  "seed:zktanenbaum": "hardhat run scripts/seed-proposals.ts --network zkTanenbaum"
}
```

### 4. Commit
```bash
git add blockchain/scripts/seed-proposals.ts blockchain/package.json
git commit -m "feat(blockchain): scripts/seed-proposals.ts con 3 propuestas (B-016)"
```

## Verificación / Definition of Done

```bash
cd blockchain
npx hardhat run scripts/seed-proposals.ts
test -f deployments/seed-hardhat.json && echo OK
```

- ✅ 3 propuestas creadas con eventos `ProposalCreated` emitidos.
- ✅ Archivo `deployments/seed-<network>.json` con los IDs.
- ✅ El signer tiene `CURATOR_ROLE` (script reverte si no, evitando deployments rotos).

## Errores comunes

- **`Signer no tiene CURATOR_ROLE`**
  En el deploy ([B-014](./B-014-script-deploy.md)) le otorgamos el rol al `apiSigner`. Si seedeás desde otra cuenta, no tiene rol. Solución: grantear el rol antes con el admin.

- **`Cannot read property 'fragment' of undefined`**
  El log buscado no existe. Verificá que el tx pasó (no reverteado) y que el contrato realmente emite `ProposalCreated`.

- **3 propuestas con mismo id**
  Imposible si el script usa `_nextProposalId` interno. Si pasa, hay un bug muy grave en `Vote.createProposal`.

## Lecturas
- [Hardhat scripts vs tasks](https://hardhat.org/hardhat-runner/docs/advanced/scripts)
- [`docs/sprints/sprint1.md` § Demo script](../../docs/sprints/sprint1.md)

## Notas para revisor
- ¿Las descripciones son aceptables públicamente? Releé los textos antes del demo — no afilien posición política.
- Considerar agregar un flag `--cancel-old` para re-seedear sin acumular propuestas viejas en demos sucesivos.
