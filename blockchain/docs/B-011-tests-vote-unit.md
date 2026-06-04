---
id: B-011
title: "Tests unitarios Vote.sol"
owner: "Gabriel"
backup: "Orlando"
effort: "2 h"
priority: P0
status: pending
depends_on: [B-009, B-010]
sprint: 1
layer: blockchain
---

# B-011 · Tests unitarios `Vote`

## Por qué importa
`Vote.sol` tiene la lógica más compleja del sprint: 4 funciones de escritura, 4 eventos, ~7 revert paths. Sin tests buenos vamos a estar adivinando si un PR rompe algo. Esta tarea cubre TODA la matriz de revert paths y los happy paths principales.

## Conceptos clave
- **Time travel en tests**: `ethers.provider.send("evm_increaseTime", [seconds])` para simular el paso del tiempo. Útil para probar `deadline` y cierres automáticos.
- **Manipulación de signers**: `contract.connect(otherSigner)` cambia el `msg.sender` para esa llamada — clave para testear permisos por rol.
- **Cómo testear eventos con argumentos no determinísticos**: `withArgs(value1, value2, anyValue)`.
- **`getProposal` retorna struct con campos en orden**: TypeChain mapea a un Result que es array-like Y object-like. Podés acceder por nombre (`p.title`) o por índice (`p[1]`).

## Pre-requisitos
- [ ] [B-009](./B-009-impl-vote-tally-close.md) cerrada.
- [ ] [B-010](./B-010-tests-citizenregistry.md) cerrada (sirve de patrón).

## Paso a paso

### 1. Crear `test/Vote.test.ts`
```ts
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Vote", () => {
  async function deployFixture() {
    const [admin, curator, citizen, attacker] = await ethers.getSigners();
    const Reg = await ethers.getContractFactory("CitizenRegistry");
    const reg = await Reg.deploy(admin.address);
    await reg.waitForDeployment();

    const Vote = await ethers.getContractFactory("Vote");
    const vote = await Vote.deploy(admin.address, await reg.getAddress());
    await vote.waitForDeployment();

    // Otorgar CURATOR_ROLE
    await vote.grantRole(await vote.CURATOR_ROLE(), curator.address);

    return { reg, vote, admin, curator, citizen, attacker };
  }

  function citizenId(dni: string, name: string, salt = "ssc-antipereza-2026-publico"): string {
    return ethers.keccak256(ethers.toUtf8Bytes(`${dni}|${name}|${salt}`));
  }

  async function registeredCitizen(reg: any, dni: string, name: string) {
    const id = citizenId(dni, name);
    await reg.register(id, name);
    return id;
  }

  describe("Constructor", () => {
    it("registry es immutable y accesible", async () => {
      const { vote, reg } = await loadFixture(deployFixture);
      expect(await vote.registry()).to.equal(await reg.getAddress());
    });

    it("reverte si registry es address(0)", async () => {
      const { admin } = await loadFixture(deployFixture);
      const Vote = await ethers.getContractFactory("Vote");
      await expect(Vote.deploy(admin.address, ethers.ZeroAddress))
        .to.be.revertedWithCustomError(Vote, "InvalidRegistry");
    });
  });

  describe("createProposal", () => {
    it("crea propuesta y emite ProposalCreated", async () => {
      const { vote, curator } = await loadFixture(deployFixture);
      const dl = (await time.latest()) + 3600;
      await expect(
        vote.connect(curator).createProposal("Pavimentar SJL", "Desc", ["Si", "No"], dl)
      ).to.emit(vote, "ProposalCreated").withArgs(1, curator.address, "Pavimentar SJL", dl);
      expect(await vote.totalProposals()).to.equal(1);
    });

    it("rechaza no-curador", async () => {
      const { vote, attacker } = await loadFixture(deployFixture);
      const dl = (await time.latest()) + 3600;
      await expect(
        vote.connect(attacker).createProposal("X", "Y", ["A","B"], dl)
      ).to.be.revertedWithCustomError(vote, "AccessControlUnauthorizedAccount");
    });

    it("rechaza título corto", async () => {
      const { vote, curator } = await loadFixture(deployFixture);
      const dl = (await time.latest()) + 3600;
      await expect(
        vote.connect(curator).createProposal("X", "Y", ["A","B"], dl)
      ).to.be.revertedWithCustomError(vote, "TitleTooShort");
    });

    it("rechaza < 2 opciones", async () => {
      const { vote, curator } = await loadFixture(deployFixture);
      const dl = (await time.latest()) + 3600;
      await expect(
        vote.connect(curator).createProposal("Titulo OK", "Y", ["Solo"], dl)
      ).to.be.revertedWithCustomError(vote, "InvalidOptionsCount");
    });

    it("rechaza > 32 opciones", async () => {
      const { vote, curator } = await loadFixture(deployFixture);
      const dl = (await time.latest()) + 3600;
      const tooMany = Array.from({ length: 33 }, (_, i) => `op${i}`);
      await expect(
        vote.connect(curator).createProposal("Titulo OK", "Y", tooMany, dl)
      ).to.be.revertedWithCustomError(vote, "InvalidOptionsCount");
    });

    it("rechaza deadline en el pasado", async () => {
      const { vote, curator } = await loadFixture(deployFixture);
      const past = (await time.latest()) - 10;
      await expect(
        vote.connect(curator).createProposal("Titulo OK", "Y", ["A","B"], past)
      ).to.be.revertedWithCustomError(vote, "InvalidDeadline");
    });
  });

  describe("castVote — happy path", () => {
    it("permite votar a ciudadano registrado", async () => {
      const { reg, vote, curator } = await loadFixture(deployFixture);
      const id = await registeredCitizen(reg, "12345678", "JUAN PEREZ");
      const dl = (await time.latest()) + 3600;
      await vote.connect(curator).createProposal("X", "Y", ["Si","No"], dl);

      await expect(vote.castVote(1, id, 0))
        .to.emit(vote, "VoteCast")
        .withArgs(1, id, 0);

      const tally = await vote.tally(1);
      expect(tally[0]).to.equal(1n);
      expect(tally[1]).to.equal(0n);
      expect(await vote.hasVoted(1, id)).to.be.true;
    });
  });

  describe("castVote — revert paths", () => {
    it("revierte si propuesta no existe", async () => {
      const { vote } = await loadFixture(deployFixture);
      const id = ethers.keccak256(ethers.toUtf8Bytes("fake"));
      await expect(vote.castVote(999, id, 0))
        .to.be.revertedWithCustomError(vote, "ProposalNotActive");
    });

    it("revierte si pasó deadline", async () => {
      const { reg, vote, curator } = await loadFixture(deployFixture);
      const id = await registeredCitizen(reg, "12345678", "JUAN PEREZ");
      const dl = (await time.latest()) + 100;
      await vote.connect(curator).createProposal("X", "Y", ["A","B"], dl);
      await time.increase(200);
      await expect(vote.castVote(1, id, 0))
        .to.be.revertedWithCustomError(vote, "ProposalExpired");
    });

    it("revierte si option fuera de rango", async () => {
      const { reg, vote, curator } = await loadFixture(deployFixture);
      const id = await registeredCitizen(reg, "12345678", "JUAN PEREZ");
      const dl = (await time.latest()) + 3600;
      await vote.connect(curator).createProposal("X", "Y", ["A","B"], dl);
      await expect(vote.castVote(1, id, 5))
        .to.be.revertedWithCustomError(vote, "InvalidOption");
    });

    it("revierte si ciudadano no registrado", async () => {
      const { vote, curator } = await loadFixture(deployFixture);
      const dl = (await time.latest()) + 3600;
      await vote.connect(curator).createProposal("X", "Y", ["A","B"], dl);
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("nadie"));
      await expect(vote.castVote(1, fakeId, 0))
        .to.be.revertedWithCustomError(vote, "CitizenNotInRegistry");
    });

    it("revierte si vota dos veces", async () => {
      const { reg, vote, curator } = await loadFixture(deployFixture);
      const id = await registeredCitizen(reg, "12345678", "JUAN PEREZ");
      const dl = (await time.latest()) + 3600;
      await vote.connect(curator).createProposal("X", "Y", ["A","B"], dl);
      await vote.castVote(1, id, 0);
      await expect(vote.castVote(1, id, 1))
        .to.be.revertedWithCustomError(vote, "AlreadyVoted");
    });

    it("revierte si propuesta cancelada", async () => {
      const { reg, vote, curator } = await loadFixture(deployFixture);
      const id = await registeredCitizen(reg, "12345678", "JUAN PEREZ");
      const dl = (await time.latest()) + 3600;
      await vote.connect(curator).createProposal("X", "Y", ["A","B"], dl);
      await vote.cancelProposal(1);
      await expect(vote.castVote(1, id, 0))
        .to.be.revertedWithCustomError(vote, "ProposalNotActive");
    });
  });

  describe("closeProposal", () => {
    it("admin puede cerrar y emite ProposalClosed con tally", async () => {
      const { reg, vote, curator } = await loadFixture(deployFixture);
      const id1 = await registeredCitizen(reg, "12345678", "JUAN PEREZ");
      const id2 = await registeredCitizen(reg, "87654321", "MARIA LOPEZ");
      const dl = (await time.latest()) + 3600;
      await vote.connect(curator).createProposal("X", "Y", ["Si","No"], dl);
      await vote.castVote(1, id1, 0);
      await vote.castVote(1, id2, 1);

      await expect(vote.closeProposal(1))
        .to.emit(vote, "ProposalClosed");
      const p = await vote.getProposal(1);
      expect(p.status).to.equal(1); // Closed
    });

    it("rechaza segundo cierre", async () => {
      const { reg, vote, curator } = await loadFixture(deployFixture);
      const dl = (await time.latest()) + 3600;
      await vote.connect(curator).createProposal("X", "Y", ["A","B"], dl);
      await vote.closeProposal(1);
      await expect(vote.closeProposal(1))
        .to.be.revertedWithCustomError(vote, "ProposalAlreadyFinal");
    });

    it("cualquiera puede cerrar después del deadline", async () => {
      const { vote, curator, attacker } = await loadFixture(deployFixture);
      const dl = (await time.latest()) + 100;
      await vote.connect(curator).createProposal("X", "Y", ["A","B"], dl);
      await time.increase(200);
      await expect(vote.connect(attacker).closeProposal(1))
        .to.emit(vote, "ProposalClosed");
    });

    it("rechaza cierre antes de deadline por usuario no autorizado", async () => {
      const { vote, curator, attacker } = await loadFixture(deployFixture);
      const dl = (await time.latest()) + 3600;
      await vote.connect(curator).createProposal("X", "Y", ["A","B"], dl);
      await expect(vote.connect(attacker).closeProposal(1))
        .to.be.revertedWithCustomError(vote, "UnauthorizedClose");
    });
  });

  describe("cancelProposal", () => {
    it("admin puede cancelar", async () => {
      const { vote, curator } = await loadFixture(deployFixture);
      const dl = (await time.latest()) + 3600;
      await vote.connect(curator).createProposal("X", "Y", ["A","B"], dl);
      await expect(vote.cancelProposal(1))
        .to.emit(vote, "ProposalCancelled");
      const p = await vote.getProposal(1);
      expect(p.status).to.equal(2); // Cancelled
    });

    it("no-admin rechaza cancelar", async () => {
      const { vote, curator, attacker } = await loadFixture(deployFixture);
      const dl = (await time.latest()) + 3600;
      await vote.connect(curator).createProposal("X", "Y", ["A","B"], dl);
      await expect(vote.connect(attacker).cancelProposal(1))
        .to.be.revertedWithCustomError(vote, "AccessControlUnauthorizedAccount");
    });
  });
});
```

### 2. Ejecutar
```bash
cd blockchain
npx hardhat test test/Vote.test.ts
```

Esperado: ~20 tests pasando en < 5 segundos.

### 3. Coverage parcial
```bash
npx hardhat coverage --testfiles 'test/Vote.test.ts'
```

Esperado: `Vote.sol` ≥ 90%.

### 4. Commit
```bash
git add blockchain/test/Vote.test.ts
git commit -m "test(blockchain): unit tests Vote (B-011)"
```

## Verificación / Definition of Done

- ✅ Todos los tests pasan.
- ✅ Cobertura específica `Vote.sol` ≥ 90%.
- ✅ Cada custom error tiene al menos 1 test que lo dispara.

## Errores comunes

- **`time.increase is not a function`**
  Falta el import correcto: `import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";`.

- **`Test pasa pero `withArgs` con argumento dinámico falla`**
  Usá `anyValue` de `@nomicfoundation/hardhat-toolbox/network-helpers` para timestamps que no podés predecir.

- **`Cannot read property '0' of undefined` al chequear tally**
  El array de tally se retorna como `Result` de ethers. Indexalo con `[0]`, `[1]`… o destructurá: `const [yes, no] = await vote.tally(1)`.

- **Tests lentos**
  Si los tests tardan > 30 s, probablemente alguien no usó `loadFixture` y redespliega contratos en cada `it`. Refactorizar.

## Lecturas
- [Hardhat Network Helpers](https://hardhat.org/hardhat-network-helpers/docs/reference)
- [Chai matchers](https://hardhat.org/hardhat-chai-matchers/docs/reference)

## Notas para revisor
- Confirmar que **cada custom error** tiene un test que lo dispara.
- Verificar que no haya tests dependientes entre sí (mismo problema que pasó en el repo X de Sandro la semana pasada).
- El test "cualquiera puede cerrar después del deadline" prueba la rama del `expired` en `closeProposal` — clave porque ese branch lo va a explotar el cron de Hermes en Sprint 2.
