import { expect } from "chai";
import hre from "hardhat";
import { keccak256, encodePacked } from "viem";

// Salt arbitrario para tests deterministas — NO es el secreto de produccion.
const PUBLIC_SALT = "test-salt-deterministic-not-prod";

function dniHash(dni: string): `0x${string}` {
  return keccak256(encodePacked(["string", "string"], [dni, PUBLIC_SALT]));
}

describe("E2E — flow demo Sprint 1", () => {
  it("registra 5 ciudadanos → votan → cierra → tally correcto", async () => {
    const registry = await hre.viem.deployContract("CitizenRegistry");

    const publicClient = await hre.viem.getPublicClient();
    const openAt = (await publicClient.getBlock()).timestamp;
    const closeAt = openAt + 3600n;

    const vote = await hre.viem.deployContract("Vote", [
      registry.address,
      "Demo Sprint 1",
      "bafy-demo",
      openAt,
      closeAt,
    ]);

    const wallets = await hre.viem.getWalletClients();
    const voters = wallets.slice(1, 6);

    for (let i = 0; i < voters.length; i++) {
      await registry.write.register(
        [dniHash(`1000000${i}`)],
        { account: voters[i]!.account }
      );
    }

    for (const v of voters) {
      expect(await registry.read.isRegistered([v.account.address])).to.equal(true);
    }

    await vote.write.castVote([1n, 0], { account: voters[0]!.account });
    await vote.write.castVote([1n, 0], { account: voters[1]!.account });
    await vote.write.castVote([1n, 0], { account: voters[2]!.account });
    await vote.write.castVote([1n, 1], { account: voters[3]!.account });
    await vote.write.castVote([1n, 2], { account: voters[4]!.account });

    let [yes, no, abstain] = await vote.read.tally([1n]);
    expect(yes).to.equal(3n);
    expect(no).to.equal(1n);
    expect(abstain).to.equal(1n);

    await publicClient.transport.request({
      method: "evm_setNextBlockTimestamp",
      params: [Number(closeAt + 10n)] as never,
    });
    await publicClient.transport.request({ method: "evm_mine", params: [] as never });

    await vote.write.close([1n]);
    const p = await vote.read.getProposal([1n]);
    expect(p.closed).to.equal(true);

    [yes, no, abstain] = await vote.read.tally([1n]);
    expect(yes).to.equal(3n);
    expect(no).to.equal(1n);
    expect(abstain).to.equal(1n);
  });
});
