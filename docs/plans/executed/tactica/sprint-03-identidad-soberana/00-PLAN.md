# Identidad Soberana «Cédula Cívica» — Implementation Plan (Sprint 03)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task (inline, en consola). **NO usar subagent-driven-development** — AEGIS v2.0.0 prohíbe sub-agentes en background. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un ciudadano se registra una sola vez (DNI + cara, mock realista), recibe una wallet SYS no-custodial y un NFT soulbound «Cédula Cívica» que lo identifica como humano único; el sistema bloquea registros dobles por DNI (on-chain) y por rostro (off-chain).

**Architecture:** `IdentitySBT.sol` (ERC-721 + ERC-5192 soulbound) con unicidad dual `dniHash`/`faceCommitment`, implementa `ICitizenRegistry` para que `Vote.sol` no cambie. La clave privada se genera y cifra en el navegador (viem + Web Crypto); el backend solo reenvía el blob cifrado; Hermes hace dedupe facial off-chain (cosine sobre embeddings) sin firmar. Se dejan esqueletos no funcionales de los otros 3 subsistemas.

**Tech Stack:** Solidity 0.8.24 + Hardhat 3 + OpenZeppelin v5 · viem/wagmi · Next.js 16 (App Router) · FastAPI + pydantic · tRPC (backend) · vitest / pytest / hardhat-test. Package manager: **pnpm**.

**Spec origen:** `docs/superpowers/specs/2026-05-29-identidad-soberana-cedula-civica-design.md`

---

## Convenciones de este plan

- **TDD estricto**: test que falla → implementación mínima → test verde → commit.
- **Rutas exactas** siempre. **pnpm**, nunca npm.
- **Antes de tocar `frontend/civicsys/`**: leer las guías en `node_modules/next/dist/docs/` (AGENTS.md avisa que Next 16 tiene breaking changes).
- Cada bloque termina con tests verdes de esa capa antes de pasar al siguiente.
- Commits convencionales con sufijo de bloque: `feat(A): ...`, `test(C): ...`.

## File Structure (qué se crea / modifica)

```
blockchain/
  contracts/
    IdentitySBT.sol                         CREAR  — NFT soulbound + unicidad dual + ICitizenRegistry
    interfaces/IERC5192.sol                 CREAR  — interfaz estándar soulbound
    AnonymousVote.sol                        CREAR  — STUB Sprint 04 (no funcional)
  test/
    IdentitySBT.test.ts                     CREAR  — tests del contrato
  scripts/deploy.ts                          MODIF  — desplegar IdentitySBT, apuntar Vote a él
shared/
  types/index.ts                             MODIF  — Cedula, FaceDedupeResult
  schemas/zod.ts                             MODIF  — schemas endpoints nuevos
  abis/IdentitySBT.json                      CREAR  — ABI regenerada
agents/app/
  face_index.py                              CREAR  — índice cosine (in-mem, pgvector-ready)
  identity.py                                CREAR  — servicio dedupe + register-face
  main.py                                    MODIF  — endpoints /agents/identity/*
  channels/__init__.py                       CREAR  — STUB multicanal Sprint 05
  channels/base.py                           CREAR  — interfaz Channel
  channels/{telegram,discord,whatsapp}.py    CREAR  — STUBS NotImplementedError
  toxica.py                                  CREAR  — STUB "La Tóxica" Sprint 06
agents/tests/
  test_face_index.py                         CREAR
  test_identity.py                           CREAR
backend/src/routers/
  backup.ts                                  CREAR  — tRPC mutation relay email
  backup.test.ts                             CREAR
  _app.ts                                    MODIF  — montar router backup
backend/src/services/
  email.service.ts                           CREAR  — provider pluggable (mock/real)
frontend/civicsys/
  lib/wallet.ts                              CREAR  — generar wallet (viem)
  lib/wallet.test.ts                         CREAR
  lib/keystore.ts                            CREAR  — cifrar/descifrar (Web Crypto)
  lib/keystore.test.ts                       CREAR
  lib/face-embedding.ts                      CREAR  — embedding mock determinista + commitment
  lib/face-embedding.test.ts                 CREAR
  lib/identity-api.ts                         CREAR  — fetch a Hermes dedupe
  lib/contracts.ts                           MODIF  — exportar IdentitySBTAbi
  components/registro/WizardProvider.tsx     CREAR  — máquina de pasos
  components/registro/StepDniCapture.tsx     CREAR
  components/registro/StepFaceCapture.tsx    CREAR
  components/registro/StepVerify.tsx         CREAR
  components/registro/StepWallet.tsx         CREAR
  components/registro/StepMint.tsx           CREAR
  components/registro/CedulaCard.tsx         CREAR
  app/registro/page.tsx                      MODIF  — montar el wizard
  app/votacion/page.tsx                      CREAR  — placeholder Sprint 04
docs/plans/arquitectura/
  ADR-006-soulbound-identity.md              CREAR
  ADR-007-noncustodial-wallet-keystore.md    CREAR
  ADR-008-face-dedupe-offchain.md            CREAR
  ADR-009-anonymous-vote-nullifier.md        CREAR  (esqueleto Sprint 04)
```

---

## Block 0 — Arquitectura (ADRs) + prep

### Task 0.1: ADR-006 Soulbound identity

**Files:** Create `docs/plans/arquitectura/ADR-006-soulbound-identity.md`

- [ ] **Step 1:** Escribir el ADR con: contexto (anti-Sybil, hallazgo §4 del spec), opciones (ERC-5192 puro vs. ERC-5192 + burn por el holder vs. ERC-721 mutable), decisión (**ERC-5192 + burn opcional del holder** para derecho al olvido), consecuencias, y nota de que `IdentitySBT` implementa `ICitizenRegistry` para no tocar `Vote.sol`. Seguir el formato de `docs/plans/executed/arquitectura/ADR-001-salt-strategy.md`.
- [ ] **Step 2: Commit**
```bash
git add docs/plans/arquitectura/ADR-006-soulbound-identity.md
git commit -m "docs(arq): ADR-006 identidad soulbound ERC-5192 + burn del holder"
```

### Task 0.2: ADR-007 Wallet no-custodial + keystore

**Files:** Create `docs/plans/arquitectura/ADR-007-noncustodial-wallet-keystore.md`

- [ ] **Step 1:** Documentar: clave generada client-side (viem `generatePrivateKey`); cifrado con **PBKDF2 (≥150k iter) + AES-GCM** vía Web Crypto API produciendo un **JSON cifrado** (no el keystore-v3 canónico de aes-128-ctr; se documenta que la interop directa con import de MetaMask queda como stretch — el usuario importa via private key revelada localmente bajo su contraseña). El server nunca ve la clave; el email lleva solo el blob cifrado. Decisión, trade-offs, consecuencias.
- [ ] **Step 2: Commit**
```bash
git add docs/plans/arquitectura/ADR-007-noncustodial-wallet-keystore.md
git commit -m "docs(arq): ADR-007 wallet no-custodial + cifrado PBKDF2/AES-GCM"
```

### Task 0.3: ADR-008 Dedupe facial off-chain

**Files:** Create `docs/plans/arquitectura/ADR-008-face-dedupe-offchain.md`

- [ ] **Step 1:** Documentar: embeddings (no imágenes) en un índice; similitud **coseno**; umbral configurable (default 0.92); in-memory para el hackathon con interfaz lista para pgvector; Hermes no firma; consentimiento + dato sensible; límite honesto (mock ≠ biometría real).
- [ ] **Step 2: Commit**
```bash
git add docs/plans/arquitectura/ADR-008-face-dedupe-offchain.md
git commit -m "docs(arq): ADR-008 dedupe facial off-chain (cosine + umbral)"
```

### Task 0.4: ADR-009 Votación anónima (esqueleto Sprint 04)

**Files:** Create `docs/plans/arquitectura/ADR-009-anonymous-vote-nullifier.md`

- [ ] **Step 1:** Documentar el approach futuro **nullifier/ZK** (nullifier derivado de la identidad evita doble voto sin revelar quién). Marcar **"Sprint 04 — no implementado"**. Sin código.
- [ ] **Step 2: Commit**
```bash
git add docs/plans/arquitectura/ADR-009-anonymous-vote-nullifier.md
git commit -m "docs(arq): ADR-009 votación anónima por nullifier (esqueleto Sprint 04)"
```

---

## Block A — Blockchain: `IdentitySBT.sol`

### Task A.1: Instalar OpenZeppelin v5

**Files:** Modify `blockchain/package.json`

- [ ] **Step 1: Instalar la dependencia**
```bash
cd blockchain && pnpm add @openzeppelin/contracts@^5.1.0
```
- [ ] **Step 2: Verificar que existe el ERC721**

Run: `Test-Path blockchain/node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol`
Expected: `True`
- [ ] **Step 3: Commit**
```bash
git add blockchain/package.json blockchain/pnpm-lock.yaml ../pnpm-lock.yaml
git commit -m "build(A): agregar @openzeppelin/contracts v5"
```

### Task A.2: Interfaz `IERC5192`

**Files:** Create `blockchain/contracts/interfaces/IERC5192.sol`

- [ ] **Step 1: Crear la interfaz estándar (EIP-5192)**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IERC5192 — Minimal Soulbound NFT interface (EIP-5192)
interface IERC5192 {
    /// @notice Emitido cuando el bloqueo de un token se activa.
    event Locked(uint256 tokenId);
    /// @notice Emitido cuando el bloqueo de un token se desactiva.
    event Unlocked(uint256 tokenId);
    /// @notice Devuelve el estado de bloqueo. Soulbound => siempre true.
    function locked(uint256 tokenId) external view returns (bool);
}
```
- [ ] **Step 2: Commit**
```bash
git add blockchain/contracts/interfaces/IERC5192.sol
git commit -m "feat(A): interfaz IERC5192 (soulbound estándar)"
```

### Task A.3: Test — mint feliz + soulbound

**Files:** Create `blockchain/test/IdentitySBT.test.ts`

- [ ] **Step 1: Escribir el test que falla (happy path + locked)**
```typescript
import { expect } from "chai";
import { network } from "hardhat";

const { viem } = await network.connect();

const DNI = ("0x" + "a1".repeat(32)) as `0x${string}`;
const FACE = ("0x" + "b2".repeat(32)) as `0x${string}`;
const URI = "data:application/json,{}";

describe("IdentitySBT", () => {
  it("mintea una Cédula y la deja registrada + locked", async () => {
    const sbt = await viem.deployContract("IdentitySBT");
    const [w] = await viem.getWalletClients();

    await sbt.write.mint([DNI, FACE, URI]);

    expect(await sbt.read.balanceOf([w.account.address])).to.equal(1n);
    expect(await sbt.read.isRegistered([w.account.address])).to.equal(true);
    expect(await sbt.read.hashOf([w.account.address])).to.equal(DNI);
    expect(await sbt.read.locked([1n])).to.equal(true);
  });
});
```
- [ ] **Step 2: Verificar que falla**

Run: `cd blockchain && pnpm hardhat test test/IdentitySBT.test.ts`
Expected: FAIL — no existe `IdentitySBT` / artifact no encontrado.

### Task A.4: Implementar `IdentitySBT.sol`

**Files:** Create `blockchain/contracts/IdentitySBT.sol`

- [ ] **Step 1: Implementar el contrato**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ICitizenRegistry} from "./interfaces/ICitizenRegistry.sol";
import {IERC5192} from "./interfaces/IERC5192.sol";

/// @title IdentitySBT — «Cédula Cívica»
/// @notice NFT soulbound (ERC-5192) de identidad única. Una address, una Cédula.
///         Unicidad dual: dniHash y faceCommitment no se pueden reutilizar.
///         Implementa ICitizenRegistry para que Vote.sol lo consuma sin cambios.
/// @dev Los commitments se calculan off-chain. El contrato nunca ve PII.
contract IdentitySBT is ERC721, ICitizenRegistry, IERC5192 {
    uint256 private _nextId = 1;

    mapping(uint256 => bytes32) public dniOf;        // tokenId => dniHash
    mapping(address => uint256) public tokenOfOwner; // holder => tokenId
    mapping(bytes32 => bool) public usedDni;
    mapping(bytes32 => bool) public usedFace;

    event CedulaMinted(
        address indexed holder, uint256 indexed tokenId, bytes32 dniHash, bytes32 faceCommitment
    );

    constructor() ERC721("Cedula Civica", "CEDULA") {}

    /// @notice Mintea la Cédula del llamante. Una sola vez por persona.
    function mint(bytes32 dniHash, bytes32 faceCommitment, string calldata uri)
        external
        returns (uint256 tokenId)
    {
        require(dniHash != bytes32(0), "Identity: dni cero");
        require(faceCommitment != bytes32(0), "Identity: face cero");
        require(balanceOf(msg.sender) == 0, "Identity: ya tenes cedula");
        require(!usedDni[dniHash], "Identity: dni ya usado");
        require(!usedFace[faceCommitment], "Identity: rostro ya usado");

        tokenId = _nextId++;
        usedDni[dniHash] = true;
        usedFace[faceCommitment] = true;
        dniOf[tokenId] = dniHash;
        tokenOfOwner[msg.sender] = tokenId;

        _safeMint(msg.sender, tokenId);
        _tokenURIs[tokenId] = uri;

        emit CedulaMinted(msg.sender, tokenId, dniHash, faceCommitment);
        emit Locked(tokenId);
    }

    /// @notice El holder puede quemar su Cédula (derecho al olvido). Libera la address
    ///         pero NO libera los commitments (no re-registro con mismo DNI/rostro).
    function burn(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Identity: no sos el holder");
        delete tokenOfOwner[msg.sender];
        delete dniOf[tokenId];
        _burn(tokenId);
    }

    // ---- tokenURI mínimo (sin depender de ERC721URIStorage) ----
    mapping(uint256 => string) private _tokenURIs;

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _tokenURIs[tokenId];
    }

    // ---- ICitizenRegistry ----
    function isRegistered(address citizen) external view returns (bool) {
        return balanceOf(citizen) > 0;
    }

    function hashOf(address citizen) external view returns (bytes32) {
        return dniOf[tokenOfOwner[citizen]];
    }

    /// @dev `register(bytes32)` de ICitizenRegistry queda deshabilitado: el alta es vía mint().
    function register(bytes32) external pure {
        revert("Identity: usa mint()");
    }

    // ---- ERC-5192 ----
    function locked(uint256 tokenId) external view returns (bool) {
        _requireOwned(tokenId);
        return true;
    }

    // ---- Soulbound: bloquear transferencias (permitir mint y burn) ----
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        require(from == address(0) || to == address(0), "Identity: soulbound (no transferible)");
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == type(IERC5192).interfaceId || super.supportsInterface(interfaceId);
    }
}
```
- [ ] **Step 2: Compilar**

Run: `cd blockchain && pnpm hardhat compile`
Expected: compila sin errores.
- [ ] **Step 3: Correr el test A.3**

Run: `cd blockchain && pnpm hardhat test test/IdentitySBT.test.ts`
Expected: PASS (1 passing).
- [ ] **Step 4: Commit**
```bash
git add blockchain/contracts/IdentitySBT.sol blockchain/test/IdentitySBT.test.ts
git commit -m "feat(A): IdentitySBT soulbound + mint feliz (test verde)"
```

### Task A.5: Tests — unicidad dual + segunda cédula

**Files:** Modify `blockchain/test/IdentitySBT.test.ts`

- [ ] **Step 1: Agregar tests que fallan**
```typescript
  it("revierte si el dniHash ya fue usado por otra address", async () => {
    const sbt = await viem.deployContract("IdentitySBT");
    const [, w2] = await viem.getWalletClients();
    await sbt.write.mint([DNI, FACE, URI]);
    const asW2 = await viem.getContractAt("IdentitySBT", sbt.address, { client: { wallet: w2 } });
    const otherFace = ("0x" + "cc".repeat(32)) as `0x${string}`;
    await expect(asW2.write.mint([DNI, otherFace, URI])).to.be.rejected;
  });

  it("revierte si el faceCommitment ya fue usado", async () => {
    const sbt = await viem.deployContract("IdentitySBT");
    const [, w2] = await viem.getWalletClients();
    await sbt.write.mint([DNI, FACE, URI]);
    const asW2 = await viem.getContractAt("IdentitySBT", sbt.address, { client: { wallet: w2 } });
    const otherDni = ("0x" + "dd".repeat(32)) as `0x${string}`;
    await expect(asW2.write.mint([otherDni, FACE, URI])).to.be.rejected;
  });

  it("revierte si la misma address intenta una segunda Cédula", async () => {
    const sbt = await viem.deployContract("IdentitySBT");
    await sbt.write.mint([DNI, FACE, URI]);
    const d2 = ("0x" + "ee".repeat(32)) as `0x${string}`;
    const f2 = ("0x" + "ff".repeat(32)) as `0x${string}`;
    await expect(sbt.write.mint([d2, f2, URI])).to.be.rejected;
  });

  it("revierte mint con dni o face cero", async () => {
    const sbt = await viem.deployContract("IdentitySBT");
    const zero = ("0x" + "00".repeat(32)) as `0x${string}`;
    await expect(sbt.write.mint([zero, FACE, URI])).to.be.rejected;
    await expect(sbt.write.mint([DNI, zero, URI])).to.be.rejected;
  });
```
- [ ] **Step 2: Correr**

Run: `cd blockchain && pnpm hardhat test test/IdentitySBT.test.ts`
Expected: PASS (todos verdes — la lógica de A.4 ya los cubre).
- [ ] **Step 3: Commit**
```bash
git add blockchain/test/IdentitySBT.test.ts
git commit -m "test(A): unicidad dual dni/face + segunda cédula + ceros"
```

### Task A.6: Tests — soulbound (transfer revierte) + compat ICitizenRegistry con Vote

**Files:** Modify `blockchain/test/IdentitySBT.test.ts`

- [ ] **Step 1: Agregar tests**
```typescript
  it("revierte cualquier transferencia (soulbound)", async () => {
    const sbt = await viem.deployContract("IdentitySBT");
    const [w1, w2] = await viem.getWalletClients();
    await sbt.write.mint([DNI, FACE, URI]);
    await expect(
      sbt.write.transferFrom([w1.account.address, w2.account.address, 1n])
    ).to.be.rejected;
  });

  it("permite que el holder queme su Cédula", async () => {
    const sbt = await viem.deployContract("IdentitySBT");
    const [w] = await viem.getWalletClients();
    await sbt.write.mint([DNI, FACE, URI]);
    await sbt.write.burn([1n]);
    expect(await sbt.read.isRegistered([w.account.address])).to.equal(false);
  });

  it("Vote.sol acepta a un holder de Cédula vía ICitizenRegistry", async () => {
    const sbt = await viem.deployContract("IdentitySBT");
    const now = BigInt(Math.floor(Date.now() / 1000));
    const vote = await viem.deployContract("Vote", [
      sbt.address, "Reforma art. 56", "Qm...", now - 10n, now + 3600n,
    ]);
    await sbt.write.mint([DNI, FACE, URI]);
    await vote.write.castVote([1n, 0]); // Choice.Yes
    const [yes] = await vote.read.tally([1n]);
    expect(yes).to.equal(1n);
  });
```
- [ ] **Step 2: Correr toda la suite del contrato**

Run: `cd blockchain && pnpm hardhat test test/IdentitySBT.test.ts`
Expected: PASS (todos).
- [ ] **Step 3: Correr la suite completa (no romper Vote/CitizenRegistry)**

Run: `cd blockchain && pnpm test`
Expected: PASS — todo verde.
- [ ] **Step 4: Commit**
```bash
git add blockchain/test/IdentitySBT.test.ts
git commit -m "test(A): soulbound transfer revierte + burn + compat Vote"
```

### Task A.7: solhint sobre el contrato nuevo

- [ ] **Step 1: Correr el linter**

Run: `cd blockchain && pnpm scan`
Expected: sin errores nuevos sobre `IdentitySBT.sol` (warnings de estilo aceptables; corregir errores).
- [ ] **Step 2: Commit (si hubo ajustes)**
```bash
git add blockchain/contracts/IdentitySBT.sol
git commit -m "style(A): solhint sobre IdentitySBT"
```

### Task A.8: Deploy script + regenerar ABIs a `shared/`

**Files:** Modify `blockchain/scripts/deploy.ts`, Create `shared/abis/IdentitySBT.json`, Modify `frontend/civicsys/lib/abi/*` + `localhost.json`

- [ ] **Step 1:** Modificar `deploy.ts` para desplegar `IdentitySBT` y construir `Vote` apuntando a `sbt.address` (en vez de `CitizenRegistry`). Escribir la address de `IdentitySBT` en el deployment JSON (`contracts.IdentitySBT` + mantener `CitizenRegistry` por compat si aún se usa). Copiar la ABI a `shared/abis/IdentitySBT.json` y a `frontend/civicsys/lib/abi/IdentitySBT.json`. Seguir el patrón existente del script.
- [ ] **Step 2: Levantar Anvil y desplegar**

Run (con Anvil corriendo via `docker compose -f infra/docker-compose.yml up -d`):
`cd blockchain && pnpm hardhat run scripts/deploy.ts --network localhost`
Expected: imprime address de IdentitySBT + Vote; escribe deployment JSON.
- [ ] **Step 3: Commit**
```bash
git add blockchain/scripts/deploy.ts shared/abis/IdentitySBT.json frontend/civicsys/lib/abi
git commit -m "feat(A): deploy IdentitySBT + Vote sobre él + ABIs a shared/frontend"
```

---

## Block B — `shared/` tipos + schemas

### Task B.1: Tipos `Cedula` + `FaceDedupeResult`

**Files:** Modify `shared/types/index.ts`

- [ ] **Step 1: Agregar al final del archivo**
```typescript
/** Cédula Cívica (NFT soulbound) tal como se lee on-chain. */
export interface Cedula {
  tokenId: bigint;
  holder: Address;
  dniHash: Bytes32;
  faceCommitment: Bytes32;
  mintedAt: string;
}

/** Resultado del dedupe facial de Hermes. */
export interface FaceDedupeResult {
  duplicate: boolean;
  similarity: number;
  topMatch: Bytes32 | null;
}
```
- [ ] **Step 2: Typecheck**

Run: `cd shared && pnpm -w exec tsc --noEmit` (o el script de typecheck del repo)
Expected: sin errores.
- [ ] **Step 3: Commit**
```bash
git add shared/types/index.ts
git commit -m "feat(B): tipos Cedula y FaceDedupeResult en shared"
```

### Task B.2: Zod schemas de los endpoints nuevos

**Files:** Modify `shared/schemas/zod.ts`

- [ ] **Step 1: Agregar schemas** (ajustar import de `z` al estilo del archivo)
```typescript
import { z } from "zod";

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
  faceCommitment: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

export const backupEmailSchema = z.object({
  to: z.string().email(),
  encryptedKeystore: z.string().min(1),
});
```
- [ ] **Step 2: Typecheck + commit**
```bash
cd shared && pnpm -w exec tsc --noEmit
git add shared/schemas/zod.ts
git commit -m "feat(B): zod schemas dedupe/register-face/backup"
```

---

## Block C — Agents: dedupe facial (Hermes)

### Task C.1: Test — `FaceIndex` cosine

**Files:** Create `agents/tests/test_face_index.py`

- [ ] **Step 1: Escribir el test que falla**
```python
from app.face_index import FaceIndex, cosine_similarity


def test_cosine_identicos_es_1():
    v = [0.0] * 384
    v[0] = 1.0
    assert abs(cosine_similarity(v, v) - 1.0) < 1e-9


def test_index_detecta_duplicado_por_umbral():
    idx = FaceIndex(threshold=0.92)
    base = [0.0] * 384
    base[0] = 1.0
    idx.add(base, "0x" + "ab" * 32)

    res = idx.query(base)
    assert res.duplicate is True
    assert res.similarity > 0.99
    assert res.top_match == "0x" + "ab" * 32


def test_index_no_duplica_vector_distinto():
    idx = FaceIndex(threshold=0.92)
    a = [0.0] * 384; a[0] = 1.0
    b = [0.0] * 384; b[1] = 1.0
    idx.add(a, "0x" + "11" * 32)
    res = idx.query(b)
    assert res.duplicate is False


def test_index_vacio_no_duplica():
    idx = FaceIndex(threshold=0.92)
    v = [0.0] * 384; v[0] = 1.0
    res = idx.query(v)
    assert res.duplicate is False
    assert res.top_match is None
```
- [ ] **Step 2: Verificar que falla**

Run: `cd agents && ./.venv/Scripts/python.exe -m pytest tests/test_face_index.py -v`
Expected: FAIL — `app.face_index` no existe.

### Task C.2: Implementar `FaceIndex`

**Files:** Create `agents/app/face_index.py`

- [ ] **Step 1: Implementar**
```python
"""
FaceIndex: índice de embeddings faciales con similitud coseno.

Sprint 03: implementación in-memory para el dedupe del registro. La interfaz
(add/query) está pensada para respaldarse luego con pgvector (ADR-008) sin
cambiar los callers. NO almacena imágenes — solo el embedding derivado.
"""

from __future__ import annotations

import math
from dataclasses import dataclass


def cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0.0 or nb == 0.0:
        return 0.0
    return dot / (na * nb)


@dataclass
class DedupeResult:
    duplicate: bool
    similarity: float
    top_match: str | None


class FaceIndex:
    def __init__(self, threshold: float = 0.92):
        self.threshold = threshold
        self._items: list[tuple[list[float], str]] = []  # (embedding, faceCommitment)

    def add(self, embedding: list[float], face_commitment: str) -> None:
        # idempotente por commitment
        if any(fc == face_commitment for _, fc in self._items):
            return
        self._items.append((list(embedding), face_commitment))

    def query(self, embedding: list[float]) -> DedupeResult:
        best_sim = 0.0
        best_fc: str | None = None
        for emb, fc in self._items:
            sim = cosine_similarity(embedding, emb)
            if sim > best_sim:
                best_sim, best_fc = sim, fc
        return DedupeResult(
            duplicate=best_fc is not None and best_sim >= self.threshold,
            similarity=round(best_sim, 6),
            top_match=best_fc if best_sim >= self.threshold else None,
        )
```
- [ ] **Step 2: Correr el test**

Run: `cd agents && ./.venv/Scripts/python.exe -m pytest tests/test_face_index.py -v`
Expected: PASS (4 passing).
- [ ] **Step 3: Commit**
```bash
git add agents/app/face_index.py agents/tests/test_face_index.py
git commit -m "feat(C): FaceIndex cosine in-memory (pgvector-ready) + tests"
```

### Task C.3: Test — servicio `identity` (dedupe + register)

**Files:** Create `agents/tests/test_identity.py`

- [ ] **Step 1: Escribir el test que falla**
```python
from app.identity import IdentityService


def _vec(i: int) -> list[float]:
    v = [0.0] * 384
    v[i] = 1.0
    return v


def test_register_y_dedupe():
    svc = IdentityService(threshold=0.92)
    fc = "0x" + "ab" * 32
    svc.register_face(_vec(0), fc)

    dup = svc.dedupe(_vec(0))
    assert dup.duplicate is True
    assert dup.top_match == fc

    distinto = svc.dedupe(_vec(5))
    assert distinto.duplicate is False


def test_register_idempotente_por_commitment():
    svc = IdentityService()
    fc = "0x" + "cd" * 32
    svc.register_face(_vec(1), fc)
    svc.register_face(_vec(1), fc)  # repetido, no duplica
    assert len(svc.index._items) == 1


def test_threshold_override_en_dedupe():
    svc = IdentityService(threshold=0.99)
    svc.register_face(_vec(0), "0x" + "11" * 32)
    # vector casi idéntico pero no exacto: con umbral alto no es duplicado
    almost = _vec(0)
    almost[1] = 0.3
    assert svc.dedupe(almost).duplicate is False
```
- [ ] **Step 2: Verificar que falla**

Run: `cd agents && ./.venv/Scripts/python.exe -m pytest tests/test_identity.py -v`
Expected: FAIL — `app.identity` no existe.

### Task C.4: Implementar `IdentityService`

**Files:** Create `agents/app/identity.py`

- [ ] **Step 1: Implementar**
```python
"""
IdentityService: dedupe facial del registro ciudadano (Hermes, off-chain).

Encapsula un FaceIndex. NO firma on-chain. NO guarda imágenes. Persiste solo
el embedding + el faceCommitment (idempotente). ADR-008.
"""

from __future__ import annotations

from app.face_index import DedupeResult, FaceIndex


class IdentityService:
    def __init__(self, threshold: float = 0.92):
        self.index = FaceIndex(threshold=threshold)

    def register_face(self, embedding: list[float], face_commitment: str) -> None:
        self.index.add(embedding, face_commitment)

    def dedupe(self, embedding: list[float]) -> DedupeResult:
        return self.index.query(embedding)
```
- [ ] **Step 2: Correr el test**

Run: `cd agents && ./.venv/Scripts/python.exe -m pytest tests/test_identity.py -v`
Expected: PASS (3 passing).
- [ ] **Step 3: Commit**
```bash
git add agents/app/identity.py agents/tests/test_identity.py
git commit -m "feat(C): IdentityService dedupe/register-face + tests"
```

### Task C.5: Endpoints `/agents/identity/*` en FastAPI

**Files:** Modify `agents/app/main.py`, Modify `agents/tests/test_main.py`

- [ ] **Step 1: Test que falla** — agregar a `agents/tests/test_main.py`
```python
def test_dedupe_face_endpoint():
    from fastapi.testclient import TestClient
    from app.main import app
    client = TestClient(app)

    emb = [0.0] * 384
    emb[0] = 1.0
    fc = "0x" + "ab" * 32
    # registrar primero
    r1 = client.post("/agents/identity/register-face",
                     json={"embedding": emb, "faceCommitment": fc})
    assert r1.status_code == 200
    # mismo embedding -> duplicado
    r2 = client.post("/agents/identity/dedupe-face", json={"embedding": emb})
    assert r2.status_code == 200
    body = r2.json()
    assert body["duplicate"] is True
    assert body["topMatch"] == fc
```
- [ ] **Step 2: Verificar que falla**

Run: `cd agents && ./.venv/Scripts/python.exe -m pytest tests/test_main.py::test_dedupe_face_endpoint -v`
Expected: FAIL — 404.
- [ ] **Step 3: Implementar en `main.py`** (módulo-level singleton para que register/dedupe compartan estado; agregar imports y modelos)
```python
from pydantic import BaseModel, Field
from app.identity import IdentityService

_identity = IdentityService()


class DedupeFaceRequest(BaseModel):
    embedding: list[float] = Field(min_length=384, max_length=384)
    threshold: float | None = None


class RegisterFaceRequest(BaseModel):
    embedding: list[float] = Field(min_length=384, max_length=384)
    faceCommitment: str


@app.post("/agents/identity/dedupe-face")
async def dedupe_face(req: DedupeFaceRequest):
    if req.threshold is not None:
        _identity.index.threshold = req.threshold
    res = _identity.dedupe(req.embedding)
    return {"duplicate": res.duplicate, "similarity": res.similarity, "topMatch": res.top_match}


@app.post("/agents/identity/register-face")
async def register_face(req: RegisterFaceRequest):
    _identity.register_face(req.embedding, req.faceCommitment)
    return {"ok": True}
```
- [ ] **Step 4: Correr el test + suite agents**

Run: `cd agents && ./.venv/Scripts/python.exe -m pytest -q`
Expected: PASS (toda la suite, incluido el nuevo).
- [ ] **Step 5: Commit**
```bash
git add agents/app/main.py agents/tests/test_main.py
git commit -m "feat(C): endpoints /agents/identity/dedupe-face + register-face"
```

---

## Block D — Backend: relay de backup por email (tRPC)

### Task D.1: Servicio de email pluggable

**Files:** Create `backend/src/services/email.service.ts`

- [ ] **Step 1: Implementar provider mock + interfaz** (en dev loguea; real detrás de env)
```typescript
/**
 * EmailService: reenvía backups cifrados. NUNCA descifra ni persiste la clave.
 * Provider pluggable: en dev usa consola; en prod, un provider real detrás de env.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

export interface EmailProvider {
  send(msg: EmailMessage): Promise<void>;
}

export class ConsoleEmailProvider implements EmailProvider {
  async send(msg: EmailMessage): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`[email:mock] to=${msg.to} subject="${msg.subject}" bytes=${msg.body.length}`);
  }
}

export function getEmailProvider(): EmailProvider {
  // Sprint 03: solo consola. Real (Resend/nodemailer) se enchufa acá vía env.
  return new ConsoleEmailProvider();
}
```
- [ ] **Step 2: Commit**
```bash
git add backend/src/services/email.service.ts
git commit -m "feat(D): EmailService pluggable (console provider)"
```

### Task D.2: Test — router `backup`

**Files:** Create `backend/src/routers/backup.test.ts`

- [ ] **Step 1: Escribir el test que falla**
```typescript
import { describe, it, expect, vi } from "vitest";
import { backup } from "./backup";
import * as emailModule from "../services/email.service";

describe("backup router", () => {
  it("reenvía el blob cifrado sin descifrarlo", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(emailModule, "getEmailProvider").mockReturnValue({ send });

    const caller = backup.createCaller({});
    const blob = JSON.stringify({ version: 3, crypto: { ciphertext: "deadbeef" } });
    const res = await caller.email({ to: "ana@example.com", encryptedKeystore: blob });

    expect(res.ok).toBe(true);
    expect(send).toHaveBeenCalledOnce();
    const msg = send.mock.calls[0][0];
    expect(msg.to).toBe("ana@example.com");
    expect(msg.body).toContain("deadbeef"); // pasa el blob tal cual (no descifra)
  });

  it("rechaza email inválido", async () => {
    const caller = backup.createCaller({});
    await expect(
      caller.email({ to: "no-es-email", encryptedKeystore: "x" })
    ).rejects.toThrow();
  });
});
```
- [ ] **Step 2: Verificar que falla**

Run: `cd backend && pnpm test backup`
Expected: FAIL — `./backup` no existe.

### Task D.3: Implementar router `backup` + montarlo

**Files:** Create `backend/src/routers/backup.ts`, Modify `backend/src/routers/_app.ts`

- [ ] **Step 1: Crear el router** (seguir patrón de `citizens.ts`)
```typescript
import { z } from "zod";
import { publicProcedure, router } from "../context/trpc";
import { getEmailProvider } from "../services/email.service";

export const backup = router({
  email: publicProcedure
    .input(
      z.object({
        to: z.string().email(),
        encryptedKeystore: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const provider = getEmailProvider();
      await provider.send({
        to: input.to,
        subject: "Tu respaldo cifrado de Cédula Cívica",
        // El cuerpo lleva el blob CIFRADO tal cual. El backend nunca descifra.
        body:
          "Adjuntamos tu respaldo cifrado. Solo tu contraseña puede abrirlo.\n\n" +
          input.encryptedKeystore,
      });
      return { ok: true };
    }),
});
```
- [ ] **Step 2: Montar en `_app.ts`** — importar `backup` y agregarlo al `router({ ... })` raíz junto a `citizens`, `proposals`, `reports`.
- [ ] **Step 3: Correr test + suite backend**

Run: `cd backend && pnpm test`
Expected: PASS (incluido backup).
- [ ] **Step 4: Commit**
```bash
git add backend/src/routers/backup.ts backend/src/routers/backup.test.ts backend/src/routers/_app.ts
git commit -m "feat(D): router tRPC backup.email (relay sin descifrar) + tests"
```

---

## Block E — Frontend: wallet + crypto + embedding (libs puras, fáciles de testear)

> Antes de empezar: leer `frontend/civicsys/node_modules/next/dist/docs/` (AGENTS.md). Estas libs son agnósticas de Next pero el resto del bloque toca componentes.

### Task E.1: Test — generación de wallet

**Files:** Create `frontend/civicsys/lib/wallet.test.ts`

- [ ] **Step 1: Test que falla**
```typescript
import { describe, it, expect } from "vitest";
import { createWallet } from "./wallet";

describe("createWallet", () => {
  it("genera una private key y su address", () => {
    const w = createWallet();
    expect(w.privateKey).toMatch(/^0x[0-9a-f]{64}$/);
    expect(w.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it("genera wallets distintas en llamadas sucesivas", () => {
    expect(createWallet().privateKey).not.toBe(createWallet().privateKey);
  });
});
```
- [ ] **Step 2: Verificar que falla**

Run: `cd frontend/civicsys && pnpm test:run wallet`
Expected: FAIL — `./wallet` no existe.

### Task E.2: Implementar `wallet.ts`

**Files:** Create `frontend/civicsys/lib/wallet.ts`

- [ ] **Step 1: Implementar con viem**
```typescript
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

export interface GeneratedWallet {
  privateKey: `0x${string}`;
  address: `0x${string}`;
}

/** Genera una wallet no-custodial. La clave vive solo en memoria del navegador. */
export function createWallet(): GeneratedWallet {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return { privateKey, address: account.address };
}
```
- [ ] **Step 2: Test verde + commit**
```bash
cd frontend/civicsys && pnpm test:run wallet
git add frontend/civicsys/lib/wallet.ts frontend/civicsys/lib/wallet.test.ts
git commit -m "feat(E): createWallet no-custodial (viem) + tests"
```

### Task E.3: Test — keystore cifrar/descifrar (round-trip)

**Files:** Create `frontend/civicsys/lib/keystore.test.ts`

- [ ] **Step 1: Test que falla** (round-trip + contraseña incorrecta)
```typescript
import { describe, it, expect } from "vitest";
import { encryptKey, decryptKey } from "./keystore";

const PK = ("0x" + "11".repeat(32)) as `0x${string}`;

describe("keystore", () => {
  it("cifra y descifra con la contraseña correcta", async () => {
    const blob = await encryptKey(PK, "clave-segura-123");
    expect(blob).toContain("ciphertext");
    const back = await decryptKey(blob, "clave-segura-123");
    expect(back).toBe(PK);
  });

  it("falla con contraseña incorrecta", async () => {
    const blob = await encryptKey(PK, "correcta");
    await expect(decryptKey(blob, "incorrecta")).rejects.toThrow();
  });
});
```
- [ ] **Step 2: Verificar que falla**

Run: `cd frontend/civicsys && pnpm test:run keystore`
Expected: FAIL — `./keystore` no existe.

### Task E.4: Implementar `keystore.ts` (Web Crypto: PBKDF2 + AES-GCM)

**Files:** Create `frontend/civicsys/lib/keystore.ts`

- [ ] **Step 1: Implementar** (jsdom de vitest expone `crypto.subtle`)
```typescript
/**
 * keystore: cifra/descifra la private key con la contraseña del ciudadano.
 * PBKDF2 (SHA-256, 150k iter) -> clave AES-GCM 256. El server nunca ve la clave.
 * ADR-007. Formato JSON propio (no keystore-v3 canónico — ver ADR).
 */
const ENC = new TextEncoder();
const DEC = new TextDecoder();

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", ENC.encode(password), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 150_000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptKey(privateKey: `0x${string}`, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, ENC.encode(privateKey));
  return JSON.stringify({
    version: 1,
    kdf: "PBKDF2-SHA256",
    iterations: 150_000,
    salt: toHex(salt.buffer),
    iv: toHex(iv.buffer),
    ciphertext: toHex(ct),
  });
}

export async function decryptKey(blob: string, password: string): Promise<`0x${string}`> {
  const o = JSON.parse(blob);
  const key = await deriveKey(password, fromHex(o.salt));
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromHex(o.iv) },
    key,
    fromHex(o.ciphertext)
  );
  return DEC.decode(pt) as `0x${string}`;
}
```
- [ ] **Step 2: Test verde**

Run: `cd frontend/civicsys && pnpm test:run keystore`
Expected: PASS (2 passing). Si jsdom no expone `crypto.subtle`, agregar en el setup de vitest `import { webcrypto } from "node:crypto"` y `globalThis.crypto = webcrypto` (documentar en el step).
- [ ] **Step 3: Commit**
```bash
git add frontend/civicsys/lib/keystore.ts frontend/civicsys/lib/keystore.test.ts
git commit -m "feat(E): keystore cifrado PBKDF2+AES-GCM (Web Crypto) + round-trip test"
```

### Task E.5: Test — embedding facial mock + commitment

**Files:** Create `frontend/civicsys/lib/face-embedding.test.ts`

- [ ] **Step 1: Test que falla**
```typescript
import { describe, it, expect } from "vitest";
import { embedFace, faceCommitment } from "./face-embedding";

describe("face-embedding", () => {
  it("genera 384 floats deterministas", async () => {
    const a = await embedFace(new Uint8Array([1, 2, 3]));
    const b = await embedFace(new Uint8Array([1, 2, 3]));
    expect(a).toHaveLength(384);
    expect(a).toEqual(b);
  });

  it("imágenes distintas -> embeddings distintos", async () => {
    const a = await embedFace(new Uint8Array([1, 2, 3]));
    const b = await embedFace(new Uint8Array([9, 9, 9]));
    expect(a).not.toEqual(b);
  });

  it("faceCommitment es un bytes32 hex", async () => {
    const e = await embedFace(new Uint8Array([1, 2, 3]));
    const c = faceCommitment(e, "salt-demo");
    expect(c).toMatch(/^0x[0-9a-f]{64}$/);
  });
});
```
- [ ] **Step 2: Verificar que falla**

Run: `cd frontend/civicsys && pnpm test:run face-embedding`
Expected: FAIL.

### Task E.6: Implementar `face-embedding.ts`

**Files:** Create `frontend/civicsys/lib/face-embedding.ts`

- [ ] **Step 1: Implementar** (mock determinista; mismas 384 dims que Python; commitment vía viem)
```typescript
import { keccak256, toHex } from "viem";

/**
 * Embedding facial MOCK (Sprint 03): determinista a partir de los bytes de la
 * imagen. NO es reconocimiento facial real (ADR-008). Dimensión 384 para casar
 * con agents/app/memory.py. Sustituible por face-api.js/MediaPipe en el futuro.
 */
export async function embedFace(imageBytes: Uint8Array): Promise<number[]> {
  const out: number[] = [];
  // Hash en cascada para 384 floats deterministas en [-1, 1].
  let seed = new Uint8Array(await crypto.subtle.digest("SHA-256", imageBytes));
  while (out.length < 384) {
    seed = new Uint8Array(await crypto.subtle.digest("SHA-256", seed));
    for (let i = 0; i + 4 <= seed.length && out.length < 384; i += 4) {
      const v = (seed[i] << 24) | (seed[i + 1] << 16) | (seed[i + 2] << 8) | seed[i + 3];
      out.push((v >>> 0) / 0xffffffff * 2 - 1);
    }
  }
  return out;
}

/** Commitment on-chain del rostro: keccak256(embedding_redondeado || salt). */
export function faceCommitment(embedding: number[], salt: string): `0x${string}` {
  const payload = embedding.map((x) => x.toFixed(6)).join(",") + "|" + salt;
  return keccak256(toHex(payload));
}
```
- [ ] **Step 2: Test verde + commit**
```bash
cd frontend/civicsys && pnpm test:run face-embedding
git add frontend/civicsys/lib/face-embedding.ts frontend/civicsys/lib/face-embedding.test.ts
git commit -m "feat(E): embedding facial mock determinista + faceCommitment + tests"
```

### Task E.7: `identity-api.ts` — cliente de dedupe a Hermes

**Files:** Create `frontend/civicsys/lib/identity-api.ts`

- [ ] **Step 1: Implementar** (fetch directo a Hermes, como hace el resto del front)
```typescript
const HERMES_URL = process.env.NEXT_PUBLIC_HERMES_URL ?? "http://localhost:8000";

export interface DedupeResult {
  duplicate: boolean;
  similarity: number;
  topMatch: string | null;
}

export async function dedupeFace(embedding: number[]): Promise<DedupeResult> {
  const r = await fetch(`${HERMES_URL}/agents/identity/dedupe-face`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ embedding }),
  });
  if (!r.ok) throw new Error(`Hermes dedupe falló: ${r.status}`);
  return r.json();
}

export async function registerFace(embedding: number[], faceCommitment: string): Promise<void> {
  const r = await fetch(`${HERMES_URL}/agents/identity/register-face`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ embedding, faceCommitment }),
  });
  if (!r.ok) throw new Error(`Hermes register-face falló: ${r.status}`);
}
```
- [ ] **Step 2: Commit**
```bash
git add frontend/civicsys/lib/identity-api.ts
git commit -m "feat(E): cliente identity-api (dedupe/register a Hermes)"
```

### Task E.8: Exportar `IdentitySBTAbi`

**Files:** Modify `frontend/civicsys/lib/contracts.ts`

- [ ] **Step 1:** Importar `IdentitySBTArtifact from "./abi/IdentitySBT.json"` y exportar `export const IdentitySBTAbi = IdentitySBTArtifact.abi;`. Agregar `IdentitySBT` a la interfaz `DeploymentJson.contracts` y al getter.
- [ ] **Step 2: Typecheck + commit**
```bash
cd frontend/civicsys && pnpm exec tsc --noEmit
git add frontend/civicsys/lib/contracts.ts
git commit -m "feat(E): exportar IdentitySBTAbi + address en contracts.ts"
```

---

## Block F — Frontend: wizard de registro

> Leer `node_modules/next/dist/docs/` antes de tocar componentes (AGENTS.md). Todos los componentes son client components (`"use client"`).

### Task F.1: `WizardProvider` — máquina de pasos

**Files:** Create `frontend/civicsys/components/registro/WizardProvider.tsx`, Create `frontend/civicsys/components/registro/WizardProvider.test.tsx`

- [ ] **Step 1: Test que falla** (estado compartido + avance)
```tsx
import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { WizardProvider, useWizard } from "./WizardProvider";

function Probe() {
  const w = useWizard();
  return (
    <div>
      <span data-testid="step">{w.step}</span>
      <span data-testid="dni">{w.data.dniHash ?? "none"}</span>
      <button onClick={() => { w.set({ dniHash: "0xabc" }); w.next(); }}>go</button>
    </div>
  );
}

describe("WizardProvider", () => {
  it("arranca en 0 y avanza guardando data", () => {
    render(<WizardProvider><Probe /></WizardProvider>);
    expect(screen.getByTestId("step").textContent).toBe("0");
    act(() => { screen.getByText("go").click(); });
    expect(screen.getByTestId("step").textContent).toBe("1");
    expect(screen.getByTestId("dni").textContent).toBe("0xabc");
  });
});
```
- [ ] **Step 2: Verificar que falla**

Run: `cd frontend/civicsys && pnpm test:run WizardProvider`
Expected: FAIL.
- [ ] **Step 3: Implementar**
```tsx
"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export interface WizardData {
  dni?: string;
  dniHash?: `0x${string}`;
  embedding?: number[];
  faceCommitment?: `0x${string}`;
  address?: `0x${string}`;
  privateKey?: `0x${string}`;
  tokenId?: bigint;
}

interface WizardCtx {
  step: number;
  data: WizardData;
  set: (patch: Partial<WizardData>) => void;
  next: () => void;
  back: () => void;
  reset: () => void;
}

const Ctx = createContext<WizardCtx | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>({});
  const set = (patch: Partial<WizardData>) => setData((d) => ({ ...d, ...patch }));
  const next = () => setStep((s) => Math.min(s + 1, 4));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const reset = () => { setStep(0); setData({}); };
  return <Ctx.Provider value={{ step, data, set, next, back, reset }}>{children}</Ctx.Provider>;
}

export function useWizard(): WizardCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useWizard fuera de WizardProvider");
  return c;
}
```
- [ ] **Step 4: Test verde + commit**
```bash
cd frontend/civicsys && pnpm test:run WizardProvider
git add frontend/civicsys/components/registro/WizardProvider.tsx frontend/civicsys/components/registro/WizardProvider.test.tsx
git commit -m "feat(F): WizardProvider (máquina de pasos del registro) + test"
```

### Task F.2: `StepDniCapture`

**Files:** Create `frontend/civicsys/components/registro/StepDniCapture.tsx`, Create test `...StepDniCapture.test.tsx`

- [ ] **Step 1: Test que falla** — al ingresar 8 dígitos y confirmar, llama `set({dni, dniHash})` y `next()`. (Mockear `computeDniHash` y `useWizard`.)
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const set = vi.fn(); const next = vi.fn();
vi.mock("./WizardProvider", () => ({ useWizard: () => ({ set, next, data: {} }) }));
vi.stubEnv("NEXT_PUBLIC_PUBLIC_SALT", "0123456789abcdef0123");

import { StepDniCapture } from "./StepDniCapture";

describe("StepDniCapture", () => {
  it("hashea el DNI y avanza", () => {
    render(<StepDniCapture />);
    fireEvent.change(screen.getByLabelText(/DNI/i), { target: { value: "12345678" } });
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ dni: "12345678" }));
    expect(next).toHaveBeenCalled();
  });
});
```
- [ ] **Step 2: Verificar que falla**, luego **Step 3: implementar** el componente: input numérico (8 dígitos, reusar la validación de `RegisterCitizenForm.tsx`), botón "Continuar" deshabilitado hasta válido; calcula `computeDniHash(dni, SALT)`; `set({dni, dniHash}); next()`. Mensaje si falta `NEXT_PUBLIC_PUBLIC_SALT` (≥16). Simula "OCR" con un texto "Detectado del documento (editable)".
- [ ] **Step 4: Test verde + commit**
```bash
cd frontend/civicsys && pnpm test:run StepDniCapture
git add frontend/civicsys/components/registro/StepDniCapture.tsx frontend/civicsys/components/registro/StepDniCapture.test.tsx
git commit -m "feat(F): StepDniCapture (OCR mock + dniHash) + test"
```

### Task F.3: `StepFaceCapture`

**Files:** Create `...StepFaceCapture.tsx` + test

- [ ] **Step 1: Test que falla** — al "tomar selfie" (botón que provee bytes mock) genera embedding+commitment y `set(...) + next()`. Mockear `embedFace`/`faceCommitment` y `useWizard`.
- [ ] **Step 2: falla → Step 3: implementar** — botón "Tomar selfie" (en demo, usa una imagen fija → `Uint8Array`); muestra prompt de liveness ("parpadeá"); `const emb = await embedFace(bytes); const fc = faceCommitment(emb, SALT); set({embedding: emb, faceCommitment: fc}); next();`. Estado de carga mientras calcula.
- [ ] **Step 4: Test verde + commit**
```bash
cd frontend/civicsys && pnpm test:run StepFaceCapture
git add frontend/civicsys/components/registro/StepFaceCapture.tsx frontend/civicsys/components/registro/StepFaceCapture.test.tsx
git commit -m "feat(F): StepFaceCapture (selfie + liveness mock + embedding) + test"
```

### Task F.4: `StepVerify` (match + dedupe Hermes)

**Files:** Create `...StepVerify.tsx` + test

- [ ] **Step 1: Test que falla** — dos casos: (a) `dedupeFace` retorna `duplicate:false` → muestra "verificado" y permite continuar; (b) `duplicate:true` → muestra bloqueo y NO llama `next`. Mockear `identity-api`.
- [ ] **Step 2: falla → Step 3: implementar** — al montar (o al click "Verificar"): muestra match DNI↔cara mock (score fijo p.ej. 98%) + llama `dedupeFace(data.embedding!)`. Si `duplicate` → banner rojo "Ya existe un registro con este rostro. No se permite doble registro." y botón deshabilitado. Si no → "Identidad verificada ✓" + `next()` habilitado.
- [ ] **Step 4: Test verde + commit**
```bash
cd frontend/civicsys && pnpm test:run StepVerify
git add frontend/civicsys/components/registro/StepVerify.tsx frontend/civicsys/components/registro/StepVerify.test.tsx
git commit -m "feat(F): StepVerify (match mock + dedupe Hermes, bloqueo doble) + test"
```

### Task F.5: `StepWallet` (no-custodial + backup)

**Files:** Create `...StepWallet.tsx` + test

- [ ] **Step 1: Test que falla** — al generar wallet + ingresar contraseña + "Crear y respaldar": llama `createWallet`, `encryptKey`, muestra la address, y `set({address, privateKey}); next()`. Mockear `wallet`, `keystore`, y el cliente tRPC de backup (o `fetch`).
- [ ] **Step 2: falla → Step 3: implementar** —
  - `const w = createWallet()` (al montar, en estado).
  - Muestra `w.address` (pública). Advertencia: "Tu clave privada NUNCA se envía al servidor."
  - Input contraseña (mín 8). Botones: "Descargar respaldo cifrado" (genera `encryptKey` → descarga `.json`) y opcional "Enviar a mi email" (input email → mutation `backup.email` con el blob). 
  - Checkbox "Guardé mi respaldo" obligatorio para `next()`.
  - `set({ address: w.address, privateKey: w.privateKey }); next();`
- [ ] **Step 4: Test verde + commit**
```bash
cd frontend/civicsys && pnpm test:run StepWallet
git add frontend/civicsys/components/registro/StepWallet.tsx frontend/civicsys/components/registro/StepWallet.test.tsx
git commit -m "feat(F): StepWallet (wallet no-custodial + backup cifrado) + test"
```

### Task F.6: `StepMint` + `CedulaCard`

**Files:** Create `...StepMint.tsx`, `...CedulaCard.tsx` + test de CedulaCard

- [ ] **Step 1: Test que falla (CedulaCard)** — renderiza tokenId, address abreviada y estado "Verificada · Soulbound".
- [ ] **Step 2: falla → Step 3: implementar**
  - `CedulaCard`: tarjeta presentacional (props `tokenId`, `holder`, `mintedAt`). Estética acorde al tema verde fósforo existente.
  - `StepMint`: construye un `walletClient` de viem con `privateKeyToAccount(data.privateKey!)` sobre `anvilLocal`; arma `tokenURI` data-URI con metadata SIN PII (`{verificado:true, nivel:"mock", emitido:<iso>, dniHash, faceCommitment}`); llama `writeContract` a `IdentitySBT.mint([dniHash, faceCommitment, uri])`; tras éxito, `registerFace(embedding, faceCommitment)` (Hermes) y muestra `CedulaCard` + link al explorer (si `chainId` lo tiene). Maneja error de revert mostrando el motivo.
- [ ] **Step 4: Test verde + commit**
```bash
cd frontend/civicsys && pnpm test:run CedulaCard
git add frontend/civicsys/components/registro/StepMint.tsx frontend/civicsys/components/registro/CedulaCard.tsx frontend/civicsys/components/registro/CedulaCard.test.tsx
git commit -m "feat(F): StepMint (mint Cédula + registerFace) + CedulaCard + test"
```

### Task F.7: Montar el wizard en `/registro`

**Files:** Modify `frontend/civicsys/app/registro/page.tsx`

- [ ] **Step 1: Implementar** — envolver en `<WizardProvider>` y renderizar el paso según `useWizard().step` (0→Dni,1→Face,2→Verify,3→Wallet,4→Mint) con un stepper visual e indicador de progreso. Mantener header/NetworkBadge/ConnectWalletButton existentes. Reemplaza el `RegisterCitizenForm` simple. (Crear un pequeño `WizardSteps.tsx` client que haga el switch, ya que `page.tsx` puede quedar server-component montando el provider + un client switch.)
- [ ] **Step 2: Verificar build**

Run: `cd frontend/civicsys && pnpm build`
Expected: build OK.
- [ ] **Step 3: Commit**
```bash
git add frontend/civicsys/app/registro/page.tsx frontend/civicsys/components/registro/WizardSteps.tsx
git commit -m "feat(F): wizard de registro multi-paso montado en /registro"
```

### Task F.8: Suite frontend completa + coverage

- [ ] **Step 1: Correr toda la suite con coverage**

Run: `cd frontend/civicsys && pnpm test:ci`
Expected: PASS, coverage ≥80% statements. Si baja, agregar tests de los componentes faltantes (StepFaceCapture, StepWallet, StepMint render paths).
- [ ] **Step 2: Commit (si se agregaron tests)**
```bash
git add frontend/civicsys
git commit -m "test(F): elevar coverage del wizard ≥80%"
```

---

## Block G — Esqueletos de los otros 3 subsistemas (no funcionales)

### Task G.1: `AnonymousVote.sol` stub

**Files:** Create `blockchain/contracts/AnonymousVote.sol`

- [ ] **Step 1: Crear stub documentado** (compila, sin lógica real)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title AnonymousVote — ESQUELETO (Sprint 04, no funcional)
/// @notice Voto anónimo 1-persona-1-voto vía nullifier (ver ADR-009). El nullifier
///         se deriva de la identidad y evita el doble voto sin revelar al votante.
/// @dev NO IMPLEMENTADO. Las funciones revierten. Placeholder de interfaz.
contract AnonymousVote {
    mapping(bytes32 => bool) public nullifierUsed;

    error NotImplemented();

    /// @param nullifier marca única derivada de la identidad para (votante, propuesta)
    function castAnonymous(uint256 /*proposalId*/, uint8 /*choice*/, bytes32 nullifier, bytes calldata /*proof*/) external {
        nullifier; // silenciar warning
        revert NotImplemented();
    }
}
```
- [ ] **Step 2: Compila + commit**
```bash
cd blockchain && pnpm hardhat compile
git add blockchain/contracts/AnonymousVote.sol
git commit -m "feat(G): AnonymousVote stub (Sprint 04, no funcional)"
```

### Task G.2: Esqueleto Hermes multicanal

**Files:** Create `agents/app/channels/__init__.py`, `base.py`, `telegram.py`, `discord.py`, `whatsapp.py`, `README.md`

- [ ] **Step 1: `base.py`** — interfaz común
```python
"""Canales de Hermes Registro (ESQUELETO Sprint 05, no funcional)."""

from __future__ import annotations

from typing import Protocol


class Channel(Protocol):
    """Canal de mensajería para recibir peticiones de registro y bloquear dobles."""

    name: str

    async def receive(self) -> dict:
        """Recibe una petición entrante. NO IMPLEMENTADO en Sprint 03."""
        ...

    async def send(self, to: str, message: str) -> None:
        """Envía un mensaje. NO IMPLEMENTADO en Sprint 03."""
        ...

    async def verify_unique(self, person_ref: str) -> bool:
        """True si la persona NO está registrada (anti-doble). NO IMPLEMENTADO."""
        ...
```
- [ ] **Step 2: stubs** `telegram.py` / `discord.py` / `whatsapp.py` — cada uno una clase que implementa `Channel` con métodos que `raise NotImplementedError("Sprint 05")`. `README.md` con la arquitectura (un `Channel` por plataforma, dedupe compartido vía `IdentityService`/on-chain).
- [ ] **Step 3: Commit**
```bash
git add agents/app/channels
git commit -m "feat(G): esqueleto Hermes multicanal (Channel + stubs TG/Discord/WA)"
```

### Task G.3: `toxica.py` stub

**Files:** Create `agents/app/toxica.py`

- [ ] **Step 1: Crear stub** con la interfaz declarada
```python
"""
Hermes "La Tóxica" — ESQUELETO (Sprint 06, no funcional).

Compara lo que el congreso legisla (transcripción de video o lectura de
reportes de sesión) contra la votación ciudadana, y redacta un POST PÚBLICO
de accountability señalando la brecha. Decisión D8: posts públicos, no DMs.
Human-in-the-loop antes de publicar (ver ADR futuro). NO IMPLEMENTADO.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class GapReport:
    proposal_id: int
    citizen_position: str   # qué votó la ciudadanía
    congress_action: str    # qué hizo/propuso el congreso
    gap_summary: str        # la brecha detectada
    public_post: str        # borrador del post público (requiere aprobación humana)


class LaToxica:
    async def analyze_session(self, transcript_or_report: str, tally: dict) -> GapReport:
        """Analiza una sesión vs. la votación ciudadana. NO IMPLEMENTADO (Sprint 06)."""
        raise NotImplementedError("Sprint 06")
```
- [ ] **Step 2: Commit**
```bash
git add agents/app/toxica.py
git commit -m "feat(G): esqueleto Hermes La Tóxica (GapReport, Sprint 06)"
```

### Task G.4: Páginas placeholder

**Files:** Create `frontend/civicsys/app/votacion/page.tsx` (+ opcional enlaces de nav)

- [ ] **Step 1: Crear** `/votacion` con copy "Votación anónima — próximamente (Sprint 04)" explicando el modelo nullifier/ZK en lenguaje llano. Marcado claramente como no funcional. (Los otros dos subsistemas son backend; alcanza con esta página + los ADR/READMEs.)
- [ ] **Step 2: Build + commit**
```bash
cd frontend/civicsys && pnpm build
git add frontend/civicsys/app/votacion/page.tsx
git commit -m "feat(G): página placeholder /votacion (Sprint 04)"
```

---

## Block H — Integración, verificación y cierre AEGIS (State-Sync)

### Task H.1: Verificación end-to-end manual (demo)

- [ ] **Step 1:** Con stack arriba (`docker compose -f infra/docker-compose.yml up -d`, deploy, backend `pnpm dev`, agents uvicorn, frontend `pnpm dev`): recorrer el wizard completo en el navegador → wallet creada, Cédula minteada, link al explorer/anvil. Reintentar con el mismo DNI (otra wallet) → revert on-chain. Reintentar con el mismo rostro → bloqueo en `StepVerify`. Anotar resultados.
- [ ] **Step 2:** Documentar el recorrido en `docs/testing-localhost.md` (sección "Registro con Cédula Cívica").
- [ ] **Step 3: Commit**
```bash
git add docs/testing-localhost.md
git commit -m "docs(H): guía de verificación e2e del registro Cédula Cívica"
```

### Task H.2: Suite cross-stack verde

- [ ] **Step 1: Correr todo**
```bash
cd blockchain && pnpm test
cd ../backend && pnpm test
cd ../frontend/civicsys && pnpm test:run
cd ../../agents && ./.venv/Scripts/python.exe -m pytest -q
```
Expected: todo verde. Arreglar lo que falle antes de seguir.

### Task H.3: State-Sync AEGIS (cierre — requiere Gate 2 humano)

> **NO ejecutar sin aprobación humana explícita (Gate 2).** AEGIS prohíbe mover a `executed/` o pushear sin visto bueno.

- [ ] **Step 1:** Mover `docs/plans/tactica/sprint-03-identidad-soberana/` y los ADR-006..009 a `docs/plans/executed/...`.
- [ ] **Step 2:** Crear devlog `docs/devlogs/2026-05-29-sprint03-identidad-cedula-civica.md` (formato AEGIS: resumen, cambios por capa, decisiones, incidentes, cómo verificar, pendiente, uso y costo).
- [ ] **Step 3:** Actualizar `CLAUDE.md` (sección nueva: identidad soulbound, IdentitySBT implementa ICitizenRegistry, dedupe facial off-chain, wallet no-custodial) y `docs/INDEX.md` (links a ADRs + devlog).
- [ ] **Step 4:** Actualizar memoria persistente (`MEMORY.md` + archivo del sprint) y SEELE (`seele save` decisión sprint/03/cierre).
- [ ] **Step 5: Commit final**
```bash
git add -A
git commit -m "chore(H): state-sync Sprint 03 — executed + devlog + CLAUDE.md + INDEX"
```

---

## Self-Review (cobertura del spec)

- **§6.1 IdentitySBT** → Block A (A.2–A.8). ✓ unicidad dual, soulbound, ICitizenRegistry, eventos, tokenURI sin PII.
- **§6.2 Wizard 5 pasos** → Block F (F.1–F.7). ✓
- **§6.3 Dedupe Hermes** → Block C. ✓ dedupe-face + register-face, sin firmar, solo embedding.
- **§6.4 Backend backup relay** → Block D. ✓ reenvía sin descifrar (tRPC, reconciliado vs. REST del spec).
- **§6.5 shared/** → Block B. ✓ tipos + zod + ABI (A.8).
- **§7 Esqueletos** → Block G (G.1–G.4) + ADR-009 (0.4). ✓
- **§8 Seguridad/privacidad** → claves client-side (E.1–E.4), PII off-chain (A.4 metadata), sanitize ya existe, known-limitations (H.3). ✓
- **§9 Testing ≥80%** → tests por bloque + F.8 + H.2. ✓
- **§10 Stack** → OZ v5 (A.1), viem/Web Crypto (E), ERC-5192 (A.2). ✓
- **§11 ADRs** → Block 0. ✓
- **§13 Criterios de aceptación** → cubiertos por H.1 + tests.

**Reconciliaciones explícitas (no son gaps):**
1. **Backup como tRPC mutation** (no REST) — el backend del repo es tRPC; se mantiene DRY con los routers existentes.
2. **Keystore**: JSON cifrado PBKDF2+AES-GCM (Web Crypto), no keystore-v3 canónico — documentado en ADR-007; interop directa con MetaMask = stretch.
3. **Dedupe in-memory** (no pgvector vivo) para el hackathon — interfaz lista para pgvector, documentado en ADR-008.
4. **Ejecución inline** (no subagentes) — AEGIS v2.0.0 manda.
```
