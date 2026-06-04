# Bloque E · Backend Node BFF (Express + tRPC + viem) + tests Vitest 80%

**Objetivo**: Limpiar el scaffold Express+tRPC de Sandro (que dejó mockeado con "0xHashFalso123"), reemplazar el service blockchain por viem real, conectar Supabase para cachear propuestas y reportes, exponer tRPC con 3 routers (proposals/citizens/reports). Cobertura Vitest ≥80% statements hard-gated.

**Tareas**: 14
**LOC estimado**: ~550
**Dependencias**: Bloques C (ABIs en `shared/abis/`) y D (types/schemas), Bloque A (Supabase corriendo).
**Coverage gate**: `pnpm test:ci` en `backend/` ≥80% statements en `routers/`, `services/`, `lib/`.

---

## Task E.1 — Auditar y planear el cleanup de `backend/`

**Files**: ninguno (lectura + plan).

- [ ] **Step 1**: Listar archivos actuales

```bash
find backend -type f -not -path "*/node_modules/*" | sort
```

Expected output (lo que dejó Sandro en PR #2):
```
backend/AGENTS.md
backend/docs/B-001 ... B-036.md   (36 docs · 21 son del producto equivocado alertas/sentry)
backend/pnpm-lock.yaml
backend/package.json
backend/src/abi/MiContrato.json       ← placeholder · BORRAR
backend/src/context/trpc.context.ts
backend/src/routers/_app.ts
backend/src/routers/blockchain/blockchain.router.ts   ← mockear off, refactor
backend/src/server.ts
backend/src/services/blockchain.service.ts            ← mocked, reescribir
backend/src/trpc.ts
backend/tsconfig.json
```

- [ ] **Step 2**: Plan de cleanup (sin ejecutar todavía — solo documentar):
  - Conservar: `src/server.ts`, `src/trpc.ts`, `src/context/trpc.context.ts`, `tsconfig.json`, `package.json` (instalando deps adicionales).
  - **Reescribir**: `src/services/blockchain.service.ts`, `src/routers/_app.ts`, `src/routers/blockchain/blockchain.router.ts` (→ splittear en routers por dominio).
  - **Borrar**: `src/abi/MiContrato.json` (placeholder genérico, los ABIs reales vienen de `shared/abis/`).
  - **Diferir a Bloque J**: borrar `docs/B-016 a B-031` (alertas/sentry/auditoria — producto equivocado).

- [ ] **Step 3**: No commit (solo lectura).

---

## Task E.2 — Instalar dependencias adicionales

**Files**: Modify `backend/package.json` (via pnpm).

- [ ] **Step 1**: Agregar deps que vamos a usar

```bash
cd backend
pnpm add viem@^2.0.0 pg@^8.13.0 @types/pg@^8.11.0
pnpm add -D vitest@^2.1.0 \
  @vitest/coverage-v8@^2.1.0 \
  supertest@^7.0.0 \
  @types/supertest@^6.0.0
```

- [ ] **Step 2**: Verificar `package.json`

```bash
cat package.json | python -m json.tool | grep -A 20 dependencies
```

Expected: viem, pg, zod (de Sandro), @trpc/server, express, cors, dotenv en dependencies. vitest, @vitest/coverage-v8, supertest, etc en devDependencies.

- [ ] **Step 3**: Stage + commit

```bash
cd ..
git add backend/package.json backend/pnpm-lock.yaml
git commit -m "backend(E.2): instalar viem + pg + vitest + supertest + coverage"
```

---

## Task E.3 — `backend/src/lib/chains.ts` — definición de chains

**Files**: Create `backend/src/lib/chains.ts`.

- [ ] **Step 1**: Crear archivo con las definiciones viem de Anvil y zkTanenbaum

```bash
mkdir -p backend/src/lib
cat > backend/src/lib/chains.ts <<'EOF'
/**
 * Definiciones viem de las chains soportadas Sprint 1.
 */

import { defineChain, type Chain } from "viem";

export const anvilLocal = defineChain({
  id: 31337,
  name: "Anvil local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://localhost:8545"] } },
});

export const zkTanenbaum = defineChain({
  id: 57057,
  name: "zkSYS Testnet (zkTanenbaum)",
  nativeCurrency: { name: "TSYS", symbol: "TSYS", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.ZKTANENBAUM_RPC ?? "https://rpc-zk.tanenbaum.io"],
    },
  },
  blockExplorers: {
    default: { name: "zkTanenbaum Explorer", url: "https://explorer-zk.tanenbaum.io" },
  },
  testnet: true,
});

export const CHAINS_BY_ID: Record<number, Chain> = {
  31337: anvilLocal,
  57057: zkTanenbaum,
};

export type SupportedChainId = 31337 | 57057;

export function isSupportedChainId(id: number): id is SupportedChainId {
  return id === 31337 || id === 57057;
}
EOF
```

- [ ] **Step 2**: Commit

```bash
cd ..
git add backend/src/lib/chains.ts
git commit -m "backend(E.3): chains.ts con anvilLocal y zkTanenbaum viem definitions"
```

---

## Task E.4 — `backend/src/services/blockchain.service.ts` — TDD

**Files**:
- Create: `backend/src/services/blockchain.service.ts`
- Create: `backend/src/services/blockchain.service.test.ts`

- [ ] **Step 1**: Escribir el test primero (TDD)

```bash
mkdir -p backend/src/services
cat > backend/src/services/blockchain.service.test.ts <<'EOF'
import { describe, it, expect, beforeEach, vi } from "vitest";
import { BlockchainService } from "./blockchain.service.js";

// Mock viem createPublicClient
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

describe("BlockchainService", () => {
  let svc: BlockchainService;

  beforeEach(() => {
    svc = new BlockchainService({
      chainId: 31337,
      registryAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      voteAddress: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    });
  });

  describe("getProposal", () => {
    it("lee y devuelve la propuesta con id=1 del contrato Vote", async () => {
      const mockProposal = {
        id: 1n,
        title: "Demo",
        ipfsCid: "bafy-demo",
        openAt: 1000n,
        closeAt: 100000n,
        closed: false,
      };
      (svc["client"].readContract as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockProposal
      );

      const p = await svc.getProposal(1n);
      expect(p.title).to.equal("Demo");
      expect(p.id).to.equal(1n);
      expect(p.chainId).to.equal(31337);
    });
  });

  describe("getTally", () => {
    it("devuelve tuple (yes, no, abstain) del contrato Vote", async () => {
      (svc["client"].readContract as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        3n, 1n, 1n,
      ]);
      const t = await svc.getTally(1n);
      expect(t.yes).to.equal(3n);
      expect(t.no).to.equal(1n);
      expect(t.abstain).to.equal(1n);
    });
  });

  describe("isRegistered", () => {
    it("devuelve true cuando el contrato responde true", async () => {
      (svc["client"].readContract as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
      const ok = await svc.isRegistered("0x1234567890123456789012345678901234567890");
      expect(ok).to.equal(true);
    });

    it("devuelve false cuando el contrato responde false", async () => {
      (svc["client"].readContract as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);
      const ok = await svc.isRegistered("0x0000000000000000000000000000000000000000");
      expect(ok).to.equal(false);
    });
  });
});
EOF
```

- [ ] **Step 2**: Correr — debe fallar (no existe el módulo)

```bash
cd backend && pnpm exec vitest run src/services/blockchain.service.test.ts 2>&1 | tail -10
```

Expected: fail con "Cannot find module './blockchain.service.js'" o equivalente.

- [ ] **Step 3**: Implementar el service

```bash
# Cuidado: este archivo reemplaza el mock viejo que tenía "0xHashFalso123"
cat > backend/src/services/blockchain.service.ts <<'EOF'
/**
 * BlockchainService — wrapper sobre viem para leer/escribir contratos.
 *
 * Reemplaza el placeholder mockeado del Sprint 2 scaffold. Lee on-chain
 * con viem.createPublicClient. Soporta dual-chain (Anvil 31337 o
 * zkTanenbaum 57057).
 *
 * Sprint 1: solo lecturas (readContract). Las escrituras (register, castVote)
 * las hace el frontend con MetaMask · backend nunca posee private keys.
 */

import { createPublicClient, http, type Address, type PublicClient } from "viem";
import { CHAINS_BY_ID, isSupportedChainId } from "../lib/chains.js";
import CitizenRegistryAbi from "../../../shared/abis/CitizenRegistry.json" with { type: "json" };
import VoteAbi from "../../../shared/abis/Vote.json" with { type: "json" };
import type { Proposal, Tally, CitizenStatus } from "../../../shared/types/index.js";

export interface BlockchainServiceConfig {
  chainId: 31337 | 57057;
  registryAddress: Address;
  voteAddress: Address;
}

export class BlockchainService {
  private client: PublicClient;
  private cfg: BlockchainServiceConfig;

  constructor(cfg: BlockchainServiceConfig) {
    if (!isSupportedChainId(cfg.chainId)) {
      throw new Error(`Unsupported chainId: ${cfg.chainId}`);
    }
    this.cfg = cfg;
    this.client = createPublicClient({
      chain: CHAINS_BY_ID[cfg.chainId],
      transport: http(),
    });
  }

  async getProposal(id: bigint): Promise<Proposal> {
    const result = await this.client.readContract({
      address: this.cfg.voteAddress,
      abi: VoteAbi.abi,
      functionName: "getProposal",
      args: [id],
    });
    // result es struct decoded por viem; mapeamos a nuestro type
    const r = result as {
      id: bigint;
      title: string;
      ipfsCid: string;
      openAt: bigint;
      closeAt: bigint;
      closed: boolean;
    };
    return {
      id: r.id,
      title: r.title,
      ipfsCid: r.ipfsCid,
      openAt: r.openAt,
      closeAt: r.closeAt,
      closed: r.closed,
      chainId: this.cfg.chainId,
    };
  }

  async getTally(id: bigint): Promise<Tally> {
    const result = (await this.client.readContract({
      address: this.cfg.voteAddress,
      abi: VoteAbi.abi,
      functionName: "tally",
      args: [id],
    })) as readonly [bigint, bigint, bigint];
    return { yes: result[0], no: result[1], abstain: result[2] };
  }

  async isRegistered(address: Address): Promise<boolean> {
    return (await this.client.readContract({
      address: this.cfg.registryAddress,
      abi: CitizenRegistryAbi.abi,
      functionName: "isRegistered",
      args: [address],
    })) as boolean;
  }

  async getCitizenStatus(address: Address): Promise<CitizenStatus> {
    const registered = await this.isRegistered(address);
    if (!registered) {
      return { address, registered: false, hash: null };
    }
    const hash = (await this.client.readContract({
      address: this.cfg.registryAddress,
      abi: CitizenRegistryAbi.abi,
      functionName: "hashOf",
      args: [address],
    })) as `0x${string}`;
    return { address, registered: true, hash };
  }
}
EOF
```

- [ ] **Step 4**: Correr tests

```bash
pnpm exec vitest run src/services/blockchain.service.test.ts
```

Expected: 4 tests pasan.

- [ ] **Step 5**: Stage + commit + BORRAR el mock viejo

```bash
cd ..
rm backend/src/abi/MiContrato.json  # placeholder de Sandro
git add backend/src/services/blockchain.service.ts \
        backend/src/services/blockchain.service.test.ts \
        -u backend/src/abi/MiContrato.json
# `-u` para staged deletion del archivo
git commit -m "backend(E.4): BlockchainService real con viem · 4 tests verde · elimina MiContrato.json placeholder"
```

---

## Task E.5 — `backend/src/services/supabase.service.ts` — TDD

**Files**:
- Create: `backend/src/services/supabase.service.ts`
- Create: `backend/src/services/supabase.service.test.ts`

- [ ] **Step 1**: Tests primero

```bash
cat > backend/src/services/supabase.service.test.ts <<'EOF'
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
        { id: "abc", proposal_id: "1", chain_id: 31337, body_markdown: "ok", llm_provider: "anthropic", confidence: 8, tx_hash: null, block_number: null, created_at: new Date().toISOString() },
      ]});

      const rows = await svc.listReports({});
      expect(rows.length).to.equal(1);
      expect(rows[0]!.confidence).to.equal(8);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("FROM hermes_reports"),
        expect.arrayContaining([20, 0])
      );
    });

    it("filtra por proposalId si se pasa", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await svc.listReports({ proposalId: 5n });
      const sql = mockQuery.mock.calls[0]![0] as string;
      expect(sql).to.contain("proposal_id");
    });
  });

  describe("getReport", () => {
    it("devuelve null si no hay match", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const r = await svc.getReport("nope-uuid");
      expect(r).to.equal(null);
    });
  });
});
EOF
```

- [ ] **Step 2**: Implementación

```bash
cat > backend/src/services/supabase.service.ts <<'EOF'
/**
 * SupabaseService — wrapper sobre pg (Postgres) para queries a las tablas
 * `proposals_cache`, `hermes_reports`, `hermes_memory`, `sessions`.
 *
 * Sprint 1: solo lecturas + cache refresh ocasional. Las escrituras "fuertes"
 * (reportes nuevos, embeddings) las hace el backend Python.
 */

import type { Pool } from "pg";
import type { HermesReport } from "../../../shared/types/index.js";

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
EOF
```

- [ ] **Step 3**: Run tests

```bash
cd backend && pnpm exec vitest run src/services/supabase.service.test.ts
```

Expected: 3 tests pasan.

- [ ] **Step 4**: Commit

```bash
cd ..
git add backend/src/services/supabase.service.ts backend/src/services/supabase.service.test.ts
git commit -m "backend(E.5): SupabaseService listReports + getReport · 3 tests verde"
```

---

## Task E.6 — `backend/src/context/trpc.context.ts` — inyectar services

**Files**: Modify `backend/src/context/trpc.context.ts`.

- [ ] **Step 1**: Reemplazar el context actual (vacío) por uno que inyecta los services

```bash
cat > backend/src/context/trpc.context.ts <<'EOF'
import { Pool } from "pg";
import { BlockchainService } from "../services/blockchain.service.js";
import { SupabaseService } from "../services/supabase.service.js";
import type { Address } from "viem";

const DEFAULT_CHAIN_ID = Number(process.env.CHAIN_ID ?? 31337);

if (DEFAULT_CHAIN_ID !== 31337 && DEFAULT_CHAIN_ID !== 57057) {
  throw new Error(`Unsupported CHAIN_ID: ${DEFAULT_CHAIN_ID}`);
}

const REGISTRY_ADDRESS = process.env.REGISTRY_ADDRESS as Address | undefined;
const VOTE_ADDRESS = process.env.VOTE_ADDRESS as Address | undefined;

if (!REGISTRY_ADDRESS || !VOTE_ADDRESS) {
  throw new Error("REGISTRY_ADDRESS and VOTE_ADDRESS env vars required");
}

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:54322/civicsys",
});

const blockchain = new BlockchainService({
  chainId: DEFAULT_CHAIN_ID as 31337 | 57057,
  registryAddress: REGISTRY_ADDRESS,
  voteAddress: VOTE_ADDRESS,
});

const supabase = new SupabaseService({ pool });

export function createContext() {
  return { blockchain, supabase };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
EOF
```

- [ ] **Step 2**: Stage + commit

```bash
git add backend/src/context/trpc.context.ts
git commit -m "backend(E.6): context inyecta BlockchainService + SupabaseService desde env"
```

---

## Task E.7 — Router `proposals.ts` con tests

**Files**:
- Create: `backend/src/routers/proposals.ts`
- Create: `backend/src/routers/proposals.test.ts`

- [ ] **Step 1**: Test primero

```bash
cat > backend/src/routers/proposals.test.ts <<'EOF'
import { describe, it, expect } from "vitest";
import { proposalsRouter } from "./proposals.js";
import { initTRPC } from "@trpc/server";

const t = initTRPC.context<any>().create();

describe("proposalsRouter", () => {
  it("list devuelve un array (mock service)", async () => {
    const ctx = {
      blockchain: {
        getProposal: async (id: bigint) => ({
          id, title: "T", ipfsCid: "", openAt: 0n, closeAt: 100n, closed: false, chainId: 31337,
        }),
        getTally: async (_id: bigint) => ({ yes: 1n, no: 0n, abstain: 0n }),
      },
    };
    const caller = proposalsRouter.createCaller(ctx as any);
    const list = await caller.list();
    expect(Array.isArray(list)).to.equal(true);
    expect(list.length).to.equal(1);
    expect(list[0]!.id).to.equal("1");
  });

  it("get devuelve la propuesta del id solicitado", async () => {
    const ctx = {
      blockchain: {
        getProposal: async (id: bigint) => ({
          id, title: "Especific", ipfsCid: "", openAt: 0n, closeAt: 100n, closed: false, chainId: 31337,
        }),
      },
    };
    const caller = proposalsRouter.createCaller(ctx as any);
    const p = await caller.get({ id: "1" });
    expect(p.title).to.equal("Especific");
  });

  it("tally devuelve los conteos", async () => {
    const ctx = {
      blockchain: {
        getTally: async (_id: bigint) => ({ yes: 3n, no: 1n, abstain: 1n }),
      },
    };
    const caller = proposalsRouter.createCaller(ctx as any);
    const t = await caller.tally({ id: "1" });
    expect(t.yes).to.equal("3");
    expect(t.no).to.equal("1");
    expect(t.abstain).to.equal("1");
  });
});
EOF
```

- [ ] **Step 2**: Implementación

```bash
mkdir -p backend/src/routers
cat > backend/src/routers/proposals.ts <<'EOF'
import { z } from "zod";
import { initTRPC } from "@trpc/server";
import type { Context } from "../context/trpc.context.js";

const t = initTRPC.context<Context>().create();

// bigint en transit como string (JSON no soporta bigint nativamente)
const IdInput = z.object({ id: z.string().regex(/^\d+$/) });

export const proposalsRouter = t.router({
  list: t.procedure.query(async ({ ctx }) => {
    // Sprint 1: una sola propuesta hardcoded (id=1)
    const p = await ctx.blockchain.getProposal(1n);
    return [
      {
        id: p.id.toString(),
        title: p.title,
        ipfsCid: p.ipfsCid,
        openAt: p.openAt.toString(),
        closeAt: p.closeAt.toString(),
        closed: p.closed,
        chainId: p.chainId,
      },
    ];
  }),

  get: t.procedure.input(IdInput).query(async ({ ctx, input }) => {
    const p = await ctx.blockchain.getProposal(BigInt(input.id));
    return {
      id: p.id.toString(),
      title: p.title,
      ipfsCid: p.ipfsCid,
      openAt: p.openAt.toString(),
      closeAt: p.closeAt.toString(),
      closed: p.closed,
      chainId: p.chainId,
    };
  }),

  tally: t.procedure.input(IdInput).query(async ({ ctx, input }) => {
    const t = await ctx.blockchain.getTally(BigInt(input.id));
    return {
      yes: t.yes.toString(),
      no: t.no.toString(),
      abstain: t.abstain.toString(),
    };
  }),
});
EOF
```

- [ ] **Step 3**: Run tests

```bash
cd backend && pnpm exec vitest run src/routers/proposals.test.ts
```

Expected: 3 tests verde.

- [ ] **Step 4**: Commit

```bash
cd ..
git add backend/src/routers/proposals.ts backend/src/routers/proposals.test.ts
git commit -m "backend(E.7): proposalsRouter (list/get/tally) · 3 tests verde · bigint as string"
```

---

## Task E.8 — Router `citizens.ts` con tests

**Files**:
- Create: `backend/src/routers/citizens.ts`
- Create: `backend/src/routers/citizens.test.ts`

- [ ] **Step 1**: Tests + impl en paralelo (mismo patrón que E.7)

```bash
cat > backend/src/routers/citizens.test.ts <<'EOF'
import { describe, it, expect } from "vitest";
import { citizensRouter } from "./citizens.js";

describe("citizensRouter", () => {
  it("isRegistered devuelve true si el contrato dice true", async () => {
    const ctx = {
      blockchain: {
        isRegistered: async (_a: string) => true,
      },
    };
    const caller = citizensRouter.createCaller(ctx as any);
    const ok = await caller.isRegistered({ address: "0x1234567890123456789012345678901234567890" });
    expect(ok).to.equal(true);
  });

  it("status devuelve registered + hash si está registrado", async () => {
    const ctx = {
      blockchain: {
        getCitizenStatus: async (a: string) => ({
          address: a,
          registered: true,
          hash: "0xabcd" as `0x${string}`,
        }),
      },
    };
    const caller = citizensRouter.createCaller(ctx as any);
    const s = await caller.status({ address: "0x1234567890123456789012345678901234567890" });
    expect(s.registered).to.equal(true);
    expect(s.hash).to.equal("0xabcd");
  });

  it("rechaza addresses con formato invalido (zod)", async () => {
    const ctx = { blockchain: {} as any };
    const caller = citizensRouter.createCaller(ctx as any);
    await expect(caller.isRegistered({ address: "no-es-address" })).to.be.rejected;
  });
});
EOF

cat > backend/src/routers/citizens.ts <<'EOF'
import { z } from "zod";
import { initTRPC } from "@trpc/server";
import type { Context } from "../context/trpc.context.js";

const t = initTRPC.context<Context>().create();

const AddressInput = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "address inválida"),
});

export const citizensRouter = t.router({
  isRegistered: t.procedure.input(AddressInput).query(async ({ ctx, input }) => {
    return ctx.blockchain.isRegistered(input.address as `0x${string}`);
  }),

  status: t.procedure.input(AddressInput).query(async ({ ctx, input }) => {
    return ctx.blockchain.getCitizenStatus(input.address as `0x${string}`);
  }),
});
EOF
```

- [ ] **Step 2**: Run

```bash
cd backend && pnpm exec vitest run src/routers/citizens.test.ts
```

Expected: 3 tests verde.

- [ ] **Step 3**: Commit

```bash
cd ..
git add backend/src/routers/citizens.ts backend/src/routers/citizens.test.ts
git commit -m "backend(E.8): citizensRouter (isRegistered/status) · 3 tests verde"
```

---

## Task E.9 — Router `reports.ts` con tests

**Files**:
- Create: `backend/src/routers/reports.ts`
- Create: `backend/src/routers/reports.test.ts`

- [ ] **Step 1**: Tests + impl

```bash
cat > backend/src/routers/reports.test.ts <<'EOF'
import { describe, it, expect } from "vitest";
import { reportsRouter } from "./reports.js";

describe("reportsRouter", () => {
  const mockReport = {
    id: "uuid-1",
    proposalId: 1n,
    chainId: 31337,
    bodyMarkdown: "# Reporte",
    llmProvider: "anthropic" as const,
    confidence: 8,
    txHash: "0xabc" as `0x${string}`,
    blockNumber: 100n,
    createdAt: new Date().toISOString(),
  };

  it("list devuelve reportes paginados", async () => {
    const ctx = {
      supabase: {
        listReports: async (_args: any) => [mockReport],
      },
    };
    const caller = reportsRouter.createCaller(ctx as any);
    const list = await caller.list({});
    expect(list.length).to.equal(1);
    expect(list[0]!.id).to.equal("uuid-1");
    expect(list[0]!.proposalId).to.equal("1"); // bigint → string
  });

  it("get devuelve un reporte específico", async () => {
    const ctx = {
      supabase: {
        getReport: async (_id: string) => mockReport,
      },
    };
    const caller = reportsRouter.createCaller(ctx as any);
    const r = await caller.get({ id: "uuid-1" });
    expect(r?.id).to.equal("uuid-1");
  });

  it("get devuelve null si no existe", async () => {
    const ctx = {
      supabase: {
        getReport: async (_id: string) => null,
      },
    };
    const caller = reportsRouter.createCaller(ctx as any);
    const r = await caller.get({ id: "nope" });
    expect(r).to.equal(null);
  });
});
EOF

cat > backend/src/routers/reports.ts <<'EOF'
import { z } from "zod";
import { initTRPC } from "@trpc/server";
import type { Context } from "../context/trpc.context.js";
import type { HermesReport } from "../../../shared/types/index.js";

const t = initTRPC.context<Context>().create();

const ListInput = z.object({
  proposalId: z.string().regex(/^\d+$/).optional(),
  chainId: z.union([z.literal(31337), z.literal(57057)]).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

const GetInput = z.object({ id: z.string().uuid() });

// Serializa el HermesReport (bigint → string) para tRPC wire
function serialize(r: HermesReport) {
  return {
    id: r.id,
    proposalId: r.proposalId.toString(),
    chainId: r.chainId,
    bodyMarkdown: r.bodyMarkdown,
    llmProvider: r.llmProvider,
    confidence: r.confidence,
    txHash: r.txHash,
    blockNumber: r.blockNumber?.toString() ?? null,
    createdAt: r.createdAt,
  };
}

export const reportsRouter = t.router({
  list: t.procedure.input(ListInput).query(async ({ ctx, input }) => {
    const rows = await ctx.supabase.listReports({
      proposalId: input.proposalId ? BigInt(input.proposalId) : undefined,
      chainId: input.chainId,
      limit: input.limit,
      offset: input.offset,
    });
    return rows.map(serialize);
  }),

  get: t.procedure.input(GetInput).query(async ({ ctx, input }) => {
    const r = await ctx.supabase.getReport(input.id);
    return r ? serialize(r) : null;
  }),
});
EOF
```

- [ ] **Step 2**: Run

```bash
cd backend && pnpm exec vitest run src/routers/reports.test.ts
```

Expected: 3 tests verde.

- [ ] **Step 3**: Commit

```bash
cd ..
git add backend/src/routers/reports.ts backend/src/routers/reports.test.ts
git commit -m "backend(E.9): reportsRouter (list/get) · 3 tests verde · serialize bigint"
```

---

## Task E.10 — `backend/src/routers/_app.ts` consolidar

**Files**: Modify `backend/src/routers/_app.ts`.

- [ ] **Step 1**: Reemplazar el viejo (que apuntaba a blockchain.router.ts del producto equivocado)

```bash
cat > backend/src/routers/_app.ts <<'EOF'
import { initTRPC } from "@trpc/server";
import type { Context } from "../context/trpc.context.js";
import { proposalsRouter } from "./proposals.js";
import { citizensRouter } from "./citizens.js";
import { reportsRouter } from "./reports.js";

const t = initTRPC.context<Context>().create();

export const appRouter = t.router({
  proposals: proposalsRouter,
  citizens: citizensRouter,
  reports: reportsRouter,
});

export type AppRouter = typeof appRouter;
EOF
```

- [ ] **Step 2**: Borrar el router blockchain placeholder de Sandro

```bash
rm -rf backend/src/routers/blockchain
```

- [ ] **Step 3**: Commit

```bash
git add backend/src/routers/_app.ts
git rm -r backend/src/routers/blockchain
git commit -m "backend(E.10): _app.ts consolida proposals+citizens+reports · borra router/blockchain de Sandro"
```

---

## Task E.11 — Smoke test end-to-end del backend

**Files**: ninguno (verificación).

- [ ] **Step 1**: Asegurar Anvil + Postgres corriendo + contratos deployados

```bash
bash infra/up.sh
cd blockchain && pnpm exec hardhat run scripts/deploy-local.ts --network localhost
cd ..
```

- [ ] **Step 2**: Configurar `.env` del backend con las addresses del deploy

```bash
REG=$(jq -r '.contracts.CitizenRegistry' blockchain/deployments/localhost.json)
VOTE=$(jq -r '.contracts.Vote' blockchain/deployments/localhost.json)

cat > backend/.env <<EOF
CHAIN_ID=31337
REGISTRY_ADDRESS=$REG
VOTE_ADDRESS=$VOTE
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/civicsys
PORT=4000
EOF
```

- [ ] **Step 3**: Arrancar backend en dev mode

```bash
cd backend && pnpm dev &
sleep 3
```

- [ ] **Step 4**: Probar tRPC con curl

```bash
curl -s 'http://localhost:4000/trpc/proposals.list' | python -m json.tool | head -30
```

Expected: JSON con la propuesta seed (`title: "Demo Sprint 1..."`).

```bash
curl -s 'http://localhost:4000/trpc/citizens.isRegistered?input=%7B%22address%22%3A%220x0000000000000000000000000000000000000000%22%7D' | python -m json.tool
```

Expected: `{"result":{"data":false}}`.

- [ ] **Step 5**: Apagar backend

```bash
pkill -f "tsx src/server.ts" || true
```

- [ ] **Step 6**: No commit (es smoke test).

---

## Task E.12 — Configurar Vitest + coverage gate 80%

**Files**: Create `backend/vitest.config.ts`. Modify `backend/package.json`.

- [ ] **Step 1**: Crear `vitest.config.ts`

```bash
cat > backend/vitest.config.ts <<'EOF'
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary", "html"],
      include: ["src/routers/**/*.ts", "src/services/**/*.ts", "src/lib/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
    },
  },
});
EOF
```

- [ ] **Step 2**: Agregar scripts a `package.json`

Editar manualmente `backend/package.json` para que tenga:

```json
{
  "scripts": {
    "dev": "tsx src/server.ts",
    "start": "node dist/server.js",
    "build": "tsc",
    "test": "vitest",
    "test:run": "vitest run",
    "test:ci": "vitest run --coverage"
  }
}
```

- [ ] **Step 3**: Correr el gate

```bash
cd backend && pnpm test:ci
```

Expected output (último bloque):
```
% Coverage report from v8
─────────|─────────|──────────|─────────|─────────|───
File     | % Stmts | % Branch | % Funcs | % Lines |
─────────|─────────|──────────|─────────|─────────|───
All files|   90.XX |    85.XX |   88.XX |   90.XX |
...

Test Files  4 passed (4)
     Tests  13 passed (13)
```

Vitest sale con exit 0 si los thresholds se cumplen, exit 1 si no.

- [ ] **Step 4**: Commit

```bash
cd ..
git add backend/vitest.config.ts backend/package.json
git commit -m "backend(E.12): vitest config + coverage hard-gate 80% statements"
```

---

## Task E.13 — Actualizar `backend/src/server.ts` final + cleanup

**Files**: Modify `backend/src/server.ts`.

- [ ] **Step 1**: Reescribir el server (ya existía de Sandro pero con CORS hardcoded)

```bash
cat > backend/src/server.ts <<'EOF'
import express from "express";
import cors from "cors";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "./routers/_app.js";
import { createContext } from "./context/trpc.context.js";
import "dotenv/config";

const PORT = Number(process.env.PORT ?? 4000);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";

const app = express();

app.use(
  cors({
    origin: CORS_ORIGIN.split(",").map((s) => s.trim()),
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", chain: process.env.CHAIN_ID }));

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.listen(PORT, () => {
  console.log(`🚀 backend/civicsys @ http://localhost:${PORT}/trpc · /health · CORS=${CORS_ORIGIN}`);
});
EOF
```

- [ ] **Step 2**: Commit

```bash
git add backend/src/server.ts
git commit -m "backend(E.13): server.ts con CORS env-driven + endpoint /health"
```

---

## Task E.14 — Cierre del Bloque E

**Files**: ninguno (verificación).

- [ ] **Step 1**: Re-correr todos los tests + coverage

```bash
cd backend && pnpm test:ci
```

Expected: ≥13 tests pasan, coverage ≥80%.

- [ ] **Step 2**: Smoke health check

```bash
cd backend && pnpm dev &
sleep 2
curl -sf http://localhost:4000/health
pkill -f "tsx src/server.ts" || true
```

Expected: `{"status":"ok","chain":"31337"}`.

- [ ] **Step 3**: Confirmar commits

```bash
cd .. && git log --oneline backend/ | head -15
```

Expected: ~12-13 commits del bloque.

---

## Criterios de done del Bloque E

- [ ] `BlockchainService` real (sin mocks) con viem · 4 tests verde.
- [ ] `SupabaseService` para reports · 3 tests verde.
- [ ] 3 routers tRPC (proposals/citizens/reports) · 9 tests verde.
- [ ] Coverage ≥80% statements en `routers/`, `services/`, `lib/` con `pnpm test:ci`.
- [ ] Server arranca limpio con `/health` y `/trpc` accesibles.
- [ ] Mock viejo `MiContrato.json` y router `blockchain/` borrados.
- [ ] 12-13 commits del bloque.

**Gate humano antes de Bloque F**: Orlando verifica `pnpm test:ci` verde en backend/. Aprueba pasar a backend Python.
