import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("viem", async () => {
  const actual = await vi.importActual<typeof import("viem")>("viem");
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      readContract: vi.fn(),
      getChainId: vi.fn(() => Promise.resolve(31337)),
    })),
  };
});

import { BlockchainService } from "./blockchain.service.js";

const VALID_ADDR_A: `0x${string}` = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const VALID_ADDR_B: `0x${string}` = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

describe("BlockchainService", () => {
  let svc: BlockchainService;

  beforeEach(() => {
    svc = new BlockchainService({
      chainId: 31337,
      registryAddress: VALID_ADDR_A,
      voteAddress: VALID_ADDR_B,
    });
  });

  describe("ctor", () => {
    it("rechaza chainId no soportado", () => {
      expect(() => new BlockchainService({
        chainId: 999 as 31337,
        registryAddress: VALID_ADDR_A,
        voteAddress: VALID_ADDR_B,
      })).toThrow(/Unsupported chainId/);
    });
  });

  describe("getProposal", () => {
    it("lee y mapea el struct + agrega chainId", async () => {
      // @ts-expect-error mock interno
      svc["client"].readContract = vi.fn().mockResolvedValueOnce({
        id: 1n, title: "Demo", ipfsCid: "bafy", openAt: 1000n, closeAt: 100000n, closed: false,
      });
      const p = await svc.getProposal(1n);
      expect(p.title).toBe("Demo");
      expect(p.id).toBe(1n);
      expect(p.chainId).toBe(31337);
      expect(p.closed).toBe(false);
    });
  });

  describe("getTally", () => {
    it("devuelve {yes, no, abstain}", async () => {
      // @ts-expect-error mock interno
      svc["client"].readContract = vi.fn().mockResolvedValueOnce([3n, 1n, 1n]);
      const t = await svc.getTally(1n);
      expect(t.yes).toBe(3n);
      expect(t.no).toBe(1n);
      expect(t.abstain).toBe(1n);
    });
  });

  describe("isRegistered", () => {
    it("true si contrato devuelve true", async () => {
      // @ts-expect-error
      svc["client"].readContract = vi.fn().mockResolvedValueOnce(true);
      expect(await svc.isRegistered(VALID_ADDR_A)).toBe(true);
    });

    it("false si contrato devuelve false", async () => {
      // @ts-expect-error
      svc["client"].readContract = vi.fn().mockResolvedValueOnce(false);
      expect(await svc.isRegistered(VALID_ADDR_A)).toBe(false);
    });
  });

  describe("getCitizenStatus", () => {
    it("registered=false sin hash si no registrado", async () => {
      // @ts-expect-error
      svc["client"].readContract = vi.fn().mockResolvedValueOnce(false);
      const s = await svc.getCitizenStatus(VALID_ADDR_A);
      expect(s.registered).toBe(false);
      expect(s.hash).toBeNull();
    });

    it("registered=true + hash si registrado", async () => {
      // @ts-expect-error
      svc["client"].readContract = vi.fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce("0xabc" as `0x${string}`);
      const s = await svc.getCitizenStatus(VALID_ADDR_A);
      expect(s.registered).toBe(true);
      expect(s.hash).toBe("0xabc");
    });
  });
});
