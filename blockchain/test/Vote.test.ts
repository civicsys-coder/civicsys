import { expect } from "chai";
import hre from "hardhat";
import { keccak256, encodePacked } from "viem";

// Salt arbitrario para tests deterministas — NO es el secreto de produccion.
const PUBLIC_SALT = "test-salt-deterministic-not-prod";
const PROPOSAL_TITLE = "Reforma del artículo X de la Constitución";
const IPFS_CID = "bafy-test";

function dniHash(dni: string): `0x${string}` {
  return keccak256(encodePacked(["string", "string"], [dni, PUBLIC_SALT]));
}

async function nowSec(): Promise<bigint> {
  const publicClient = await hre.viem.getPublicClient();
  const block = await publicClient.getBlock();
  return block.timestamp;
}

async function fastForward(toTimestamp: bigint) {
  const publicClient = await hre.viem.getPublicClient();
  await publicClient.transport.request({
    method: "evm_setNextBlockTimestamp",
    params: [Number(toTimestamp)] as never,
  });
  await publicClient.transport.request({ method: "evm_mine", params: [] as never });
}

async function deployFixture() {
  const registry = await hre.viem.deployContract("CitizenRegistry");
  const openAt = await nowSec();
  const closeAt = openAt + 7n * 24n * 3600n;

  const vote = await hre.viem.deployContract("Vote", [
    registry.address,
    PROPOSAL_TITLE,
    IPFS_CID,
    openAt,
    closeAt,
  ]);

  const [owner, alice, bob, carol] = await hre.viem.getWalletClients();

  await registry.write.register([dniHash("11111111")], { account: alice.account });
  await registry.write.register([dniHash("22222222")], { account: bob.account });

  return { registry, vote, owner, alice, bob, carol, openAt, closeAt };
}

describe("Vote", () => {
  describe("constructor — reverts", () => {
    it("revierte si registryAddr es 0x0", async () => {
      const openAt = await nowSec();
      await expect(
        hre.viem.deployContract("Vote", [
          "0x0000000000000000000000000000000000000000",
          PROPOSAL_TITLE,
          IPFS_CID,
          openAt,
          openAt + 86400n,
        ])
      ).to.be.rejectedWith("Vote: registry cero");
    });

    it("revierte si closeAt <= openAt", async () => {
      const registry = await hre.viem.deployContract("CitizenRegistry");
      const openAt = await nowSec();
      await expect(
        hre.viem.deployContract("Vote", [
          registry.address,
          PROPOSAL_TITLE,
          IPFS_CID,
          openAt,
          openAt,
        ])
      ).to.be.rejectedWith("Vote: closeAt <= openAt");
    });

    it("revierte si title es string vacío", async () => {
      const registry = await hre.viem.deployContract("CitizenRegistry");
      const openAt = await nowSec();
      await expect(
        hre.viem.deployContract("Vote", [
          registry.address,
          "",
          IPFS_CID,
          openAt,
          openAt + 86400n,
        ])
      ).to.be.rejectedWith("Vote: title vacio");
    });
  });

  describe("deploy + getProposal + tally inicial", () => {
    it("deja la propuesta accesible vía getProposal con id=1", async () => {
      const { vote, openAt, closeAt } = await deployFixture();
      const p = await vote.read.getProposal([1n]);
      expect(p.id).to.equal(1n);
      expect(p.title).to.equal(PROPOSAL_TITLE);
      expect(p.ipfsCid).to.equal(IPFS_CID);
      expect(p.openAt).to.equal(openAt);
      expect(p.closeAt).to.equal(closeAt);
      expect(p.closed).to.equal(false);
    });

    it("tally inicial es 0/0/0", async () => {
      const { vote } = await deployFixture();
      const [yes, no, abstain] = await vote.read.tally([1n]);
      expect(yes).to.equal(0n);
      expect(no).to.equal(0n);
      expect(abstain).to.equal(0n);
    });
  });

  describe("castVote — happy path", () => {
    it("acepta Yes de un registrado y actualiza tally", async () => {
      const { vote, alice } = await deployFixture();
      await vote.write.castVote([1n, 0], { account: alice.account });
      const [yes, no, abstain] = await vote.read.tally([1n]);
      expect(yes).to.equal(1n);
      expect(no).to.equal(0n);
      expect(abstain).to.equal(0n);
    });

    it("acepta dos registrados con choices distintos", async () => {
      const { vote, alice, bob } = await deployFixture();
      await vote.write.castVote([1n, 0], { account: alice.account });
      await vote.write.castVote([1n, 1], { account: bob.account });
      const [yes, no, abstain] = await vote.read.tally([1n]);
      expect(yes).to.equal(1n);
      expect(no).to.equal(1n);
      expect(abstain).to.equal(0n);
    });

    it("acepta Abstain (Choice=2)", async () => {
      const { vote, alice } = await deployFixture();
      await vote.write.castVote([1n, 2], { account: alice.account });
      const [yes, no, abstain] = await vote.read.tally([1n]);
      expect(yes + no).to.equal(0n);
      expect(abstain).to.equal(1n);
    });
  });

  describe("castVote — reverts", () => {
    it("revierte si la propuesta no existe", async () => {
      const { vote, alice } = await deployFixture();
      await expect(
        vote.write.castVote([999n, 0], { account: alice.account })
      ).to.be.rejectedWith("Vote: propuesta inexistente");
    });

    it("revierte si el votante no está registrado", async () => {
      const { vote, carol } = await deployFixture();
      await expect(
        vote.write.castVote([1n, 0], { account: carol.account })
      ).to.be.rejectedWith("Vote: no registrado");
    });

    it("revierte si el votante ya votó", async () => {
      const { vote, alice } = await deployFixture();
      await vote.write.castVote([1n, 0], { account: alice.account });
      await expect(
        vote.write.castVote([1n, 1], { account: alice.account })
      ).to.be.rejectedWith("Vote: ya votaste");
    });

    it("revierte si la propuesta aún no abrió", async () => {
      const registry = await hre.viem.deployContract("CitizenRegistry");
      const [, alice] = await hre.viem.getWalletClients();
      await registry.write.register([dniHash("11111111")], { account: alice.account });
      const futureOpen = (await nowSec()) + 3600n;
      const vote = await hre.viem.deployContract("Vote", [
        registry.address,
        PROPOSAL_TITLE,
        IPFS_CID,
        futureOpen,
        futureOpen + 86400n,
      ]);
      await expect(
        vote.write.castVote([1n, 0], { account: alice.account })
      ).to.be.rejectedWith("Vote: aun no abierta");
    });

    it("revierte si la propuesta ya pasó closeAt", async () => {
      const { vote, alice, closeAt } = await deployFixture();
      await fastForward(closeAt + 10n);
      await expect(
        vote.write.castVote([1n, 0], { account: alice.account })
      ).to.be.rejectedWith("Vote: ya termino");
    });
  });

  describe("close", () => {
    it("cierra tras closeAt y marca closed=true", async () => {
      const { vote, alice, closeAt } = await deployFixture();
      await vote.write.castVote([1n, 0], { account: alice.account });
      await fastForward(closeAt + 10n);
      await vote.write.close([1n]);
      const p = await vote.read.getProposal([1n]);
      expect(p.closed).to.equal(true);
    });

    it("revierte si la propuesta aún está activa", async () => {
      const { vote } = await deployFixture();
      await expect(vote.write.close([1n])).to.be.rejectedWith("Vote: aun activa");
    });

    it("revierte si ya está cerrada", async () => {
      const { vote, closeAt } = await deployFixture();
      await fastForward(closeAt + 10n);
      await vote.write.close([1n]);
      await expect(vote.write.close([1n])).to.be.rejectedWith("Vote: ya cerrada");
    });

    it("revierte si la propuesta no existe", async () => {
      const { vote } = await deployFixture();
      await expect(vote.write.close([999n])).to.be.rejectedWith("Vote: propuesta inexistente");
    });
  });
});
