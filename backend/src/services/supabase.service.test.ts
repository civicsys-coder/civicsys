import { describe, it, expect, beforeEach, vi } from "vitest";
import { SupabaseService } from "./supabase.service.js";

describe("SupabaseService", () => {
  let svc: SupabaseService;
  let mockQuery: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockQuery = vi.fn();
    svc = new SupabaseService({
      pool: { query: mockQuery } as unknown as import("pg").Pool,
    });
  });

  describe("listReports", () => {
    it("devuelve filas con paginación default 20/0", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [
        {
          id: "abc-uuid", proposal_id: "1", chain_id: 31337,
          body_markdown: "ok", llm_provider: "anthropic", confidence: 8,
          tx_hash: null, block_number: null, created_at: new Date().toISOString(),
        },
      ]});
      const rows = await svc.listReports({});
      expect(rows.length).toBe(1);
      expect(rows[0]!.confidence).toBe(8);
      expect(rows[0]!.proposalId).toBe(1n);
      expect(mockQuery).toHaveBeenCalled();
      const args = mockQuery.mock.calls[0]![1];
      expect(args).toEqual([20, 0]);
    });

    it("filtra por proposalId si se pasa", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await svc.listReports({ proposalId: 5n });
      const sql = mockQuery.mock.calls[0]![0] as string;
      expect(sql).toContain("proposal_id");
    });

    it("filtra por chainId si se pasa", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await svc.listReports({ chainId: 57057 });
      const sql = mockQuery.mock.calls[0]![0] as string;
      expect(sql).toContain("chain_id");
    });

    it("convierte block_number a bigint y created_at Date a ISO", async () => {
      const d = new Date("2026-05-21T00:00:00Z");
      mockQuery.mockResolvedValueOnce({ rows: [{
        id: "x", proposal_id: "1", chain_id: 31337,
        body_markdown: "", llm_provider: "anthropic", confidence: 5,
        tx_hash: "0xa", block_number: "100", created_at: d,
      }]});
      const rows = await svc.listReports({});
      expect(rows[0]!.blockNumber).toBe(100n);
      expect(rows[0]!.createdAt).toBe(d.toISOString());
    });
  });

  describe("getReport", () => {
    it("devuelve null si no hay match", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      expect(await svc.getReport("nope-uuid")).toBeNull();
    });

    it("devuelve el reporte mapeado", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{
        id: "x", proposal_id: "7", chain_id: 57057,
        body_markdown: "# Hola", llm_provider: "openrouter", confidence: 6,
        tx_hash: null, block_number: null, created_at: "2026-05-21T01:00:00Z",
      }]});
      const r = await svc.getReport("x");
      expect(r?.id).toBe("x");
      expect(r?.proposalId).toBe(7n);
      expect(r?.bodyMarkdown).toBe("# Hola");
    });
  });
});
