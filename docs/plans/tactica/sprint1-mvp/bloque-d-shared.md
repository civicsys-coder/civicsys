# Bloque D · Shared types + zod schemas

**Objetivo**: TypeScript types compartidos entre backend Node y frontend, derivados de los ABIs y zod schemas para validación cross-stack consistente. Source of truth: contratos en blockchain/ y los ABIs generados en Bloque C.

**Tareas**: 4
**LOC estimado**: ~150
**Dependencias**: Bloque C cerrado (ABIs en `shared/abis/`).
**Coverage gate**: no aplica (types puros).

---

## Task D.1 — `shared/types/index.ts` con tipos canónicos

**Files**: Create `shared/types/index.ts`.

- [ ] **Step 1**: Crear archivo de tipos

```bash
cat > shared/types/index.ts <<'EOF'
/**
 * shared/types — tipos canónicos cross-stack (backend Node + frontend).
 *
 * No re-exporta los ABIs (eso vive en shared/abis/). Estos son los tipos
 * que circulan por las APIs (tRPC, FastAPI) y por la UI. Cuando un cambio
 * en los contratos rompa estos tipos, hay que tocar acá explícitamente.
 */

/** Hex address (0x-prefixed, 40 hex chars). */
export type Address = `0x${string}`;

/** Hex bytes32 (0x-prefixed, 64 hex chars). */
export type Bytes32 = `0x${string}`;

/** Hex tx hash (0x-prefixed, 64 hex chars). */
export type TxHash = `0x${string}`;

/** Chains soportadas Sprint 1. */
export type SupportedChainId = 31337 | 57057;

export const CHAIN_NAMES: Record<SupportedChainId, string> = {
  31337: "Anvil local",
  57057: "zkTanenbaum",
};

export const CHAIN_EXPLORERS: Record<SupportedChainId, string | null> = {
  31337: null,
  57057: "https://explorer-zk.tanenbaum.io",
};

/** Choice enum mirroring contracts/Vote.sol::Choice. */
export enum Choice {
  Yes = 0,
  No = 1,
  Abstain = 2,
}

export const CHOICE_LABELS: Record<Choice, string> = {
  [Choice.Yes]: "Sí",
  [Choice.No]: "No",
  [Choice.Abstain]: "Abstención",
};

/** Propuesta tal cual la lee on-chain o el cache Supabase. */
export interface Proposal {
  id: bigint;
  title: string;
  ipfsCid: string;
  openAt: bigint;     // unix seconds
  closeAt: bigint;    // unix seconds
  closed: boolean;
  chainId: SupportedChainId;
}

/** Tally on-chain. */
export interface Tally {
  yes: bigint;
  no: bigint;
  abstain: bigint;
}

/** Reporte generado por Hermes (DB row de hermes_reports). */
export interface HermesReport {
  id: string;             // UUID
  proposalId: bigint;
  chainId: SupportedChainId;
  bodyMarkdown: string;
  llmProvider: "anthropic" | "openrouter" | "unavailable";
  confidence: number;     // 0-10
  txHash: TxHash | null;
  blockNumber: bigint | null;
  createdAt: string;      // ISO8601
}

/** Estado de un ciudadano en el registry on-chain. */
export interface CitizenStatus {
  address: Address;
  registered: boolean;
  hash: Bytes32 | null;
}
EOF
```

- [ ] **Step 2**: Stage + commit

```bash
git add shared/types/index.ts
git commit -m "shared(D.1): types canónicos cross-stack (Address/Proposal/Tally/HermesReport/etc)"
```

---

## Task D.2 — `shared/schemas/zod.ts` validadores

**Files**: Create `shared/schemas/zod.ts`. Asume que zod 4.x está disponible (backend Sprint 2 lo metió en `backend/package.json`; frontend lo va a instalar en Bloque G).

- [ ] **Step 1**: Crear schemas

```bash
cat > shared/schemas/zod.ts <<'EOF'
/**
 * shared/schemas — zod schemas para validación cross-stack.
 *
 * Estos schemas son la **fuente de verdad de runtime**: tipos derivados con
 * z.infer<typeof ...> matchean los tipos del shared/types/. Si hay drift,
 * preferí cambiar zod primero y derivar el type de ahí.
 */

import { z } from "zod";

/** Regex hex address 0x + 40. */
export const AddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "address debe ser 0x + 40 hex");

/** DNI peruano: exactamente 8 dígitos. */
export const DniSchema = z
  .string()
  .regex(/^\d{8}$/, "DNI debe tener 8 dígitos");

/** Chain ID soportada. */
export const SupportedChainIdSchema = z.union([z.literal(31337), z.literal(57057)]);

/** Choice enum 0/1/2. */
export const ChoiceSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);

/** Input para casteo de voto. */
export const CastVoteInputSchema = z.object({
  proposalId: z.bigint(),
  choice: ChoiceSchema,
  chainId: SupportedChainIdSchema,
});

/** Input para registro de ciudadano (frontend → backend → contrato). */
export const RegisterCitizenInputSchema = z.object({
  dni: DniSchema,
  chainId: SupportedChainIdSchema,
});

/** Query para listar reportes Hermes. */
export const ListReportsQuerySchema = z.object({
  proposalId: z.bigint().optional(),
  chainId: SupportedChainIdSchema.optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export type CastVoteInput = z.infer<typeof CastVoteInputSchema>;
export type RegisterCitizenInput = z.infer<typeof RegisterCitizenInputSchema>;
export type ListReportsQuery = z.infer<typeof ListReportsQuerySchema>;
EOF
```

- [ ] **Step 2**: Stage + commit

```bash
git add shared/schemas/zod.ts
git commit -m "shared(D.2): zod schemas para Address/DNI/Choice/CastVote/RegisterCitizen/ListReports"
```

---

## Task D.3 — `shared/package.json` para que sea importable

**Files**: Create `shared/package.json`, `shared/tsconfig.json`.

- [ ] **Step 1**: Crear package mínimo

```bash
cat > shared/package.json <<'EOF'
{
  "name": "@civicsys/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    "./types": "./types/index.ts",
    "./schemas/zod": "./schemas/zod.ts",
    "./abis/CitizenRegistry": "./abis/CitizenRegistry.json",
    "./abis/Vote": "./abis/Vote.json"
  }
}
EOF
```

- [ ] **Step 2**: tsconfig mínimo (para que `tsc --noEmit` valide)

```bash
cat > shared/tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "noEmit": true
  },
  "include": ["types/**/*.ts", "schemas/**/*.ts"]
}
EOF
```

- [ ] **Step 3**: Validar que zod está disponible (debería estarlo via backend o frontend node_modules)

Esto va a fallar todavía porque no hay node_modules. Es OK — los consumers (backend, frontend) van a tener zod en sus propios package.json. El `shared/` no instala nada propio.

```bash
# Sólo verificación visual
cd shared && cat package.json
cd ..
```

- [ ] **Step 4**: Stage + commit

```bash
git add shared/package.json shared/tsconfig.json
git commit -m "shared(D.3): package.json con exports + tsconfig para uso desde backend y frontend"
```

---

## Task D.4 — `shared/README.md`

**Files**: Create `shared/README.md`.

- [ ] **Step 1**: Crear README

```bash
cat > shared/README.md <<'EOF'
# shared/

Source of truth cross-stack para tipos, schemas zod y ABIs generados de los
contratos. Lo consumen `backend/` (Node + tRPC) y `frontend/civicsys/` (Next.js).

## Contenido

| Carpeta | Qué hay | Generado o manual |
|---|---|---|
| `types/` | `index.ts` con interfaces TypeScript (Proposal, Tally, HermesReport, etc) | manual |
| `schemas/` | `zod.ts` con schemas runtime (DniSchema, AddressSchema, etc) | manual |
| `abis/` | `CitizenRegistry.json` y `Vote.json` | generado por `blockchain/scripts/deploy-local.ts` |

## Uso desde backend Node

```typescript
import type { Proposal, Tally } from "@civicsys/shared/types";
import { CastVoteInputSchema } from "@civicsys/shared/schemas/zod";
import VoteAbi from "@civicsys/shared/abis/Vote" assert { type: "json" };
```

## Uso desde frontend (Next.js)

```typescript
import { Choice, CHOICE_LABELS } from "@civicsys/shared/types";
import { DniSchema } from "@civicsys/shared/schemas/zod";
```

## Regenerar ABIs

```bash
cd ../blockchain && pnpm exec hardhat run scripts/deploy-local.ts --network localhost
```

Los ABIs se copian automáticamente a `shared/abis/` como parte del deploy.

## Cuando agregar / modificar types

Los types deberían cambiar **solo** cuando:
1. Cambia la interfaz pública de un contrato (función nueva, evento nuevo, struct nuevo).
2. Se agrega un endpoint del backend Node que devuelve un objeto nuevo que el frontend necesita type-checked.
3. Se agrega un endpoint del backend Python (FastAPI) que cruza al frontend a través del Node BFF.

Si el cambio es solo interno de una capa (e.g., un helper privado del backend Node), NO va a shared.
EOF
```

- [ ] **Step 2**: Stage + commit

```bash
git add shared/README.md
git commit -m "shared(D.4): README documentando uso desde backend y frontend"
```

---

## Criterios de done del Bloque D

- [ ] `shared/types/index.ts` exporta Address, Bytes32, Choice, Proposal, Tally, HermesReport, CitizenStatus.
- [ ] `shared/schemas/zod.ts` exporta DniSchema, AddressSchema, CastVoteInputSchema, RegisterCitizenInputSchema.
- [ ] `shared/package.json` define exports paths que Node y Next.js pueden resolver.
- [ ] `shared/README.md` documenta uso.
- [ ] 4 commits del bloque (`shared(D.X)`).

**Gate humano antes de Bloque E**: Orlando verifica que `cat shared/types/index.ts` y `cat shared/schemas/zod.ts` están completos. Aprueba pasar al backend Node.
