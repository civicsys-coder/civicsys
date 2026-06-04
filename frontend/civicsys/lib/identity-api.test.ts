import { describe, it, expect, vi, afterEach } from "vitest";
import { dedupeFace, registerFace } from "./identity-api";

afterEach(() => vi.restoreAllMocks());

describe("identity-api", () => {
  it("dedupeFace devuelve el resultado de Hermes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ duplicate: false, similarity: 0.1, topMatch: null }),
      })
    );
    const res = await dedupeFace([0, 1, 2]);
    expect(res.duplicate).toBe(false);
  });

  it("dedupeFace lanza si Hermes responde error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(dedupeFace([0])).rejects.toThrow(/dedupe/);
  });

  it("registerFace hace POST y resuelve", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    await registerFace([0, 1], "0x" + "ab".repeat(32));
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
