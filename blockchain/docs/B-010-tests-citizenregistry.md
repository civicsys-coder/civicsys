---
id: B-010
title: "Tests unitarios CitizenRegistry"
owner: "Gabriel"
backup: "Orlando"
effort: "1.5 h"
priority: P0
status: pending
depends_on: [B-005]
sprint: 1
layer: blockchain
---

# B-010 · Tests unitarios `CitizenRegistry`

## Por qué importa
El [Definition of Done del Sprint 1](../../docs/sprints/sprint1.md) exige **≥80% cobertura** en contratos. Más importante: confirmar que las **invariantes de privacidad** (DNI nunca en el estado del contrato) se cumplen. Tests bien hechos también sirven como documentación: el junior que abra el repo en Sprint 2 lee `CitizenRegistry.test.ts` y entiende cómo se usa la API.

## Conceptos clave
- **Hardhat + Mocha + Chai**: hardhat-toolbox trae Mocha como runner y Chai como assertion library. Sintaxis: `describe(...)`, `it(...)`, `expect(...)`.
- **`loadFixture`**: helper que cachea el setup de un test (deploy de contratos) entre `it`s, hace los tests órdenes de magnitud más rápidos.
- **`expect(...).to.be.revertedWithCustomError(contract, "Nombre")`**: assertion específica para custom errors (los normales `revertedWith("string")` no funcionan con custom errors).
- **`ethers.keccak256(ethers.toUtf8Bytes("..."))`**: en ethers v6, así se calcula `keccak256` de un string. Equivalente al `keccak256(abi.encodePacked(...))` en Solidity.

## Pre-requisitos
- [ ] [B-005](./B-005-impl-citizenregistry.md) cerrada.
- [ ] `hardhat-toolbox` instalado (parte de B-001).

## Paso a paso

### 1. Crear `test/CitizenRegistry.test.ts`
```ts
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("CitizenRegistry", () => {
  // ---- Fixture (deploy 1 vez por describe, cacheado) ----
  async function deployFixture() {
    const [admin, registrar, randomUser] = await ethers.getSigners();
    const Reg = await ethers.getContractFactory("CitizenRegistry");
    const reg = await Reg.deploy(admin.address);
    await reg.waitForDeployment();
    return { reg, admin, registrar, randomUser };
  }

  function citizenId(dni: string, name: string, salt = "ssc-antipereza-2026-publico"): string {
    return ethers.keccak256(ethers.toUtf8Bytes(`${dni}|${name}|${salt}`));
  }

  describe("Constructor", () => {
    it("asigna DEFAULT_ADMIN_ROLE y REGISTRAR_ROLE al admin", async () => {
      const { reg, admin } = await loadFixture(deployFixture);
      expect(await reg.hasRole(await reg.DEFAULT_ADMIN_ROLE(), admin.address)).to.be.true;
      expect(await reg.hasRole(await reg.REGISTRAR_ROLE(), admin.address)).to.be.true;
    });

    it("reverte si admin es address(0)", async () => {
      const Reg = await ethers.getContractFactory("CitizenRegistry");
      await expect(Reg.deploy(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(Reg, "InvalidId");
    });
  });

  describe("register", () => {
    it("registra un ciudadano nuevo y emite CitizenRegistered", async () => {
      const { reg } = await loadFixture(deployFixture);
      const id = citizenId("12345678", "JUAN PEREZ");
      await expect(reg.register(id, "JUAN PEREZ"))
        .to.emit(reg, "CitizenRegistered")
        .withArgs(id, (await ethers.getSigners())[0].address, anyUint());
    });

    it("rechaza id == 0", async () => {
      const { reg } = await loadFixture(deployFixture);
      await expect(reg.register(ethers.ZeroHash, "JUAN PEREZ"))
        .to.be.revertedWithCustomError(reg, "InvalidId");
    });

    it("rechaza nombre corto (< 5 chars)", async () => {
      const { reg } = await loadFixture(deployFixture);
      const id = citizenId("12345678", "ABCD");
      await expect(reg.register(id, "ABCD"))
        .to.be.revertedWithCustomError(reg, "NameTooShort");
    });

    it("rechaza nombre largo (> 120 chars)", async () => {
      const { reg } = await loadFixture(deployFixture);
      const longName = "A".repeat(121);
      const id = citizenId("12345678", longName);
      await expect(reg.register(id, longName))
        .to.be.revertedWithCustomError(reg, "NameTooLong");
    });

    it("rechaza registro duplicado", async () => {
      const { reg } = await loadFixture(deployFixture);
      const id = citizenId("12345678", "JUAN PEREZ");
      await reg.register(id, "JUAN PEREZ");
      await expect(reg.register(id, "JUAN PEREZ"))
        .to.be.revertedWithCustomError(reg, "CitizenAlreadyRegistered");
    });

    it("rechaza llamadas de usuarios sin REGISTRAR_ROLE", async () => {
      const { reg, randomUser } = await loadFixture(deployFixture);
      const id = citizenId("12345678", "JUAN PEREZ");
      await expect(reg.connect(randomUser).register(id, "JUAN PEREZ"))
        .to.be.revertedWithCustomError(reg, "AccessControlUnauthorizedAccount");
    });
  });

  describe("isRegistered / getCitizen", () => {
    it("isRegistered devuelve true para registrados activos", async () => {
      const { reg } = await loadFixture(deployFixture);
      const id = citizenId("12345678", "JUAN PEREZ");
      await reg.register(id, "JUAN PEREZ");
      expect(await reg.isRegistered(id)).to.be.true;
    });

    it("isRegistered devuelve false para no registrados", async () => {
      const { reg } = await loadFixture(deployFixture);
      expect(await reg.isRegistered(ethers.ZeroHash)).to.be.false;
    });

    it("getCitizen retorna la struct para registrados", async () => {
      const { reg, admin } = await loadFixture(deployFixture);
      const id = citizenId("12345678", "JUAN PEREZ");
      await reg.register(id, "JUAN PEREZ");
      const c = await reg.getCitizen(id);
      expect(c.id).to.equal(id);
      expect(c.normalizedName).to.equal("JUAN PEREZ");
      expect(c.wallet).to.equal(admin.address);
      expect(c.active).to.be.true;
    });

    it("getCitizen reverte para no registrados", async () => {
      const { reg } = await loadFixture(deployFixture);
      await expect(reg.getCitizen(ethers.ZeroHash))
        .to.be.revertedWithCustomError(reg, "CitizenNotFound");
    });
  });

  describe("deactivate", () => {
    it("admin puede desactivar y emite evento", async () => {
      const { reg } = await loadFixture(deployFixture);
      const id = citizenId("12345678", "JUAN PEREZ");
      await reg.register(id, "JUAN PEREZ");
      await expect(reg.deactivate(id))
        .to.emit(reg, "CitizenDeactivated")
        .withArgs(id, anyUint());
      expect(await reg.isRegistered(id)).to.be.false; // ya no cuenta como activo
    });

    it("rechaza desactivar id no existente", async () => {
      const { reg } = await loadFixture(deployFixture);
      await expect(reg.deactivate(ethers.ZeroHash))
        .to.be.revertedWithCustomError(reg, "CitizenNotFound");
    });
  });

  describe("Invariantes de privacidad", () => {
    it("storage NO contiene el DNI en claro", async () => {
      const { reg } = await loadFixture(deployFixture);
      const id = citizenId("12345678", "JUAN PEREZ");
      await reg.register(id, "JUAN PEREZ");
      const dniHex = ethers.hexlify(ethers.toUtf8Bytes("12345678"));
      // Iterar primeros 16 slots de storage del contrato
      const addr = await reg.getAddress();
      for (let i = 0; i < 16; i++) {
        const slot = await ethers.provider.getStorage(addr, i);
        expect(slot.toLowerCase()).to.not.include(dniHex.replace(/^0x/, ""));
      }
    });
  });
});

// Helper para `anyUint` (matcher chai)
function anyUint() {
  // hardhat-toolbox expone `anyValue`. Para uint específicamente usamos ese.
  return (require("@nomicfoundation/hardhat-toolbox/network-helpers") as any).anyValue
    ?? (() => true);
}
```

### 2. Ejecutar
```bash
cd blockchain
npx hardhat test test/CitizenRegistry.test.ts
```

Esperado:
```
  CitizenRegistry
    Constructor
      ✓ asigna DEFAULT_ADMIN_ROLE y REGISTRAR_ROLE al admin
      ✓ reverte si admin es address(0)
    register
      ✓ registra un ciudadano nuevo y emite CitizenRegistered
      ✓ rechaza id == 0
      ✓ rechaza nombre corto (< 5 chars)
      ✓ rechaza nombre largo (> 120 chars)
      ✓ rechaza registro duplicado
      ✓ rechaza llamadas de usuarios sin REGISTRAR_ROLE
    isRegistered / getCitizen
      ...
    deactivate
      ...
    Invariantes de privacidad
      ✓ storage NO contiene el DNI en claro

  14 passing (~500ms)
```

### 3. Ver cobertura local
```bash
npx hardhat coverage --testfiles 'test/CitizenRegistry.test.ts'
```

Esperado: ~95-100% en `CitizenRegistry.sol`.

### 4. Commit
```bash
git add blockchain/test/CitizenRegistry.test.ts
git commit -m "test(blockchain): unit tests CitizenRegistry (B-010)"
```

## Verificación / Definition of Done

- ✅ 14 tests pasando.
- ✅ Coverage de `CitizenRegistry.sol` ≥ 90%.
- ✅ El test "storage NO contiene el DNI" pasa — **critical privacy invariant**.

## Errores comunes

- **`AccessControlUnauthorizedAccount` vs `AccessControl: …`**
  En OpenZeppelin v5 el error cambió de string a custom error. Tests viejos que usaban `revertedWith("AccessControl:")` se rompen. La forma correcta es `revertedWithCustomError(contract, "AccessControlUnauthorizedAccount")`.

- **`anyValue is not a function`**
  Asegurate de importar desde `@nomicfoundation/hardhat-toolbox/network-helpers`. La utilidad reemplaza al viejo helper de matchers.

- **Test de privacidad pasa por casualidad**
  El test es heurístico (chequea 16 slots). Si tu contrato escribe el DNI en un slot fuera de rango, no lo detecta. **Mitigación**: code review humano. Pero el test detecta el caso obvio.

## Lecturas
- [Hardhat — Testing](https://hardhat.org/hardhat-runner/docs/guides/test-contracts)
- [Chai matchers para Hardhat](https://hardhat.org/hardhat-chai-matchers/docs/overview)
- [`docs/security/threat-model-sprint1.md`](../../docs/security/threat-model-sprint1.md) — T2 (DNI en claro)

## Notas para revisor
- ¿Cada test es **independiente**? Usar `loadFixture` garantiza estado limpio entre tests.
- Hay un test específico para cada custom error declarado en el contrato.
- Verificar que el test de privacidad incluye el DNI **en hex** y **en utf-8** (algunos almacenan ASCII).
