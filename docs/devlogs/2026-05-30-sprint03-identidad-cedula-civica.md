# Devlog · 2026-05-30 · Sprint 03 — Identidad Soberana «Cédula Cívica»

**Protocolo**: AEGIS v2.1.0 (Estrategia → Arquitectura → Táctica → Ejecución → Guardrails → State-Sync)
**Spec**: `docs/superpowers/specs/2026-05-29-identidad-soberana-cedula-civica-design.md`
**Plan**: `docs/plans/executed/tactica/sprint-03-identidad-soberana/00-PLAN.md`
**Rama**: `feat/sprint03-identidad-cedula-civica`

## Resumen

Sprint 03 entrega el **subsistema de identidad única** completo y demoable + **esqueletos**
de los otros 3 subsistemas (Sprint 04-06). Un ciudadano se registra **una sola vez** (DNI +
rostro, mock realista), obtiene una **wallet SYS no-custodial** y un **NFT soulbound «Cédula
Cívica»** que lo identifica como humano único. El sistema **bloquea registros dobles** por
DNI (on-chain) y por rostro (off-chain, Hermes + cosine).

## Cambios por capa

### Blockchain (`blockchain/`)
- `IdentitySBT.sol` — ERC-721 + ERC-5192 (soulbound) con **unicidad dual** (`usedDni`/
  `usedFace`), `mint`/`burn`, e implementa `ICitizenRegistry` → `Vote.sol` lo consume **sin
  cambios**. 24 tests (mint, doble DNI/rostro, segunda cédula, soulbound, burn, compat Vote).
- `interfaces/IERC5192.sol` — interfaz soulbound estándar.
- `AnonymousVote.sol` — **stub** (Sprint 04, revierte `NotImplemented`).
- `scripts/deploy-local.ts` — despliega IdentitySBT + CitizenRegistry (compat) + Vote→IdentitySBT;
  regenera ABIs a `shared/abis/` y `frontend/civicsys/lib/abi/`.

### Shared (`shared/`)
- Tipos `Cedula`, `FaceDedupeResult`; zod schemas `faceDedupe*`, `registerFace`, `backupEmail`.

### Agents / Hermes (`agents/`)
- `face_index.py` — índice cosine in-memory (interfaz pgvector-ready, ADR-008).
- `identity.py` — `IdentityService` (dedupe + register-face, idempotente).
- Endpoints `POST /agents/identity/{dedupe-face,register-face}`. Hermes **no firma** on-chain;
  persiste solo el embedding (no la imagen).
- Esqueletos: `channels/` (multicanal Sprint 05), `toxica.py` (La Tóxica Sprint 06).

### Backend (`backend/`)
- `email.service.ts` (provider pluggable) + router tRPC `backup.email` — **relay del blob
  cifrado, nunca descifra**. 

### Frontend (`frontend/civicsys/`)
- Libs: `wallet.ts` (viem), `keystore.ts` (PBKDF2+AES-GCM, Web Crypto), `face-embedding.ts`
  (mock determinista), `identity-api.ts`.
- **Wizard de 5 pasos** (`components/registro/`): DNI → Rostro → Verificar (dedupe) → Wallet
  (no-custodial + backup) → Mint (Cédula) + `CedulaCard`. Montado en `/registro`.
- Página placeholder `/votacion` (modelo nullifier/ZK, Sprint 04).
- Eliminado `RegisterCitizenForm` (reemplazado por el wizard).

### Arquitectura (ADRs, en `docs/plans/executed/arquitectura/`)
- ADR-006 soulbound (ERC-5192 + burn), ADR-007 wallet no-custodial + keystore, ADR-008 dedupe
  facial off-chain, ADR-009 votación anónima por nullifier (esqueleto).

## Decisiones e incidentes

- **Cambio de puerto Postgres → 55432**: tras un reinicio, Windows reservó el rango 54270-54369
  (incluía 54330). Migrado en `infra/.env` + `backend/.env` (gitignored). El volumen de datos
  sobrevivió. Hermes no se afectó (habla por red Docker interna).
- **Tests de agents sin venv en host**: se corren en un **contenedor efímero** con bind-mount
  (reusa la imagen `ssca-hermes:local` + tooling de test), respetando el aislamiento de Hermes.
- **Bugs pre-existentes destrabados al correr `pnpm build` por primera vez**:
  1. `tsconfig target: ES2017` → el frontend importa el tipo `AppRouter` del backend (typesafety
     tRPC), que usa `BigInt` literales (`1n`, requieren ES2020). Subido a **ES2020**.
  2. Tipos Web Crypto bajo TS 5.7 (`Uint8Array<ArrayBufferLike>` vs `BufferSource`) en
     `keystore.ts`/`face-embedding.ts`. Coercido con `Uint8Array.from` / tipos `<ArrayBuffer>`.
- **`gemini-3.5-flash` thinking**: ya resuelto en sprint previo (`thinkingBudget: 0`).

## Cómo verificar

- Guía e2e: `docs/testing-cedula-civica.md`.
- Suites: blockchain **32**, backend **24**, frontend **45** (coverage 89.8%), agents **81**
  (coverage 86.6%). Todas verdes.
- `pnpm build` del frontend: OK (rutas `/registro`, `/votacion`, `/hermes`, `/sistema`).

## Seguridad / privacidad

- PII nunca on-chain (solo commitments). Clave privada client-side, server jamás la ve; backup
  = blob cifrado inútil sin contraseña. Embedding (no imagen) con consentimiento.
- Auditoría de seguridad MNEMA aplicada al cierre (ver `docs/security/` — Sprint 03 audit).

## Pendiente

- Votación anónima funcional (ZK/nullifier, Sprint 04), bots multicanal (Sprint 05), La Tóxica
  (Sprint 06).
- Reverificar params zkSYS post-AirBender antes del deploy a testnet.
- Producción: attestor con multisig 2-de-3 para el mint; biometría real; keystore-v3 canónico.
