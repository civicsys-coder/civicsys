/**
 * SupabaseService — wrapper sobre pg para queries a las tablas
 * `proposals_cache`, `hermes_reports`, `hermes_memory`, `sessions`.
 *
 * Sprint 1: solo lecturas + cache refresh ocasional. Las escrituras fuertes
 * (reportes nuevos, embeddings) las hace el backend Python.
 */

import type { Pool } from "pg";

export interface HermesReport {
  id: string;
  proposalId: bigint;
  chainId: number;
  bodyMarkdown: string;
  llmProvider: "anthropic" | "openrouter" | "unavailable";
  confidence: number;
  txHash: `0x${string}` | null;
  blockNumber: bigint | null;
  createdAt: string;
}

export interface SupabaseServiceConfig {
  pool: Pool;
}

interface ListReportsArgs {
  proposalId?: bigint;
  chainId?: number;
  limit?: number;
  offset?: number;
}

export class SupabaseService {
  private pool: Pool;

  constructor(cfg: SupabaseServiceConfig) {
    this.pool = cfg.pool;
  }

  async listReports(args: ListReportsArgs): Promise<HermesReport[]> {
    const limit = args.limit ?? 20;
    const offset = args.offset ?? 0;
    const filters: string[] = [];
    const params: unknown[] = [limit, offset];

    if (args.proposalId !== undefined) {
      params.push(args.proposalId.toString());
      filters.push(`proposal_id = $${params.length}`);
    }
    if (args.chainId !== undefined) {
      params.push(args.chainId);
      filters.push(`chain_id = $${params.length}`);
    }

    const where = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
    const sql = `
      SELECT id, proposal_id, chain_id, body_markdown, llm_provider, confidence, tx_hash, block_number, created_at
      FROM hermes_reports
      ${where}
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const res = await this.pool.query(sql, params);
    return res.rows.map((r) => ({
      id: r.id,
      proposalId: BigInt(r.proposal_id),
      chainId: r.chain_id,
      bodyMarkdown: r.body_markdown,
      llmProvider: r.llm_provider,
      confidence: r.confidence,
      txHash: r.tx_hash,
      blockNumber: r.block_number ? BigInt(r.block_number) : null,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    }));
  }

  async getReport(id: string): Promise<HermesReport | null> {
    const res = await this.pool.query(
      `SELECT id, proposal_id, chain_id, body_markdown, llm_provider, confidence, tx_hash, block_number, created_at
       FROM hermes_reports WHERE id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      proposalId: BigInt(r.proposal_id),
      chainId: r.chain_id,
      bodyMarkdown: r.body_markdown,
      llmProvider: r.llm_provider,
      confidence: r.confidence,
      txHash: r.tx_hash,
      blockNumber: r.block_number ? BigInt(r.block_number) : null,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    };
  }
}
