import { expect } from "chai";
import hre from "hardhat";

// Commitments de prueba (calculados off-chain en producción). NO son PII.
const DNI = ("0x" + "a1".repeat(32)) as `0x${string}`;
const FACE = ("0x" + "b2".repeat(32)) as `0x${string}`;
const ZERO = ("0x" + "00".repeat(32)) as `0x${string}`;
const URI = "data:application/json,{}";

describe("IdentitySBT", () => {
  async function deploy() {
    const sbt = await hre.viem.deployContract("IdentitySBT");
    const [w1, w2] = await hre.viem.getWalletClients();
    return { sbt, w1, w2 };
  }

  it("mintea una Cédula y la deja registrada + locked", async () => {
    const { sbt, w1 } = await deploy();

    await sbt.write.mint([DNI, FACE, URI]);

    expect(await sbt.read.balanceOf([w1.account.address])).to.equal(1n);
    expect(await sbt.read.isRegistered([w1.account.address])).to.equal(true);
    expect(await sbt.read.hashOf([w1.account.address])).to.equal(DNI);
    expect(await sbt.read.locked([1n])).to.equal(true);
    expect(await sbt.read.tokenURI([1n])).to.equal(URI);
  });

  it("revierte si el dniHash ya fue usado por otra address", async () => {
    const { sbt, w2 } = await deploy();
    await sbt.write.mint([DNI, FACE, URI]);
    const otherFace = ("0x" + "cc".repeat(32)) as `0x${string}`;
    const asW2 = await hre.viem.getContractAt("IdentitySBT", sbt.address, {
      client: { wallet: w2 },
    });
    await expect(asW2.write.mint([DNI, otherFace, URI])).to.be.rejectedWith(
      "Identity: dni ya usado"
    );
  });

  it("revierte si el faceCommitment ya fue usado por otra address", async () => {
    const { sbt, w2 } = await deploy();
    await sbt.write.mint([DNI, FACE, URI]);
    const otherDni = ("0x" + "dd".repeat(32)) as `0x${string}`;
    const asW2 = await hre.viem.getContractAt("IdentitySBT", sbt.address, {
      client: { wallet: w2 },
    });
    await expect(asW2.write.mint([otherDni, FACE, URI])).to.be.rejectedWith(
      "Identity: rostro ya usado"
    );
  });

  it("revierte si la misma address intenta una segunda Cédula", async () => {
    const { sbt } = await deploy();
    await sbt.write.mint([DNI, FACE, URI]);
    const d2 = ("0x" + "ee".repeat(32)) as `0x${string}`;
    const f2 = ("0x" + "ff".repeat(32)) as `0x${string}`;
    await expect(sbt.write.mint([d2, f2, URI])).to.be.rejectedWith(
      "Identity: ya tenes cedula"
    );
  });

  it("revierte mint con dni o face en cero", async () => {
    const { sbt } = await deploy();
    await expect(sbt.write.mint([ZERO, FACE, URI])).to.be.rejectedWith(
      "Identity: dni cero"
    );
    await expect(sbt.write.mint([DNI, ZERO, URI])).to.be.rejectedWith(
      "Identity: face cero"
    );
  });

  it("revierte cualquier transferencia (soulbound)", async () => {
    const { sbt, w1, w2 } = await deploy();
    await sbt.write.mint([DNI, FACE, URI]);
    await expect(
      sbt.write.transferFrom([w1.account.address, w2.account.address, 1n])
    ).to.be.rejectedWith("Identity: soulbound");
  });

  it("permite que el holder queme su Cédula (derecho al olvido)", async () => {
    const { sbt, w1 } = await deploy();
    await sbt.write.mint([DNI, FACE, URI]);
    await sbt.write.burn([1n]);
    expect(await sbt.read.isRegistered([w1.account.address])).to.equal(false);
    // el dniHash sigue marcado como usado (no se permite re-registro)
    expect(await sbt.read.usedDni([DNI])).to.equal(true);
  });

  it("Vote.sol acepta a un holder de Cédula vía ICitizenRegistry", async () => {
    const { sbt } = await deploy();
    // Usar el timestamp de la cadena, no el wall-clock: en la suite completa
    // otros tests adelantan block.timestamp y Date.now() quedaría en el pasado.
    const client = await hre.viem.getPublicClient();
    const now = (await client.getBlock()).timestamp;
    const vote = await hre.viem.deployContract("Vote", [
      sbt.address,
      "Reforma art. 56",
      "Qm-cid",
      now - 10n,
      now + 3600n,
    ]);
    await sbt.write.mint([DNI, FACE, URI]);
    await vote.write.castVote([1n, 0]); // Choice.Yes
    const [yes] = await vote.read.tally([1n]);
    expect(yes).to.equal(1n);
  });

  it("register(bytes32) está deshabilitado: el alta es vía mint()", async () => {
    const { sbt } = await deploy();
    await expect(sbt.write.register([DNI])).to.be.rejectedWith(
      "Identity: usa mint()"
    );
  });

  // ── Hardening post-auditoría MNEMA (ERC-5192 estricto) ──

  it("revierte approve y setApprovalForAll (soulbound, sin approvals colgantes)", async () => {
    const { sbt, w2 } = await deploy();
    await sbt.write.mint([DNI, FACE, URI]);
    await expect(
      sbt.write.approve([w2.account.address, 1n])
    ).to.be.rejectedWith("Identity: soulbound");
    await expect(
      sbt.write.setApprovalForAll([w2.account.address, true])
    ).to.be.rejectedWith("Identity: soulbound");
  });

  it("emite CedulaBurned al quemar", async () => {
    const { sbt, w1 } = await deploy();
    await sbt.write.mint([DNI, FACE, URI]);
    const hash = await sbt.write.burn([1n]);
    const client = await hre.viem.getPublicClient();
    await client.waitForTransactionReceipt({ hash });
    const events = await sbt.getEvents.CedulaBurned();
    expect(events.length).to.equal(1);
    expect(events[0]!.args.holder?.toLowerCase()).to.equal(
      w1.account.address.toLowerCase()
    );
  });
});
