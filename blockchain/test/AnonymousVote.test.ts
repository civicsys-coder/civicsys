import { expect } from "chai";
import hre from "hardhat";

const NULL_A = ("0x" + "a1".repeat(32)) as `0x${string}`;
const NULL_B = ("0x" + "b2".repeat(32)) as `0x${string}`;
const ZERO = ("0x" + "00".repeat(32)) as `0x${string}`;

describe("AnonymousVote", () => {
  async function deploy() {
    const av = await hre.viem.deployContract("AnonymousVote");
    return { av };
  }

  it("cuenta un voto anónimo y marca el nullifier usado", async () => {
    const { av } = await deploy();
    await av.write.castAnonymous([1n, 0, NULL_A]); // Yes
    const [yes, no, abstain] = await av.read.tally([1n]);
    expect(yes).to.equal(1n);
    expect(no).to.equal(0n);
    expect(abstain).to.equal(0n);
    expect(await av.read.nullifierUsed([1n, NULL_A])).to.equal(true);
  });

  it("revierte el doble voto con el mismo nullifier en la misma propuesta", async () => {
    const { av } = await deploy();
    await av.write.castAnonymous([1n, 0, NULL_A]);
    await expect(av.write.castAnonymous([1n, 1, NULL_A])).to.be.rejectedWith(
      "AnonymousVote: ya votaste"
    );
  });

  it("permite el mismo nullifier en propuestas distintas", async () => {
    const { av } = await deploy();
    await av.write.castAnonymous([1n, 0, NULL_A]);
    await av.write.castAnonymous([2n, 0, NULL_A]); // otra propuesta, ok
    const [yes] = await av.read.tally([2n]);
    expect(yes).to.equal(1n);
  });

  it("acumula opciones distintas de votantes distintos", async () => {
    const { av } = await deploy();
    await av.write.castAnonymous([1n, 0, NULL_A]); // Yes
    await av.write.castAnonymous([1n, 1, NULL_B]); // No
    const [yes, no] = await av.read.tally([1n]);
    expect(yes).to.equal(1n);
    expect(no).to.equal(1n);
  });

  it("revierte choice inválido y nullifier cero", async () => {
    const { av } = await deploy();
    await expect(av.write.castAnonymous([1n, 3, NULL_A])).to.be.rejectedWith(
      "AnonymousVote: choice invalido"
    );
    await expect(av.write.castAnonymous([1n, 0, ZERO])).to.be.rejectedWith(
      "AnonymousVote: nullifier cero"
    );
  });

  it("emite AnonymousVoteCast con el nullifier (no el votante)", async () => {
    const { av } = await deploy();
    const hash = await av.write.castAnonymous([1n, 2, NULL_A]); // Abstain
    const client = await hre.viem.getPublicClient();
    await client.waitForTransactionReceipt({ hash });
    const events = await av.getEvents.AnonymousVoteCast();
    expect(events.length).to.equal(1);
    expect(events[0]!.args.nullifier).to.equal(NULL_A);
    expect(events[0]!.args.proposalId).to.equal(1n);
  });
});
