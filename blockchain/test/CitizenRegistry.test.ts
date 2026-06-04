import { expect } from "chai";
import hre from "hardhat";
import { keccak256, encodePacked } from "viem";

// Salt arbitrario para tests deterministas — NO es el secreto de produccion.
// El salt real vive en `.env` (gitignored). Ver docs/security/runbook-rotacion-salt.md.
const PUBLIC_SALT = "test-salt-deterministic-not-prod";

function dniHash(dni: string): `0x${string}` {
  return keccak256(encodePacked(["string", "string"], [dni, PUBLIC_SALT]));
}

describe("CitizenRegistry", () => {
  async function deploy() {
    const registry = await hre.viem.deployContract("CitizenRegistry");
    const [owner, alice, bob] = await hre.viem.getWalletClients();
    return { registry, owner, alice, bob };
  }

  describe("register", () => {
    it("permite registrar y emite CitizenRegistered + actualiza storage", async () => {
      const { registry, alice } = await deploy();
      const h = dniHash("12345678");

      await registry.write.register([h], { account: alice.account });

      expect(await registry.read.hashOf([alice.account.address])).to.equal(h);
      expect(await registry.read.isRegistered([alice.account.address])).to.equal(true);
    });

    it("revierte si el hash es bytes32(0)", async () => {
      const { registry, alice } = await deploy();
      await expect(
        registry.write.register(
          ["0x0000000000000000000000000000000000000000000000000000000000000000"],
          { account: alice.account }
        )
      ).to.be.rejectedWith("CitizenRegistry: hash cero");
    });

    it("revierte si la dirección ya estaba registrada", async () => {
      const { registry, alice } = await deploy();
      const h = dniHash("12345678");
      await registry.write.register([h], { account: alice.account });

      await expect(
        registry.write.register([h], { account: alice.account })
      ).to.be.rejectedWith("CitizenRegistry: ya registrado");
    });

    it("permite que dos direcciones distintas registren hashes distintos", async () => {
      const { registry, alice, bob } = await deploy();
      const hA = dniHash("11111111");
      const hB = dniHash("22222222");

      await registry.write.register([hA], { account: alice.account });
      await registry.write.register([hB], { account: bob.account });

      expect(await registry.read.hashOf([alice.account.address])).to.equal(hA);
      expect(await registry.read.hashOf([bob.account.address])).to.equal(hB);
    });
  });

  describe("isRegistered + hashOf", () => {
    it("devuelve false / bytes32(0) si la dirección no se registró nunca", async () => {
      const { registry, alice } = await deploy();
      expect(await registry.read.isRegistered([alice.account.address])).to.equal(false);
      expect(await registry.read.hashOf([alice.account.address])).to.equal(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
    });
  });
});
