/**
 * shared/schemas — zod schemas para validación cross-stack.
 *
 * Estos schemas son la fuente de verdad de runtime. Si hay drift,
 * preferí cambiar zod primero y derivar el type de ahí.
 */

import { z } from "zod";

export const AddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "address debe ser 0x + 40 hex");

export const DniSchema = z
  .string()
  .regex(/^\d{8}$/, "DNI debe tener 8 dígitos");

export const SupportedChainIdSchema = z.union([z.literal(31337), z.literal(57057)]);

export const ChoiceSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);

export const CastVoteInputSchema = z.object({
  proposalId: z.bigint(),
  choice: ChoiceSchema,
  chainId: SupportedChainIdSchema,
});

export const RegisterCitizenInputSchema = z.object({
  dni: DniSchema,
  chainId: SupportedChainIdSchema,
});

export const ListReportsQuerySchema = z.object({
  proposalId: z.bigint().optional(),
  chainId: SupportedChainIdSchema.optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

// ── Sprint 03: identidad soberana ──

const Bytes32Schema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "debe ser 0x + 64 hex");

export const faceDedupeRequestSchema = z.object({
  embedding: z.array(z.number()).length(384),
  threshold: z.number().min(0).max(1).optional(),
});

export const faceDedupeResultSchema = z.object({
  duplicate: z.boolean(),
  similarity: z.number(),
  topMatch: z.string().nullable(),
});

export const registerFaceRequestSchema = z.object({
  embedding: z.array(z.number()).length(384),
  faceCommitment: Bytes32Schema,
});

export const backupEmailSchema = z.object({
  to: z.string().email(),
  encryptedKeystore: z.string().min(1),
});

export type CastVoteInput = z.infer<typeof CastVoteInputSchema>;
export type RegisterCitizenInput = z.infer<typeof RegisterCitizenInputSchema>;
export type ListReportsQuery = z.infer<typeof ListReportsQuerySchema>;
export type FaceDedupeRequest = z.infer<typeof faceDedupeRequestSchema>;
export type RegisterFaceRequest = z.infer<typeof registerFaceRequestSchema>;
export type BackupEmailInput = z.infer<typeof backupEmailSchema>;
