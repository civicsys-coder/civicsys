---
id: B-012
title: "Test E2E: registro → propuesta → voto → cierre"
owner: "Gabriel"
backup: "Sandro"
effort: "2 h"
priority: P0
status: pending
depends_on: [B-011]
sprint: 1
layer: blockchain
---

# B-012 · Test end-to-end en Hardhat local

## Por qué importa
Los unit tests garantizan que **cada pieza** funciona aislada. El E2E garantiza que **las piezas conectadas** producen el flujo del demo: el ciudadano se registra → se crea propuesta → vota → se cierra → tally es correcto y emisión de `ProposalClosed` es la que Hermes va a consumir. Sin este test no podemos demo-grabar con confianza.

Este test corre **siempre** en `hardhat` local (no en zkTanenbaum), porque queremos hermético, determinista y rápido. La validación real en zkTanenbaum la hace [B-020 (smoke test)](./B-020-smoke-test-onchain.md).

## Conceptos clave
- **Test E2E**: prueba el **flujo completo** desde la perspectiva del usuario, no de cada contrato aislado.
- **Determinismo**: usar timestamps relativos (`time.latest()`) y semillas fijas para que el test sea reproducible.
- **Coverage cruzada**: este test toca *ambos* contratos en una misma run, exponiendo bugs de integración (ej. `Vote.castVote` llama a `registry.isRegistered`, si el ABI no coincide explota).
- **Snapshot del estado**: al final, validamos `getProposal` + `tally` para tener una "evidencia escrita" del estado final.

## Pre-requisitos
- [ ] [B-011](./B-011-tests-vote-unit.md) cerrada.

## Paso a paso

### 1. Crear `test/e2e.test.ts`
```ts
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("E2E — flujo completo Sprint 1", () => {
  async function deployFixture() {
    const [admin, c1, c2, c3] = await ethers.getSigners();

    const Reg = await ethers.getContractFactory("CitizenRegistry");
    const reg = await Reg.deploy(admin.address);
    await reg.waitForDeployment();

    const Vote = await ethers.getContractFactory("Vote");
    const vote = await Vote.deploy(admin.address, await reg.getAddress());
    await vote.waitForDeployment();

    return { reg, vote, admin, c1, c2, c3 };
  }

  function citizenId(dni: string, name: string, salt = "ssc-antipereza-2026-publico"): string {
    return ethers.keccak256(ethers.toUtf8Bytes(`${dni}|${name}|${salt}`));
  }

  it("flujo completo: 3 ciudadanos votan, cierre, tally correcto", async () => {
    const { reg, vote } = await loadFixture(deployFixture);

    // ---- 1. Registrar 3 ciudadanos ----
    const ciudadanos = [
      { dni: "12345678", nombre: "JUAN PEREZ", voto: 0 },
      { dni: "87654321", nombre: "MARIA LOPEZ", voto: 1 },
      { dni: "11223344", nombre: "ANA TORRES", voto: 0 },
    ];

    const ids: string[] = [];
    for (const c of ciudadanos) {
      const id = citizenId(c.dni, c.nombre);
      const tx = await reg.register(id, c.nombre);
      const rcpt = await tx.wait();
      expect(rcpt!.logs.some(l => (l as any).fragment?.name === "CitizenRegistered")).to.be.true;
      ids.push(id);
    }
    expect(await reg.totalCitizens()).to.equal(3);

    // ---- 2. Crear propuesta ----
    const deadline = (await time.latest()) + 86400;
    const txProp = await vote.createProposal(
      "Aprobar pavimentación en San Juan de Lurigancho",
      "El gobierno regional propone invertir 5M soles en obras viales en el distrito de SJL durante 2026-2027.",
      ["A favor", "En contra", "Abstención"],
      deadline
    );
    const propRcpt = await txProp.wait();
    expect(propRcpt!.logs.some(l => (l as any).fragment?.name === "ProposalCreated")).to.be.true;

    const proposal = await vote.getProposal(1);
    expect(proposal.id).to.equal(1);
    expect(proposal.options.length).to.equal(3);
    expect(proposal.status).to.equal(0); // Active

    // ---- 3. Votar ----
    for (let i = 0; i < ciudadanos.length; i++) {
      await expect(vote.castVote(1, ids[i], ciudadanos[i].voto))
        .to.emit(vote, "VoteCast")
        .withArgs(1, ids[i], ciudadanos[i].voto);
    }

    // ---- 4. Pre-close tally ----
    const tallyMid = await vote.tally(1);
    expect(tallyMid[0]).to.equal(2n); // 2 a favor
    expect(tallyMid[1]).to.equal(1n); // 1 en contra
    expect(tallyMid[2]).to.equal(0n); // 0 abstención

    // ---- 5. Cerrar propuesta ----
    const closeTx = await vote.closeProposal(1);
    const closeRcpt = await closeTx.wait();
    const closeLog = closeRcpt!.logs.find(l => (l as any).fragment?.name === "ProposalClosed") as any;
    expect(closeLog).to.exist;

    // Verificar que el array de tally en el evento es el correcto
    const tallyEvent = closeLog.args[1] as bigint[];
    expect(tallyEvent[0]).to.equal(2n);
    expect(tallyEvent[1]).to.equal(1n);
    expect(tallyEvent[2]).to.equal(0n);

    // ---- 6. Validaciones post-cierre ----
    const finalProposal = await vote.getProposal(1);
    expect(finalProposal.status).to.equal(1); // Closed

    // Intentar volver a votar después del cierre: rechazo
    const newId = citizenId("99887766", "TARDIO ROJAS");
    await reg.register(newId, "TARDIO ROJAS");
    await expect(vote.castVote(1, newId, 0))
      .to.be.revertedWithCustomError(vote, "ProposalNotActive");
  });

  it("flujo doble propuesta — independencia de tallies", async () => {
    const { reg, vote } = await loadFixture(deployFixture);
    const id1 = citizenId("12345678", "JUAN PEREZ");
    await reg.register(id1, "JUAN PEREZ");

    const dl = (await time.latest()) + 3600;
    await vote.createProposal("Prop 1", "Desc1", ["A","B"], dl);
    await vote.createProposal("Prop 2", "Desc2", ["X","Y","Z"], dl);

    await vote.castVote(1, id1, 0);
    await vote.castVote(2, id1, 2);

    const t1 = await vote.tally(1);
    const t2 = await vote.tally(2);
    expect(t1[0]).to.equal(1n);
    expect(t1[1]).to.equal(0n);
    expect(t2[0]).to.equal(0n);
    expect(t2[1]).to.equal(0n);
    expect(t2[2]).to.equal(1n);
  });

  it("flujo con expiración por tiempo", async () => {
    const { reg, vote, c1 } = await loadFixture(deployFixture);
    const id = citizenId("12345678", "JUAN PEREZ");
    await reg.register(id, "JUAN PEREZ");

    const dl = (await time.latest()) + 60;
    await vote.createProposal("Express", "Desc", ["A","B"], dl);
    await vote.castVote(1, id, 0); // ok dentro de tiempo

    await time.increase(120);

    // Cualquiera (incluso c1 que no es curador) puede cerrar:
    await expect(vote.connect(c1).closeProposal(1))
      .to.emit(vote, "ProposalClosed");
  });
});
```

### 2. Ejecutar
```bash
cd blockchain
npx hardhat test test/e2e.test.ts
```

Esperado:
```
  E2E — flujo completo Sprint 1
    ✓ flujo completo: 3 ciudadanos votan, cierre, tally correcto (XXXms)
    ✓ flujo doble propuesta — independencia de tallies
    ✓ flujo con expiración por tiempo

  3 passing (≈600ms)
```

### 3. Run de todos los tests
```bash
npx hardhat test
```

Debe pasar **todos** los tests, no solo este archivo.

### 4. Commit
```bash
git add blockchain/test/e2e.test.ts
git commit -m "test(blockchain): E2E flujo completo (B-012)"
```

## Verificación / Definition of Done

- ✅ Los 3 tests E2E pasan.
- ✅ Toda la suite (`npx hardhat test`) pasa.
- ✅ Verificación manual: el log del evento `ProposalClosed` contiene un `uint256[]` con el tally esperado (es lo que Hermes va a parsear).

## Errores comunes

- **`Type 'Result' is not assignable to type 'bigint[]'`**
  El TypeScript de ethers v6 retorna `Result` (extiende `Array`). Hacé un cast explícito: `closeLog.args[1] as bigint[]`.

- **`l.fragment is undefined`**
  Para logs que no son de tus contratos (ej. logs de OpenZeppelin), el fragment puede ser undefined. Filtralos primero: `.filter(l => 'fragment' in l)`.

- **Test "expiración por tiempo" no avanza**
  En hardhat local, `time.increase` solo modifica el siguiente bloque. Si no minás un bloque, el `block.timestamp` no cambia. Después de `time.increase()`, hacé una transacción cualquiera para forzar mineo.

## Lecturas
- [Hardhat — Time helpers](https://hardhat.org/hardhat-network-helpers/docs/reference#time)
- [`docs/architecture/sprint1-overview.md`](../../docs/architecture/sprint1-overview.md) — flujo end-to-end completo
- [`docs/sprints/sprint1.md` § DoD](../../docs/sprints/sprint1.md)

## Notas para revisor
- ¿El test "rechaza voto post-cierre" está? Es crítico — sin ese check, alguien puede colar votos después de que Hermes generó el reporte.
- Validar que el array `tallyEvent` se compara con `bigint`s (sufijo `n`), no con `number` — ethers v6 retorna bigint y `1 !== 1n`.
- Considerar agregar un test de "gas usado por propuesta de 32 opciones" para no sorprendernos en mainnet futuro.
