# Spec — Identidad Soberana «Cédula Cívica» + esqueletos Sprint 04+

**Fecha**: 2026-05-29
**Sprint**: 03 — Identidad Soberana
**Autor**: Orlando (orquestador AEGIS) + Claude (Opus 4.8)
**Estado**: APROBADO PARA TÁCTICA (revisión humana del spec OK 2026-05-29)
**Protocolo**: AEGIS v2.1.0 — fase Estrategia
**Repos afectados**: `blockchain/`, `agents/`, `backend/`, `frontend/civicsys/`, `shared/`

---

## 1. Contexto

CivicSys (SSC ANTIPEREZA) cerró Sprint 01 (MVP voto consultivo) y Sprint 02
(security hardening, auditoría Tatiana). Hoy existe:

- `CitizenRegistry.sol` — `address → dniHash` (una address, un hash). **No** garantiza
  unicidad de DNI: la misma persona puede registrar 2 wallets con su mismo DNI
  (agujero anti-Sybil, ver §4).
- `Vote.sol` — voto consultivo sobre 1 propuesta, gated por `registry.isRegistered`.
- Hermes (`agents/`) + Concilio de 4 agentes sobre datos mock; pgvector + `memory.py`
  (embeddings) ya cableados; `listener.py` parsea eventos on-chain.
- Frontend Next.js 16 con `/registro` (DNI→hash→tx firmada por el ciudadano).

El pedido del hackathon abarca **4 subsistemas**: (1) identidad única con DNI+cara
tokenizada a NFT + cuenta SYS, (2) Hermes de Registro multicanal (Telegram/Discord/
WhatsApp) que bloquea dobles, (3) votación anónima 1-persona-1-voto, (4) Hermes
"La Tóxica" de accountability legislativo.

**Decisión de alcance**: los 4 dependen de la identidad única. Este sprint entrega
el **Subsistema 1 completo y demoable** + **esqueletos** (interfaces + ADR + páginas
placeholder) de los otros 3 para exhibir la visión, sin lógica funcional.

## 2. Objetivo

Que un ciudadano se registre **una sola vez** probando identidad (DNI + cara, mock
realista), obtenga una **cuenta SYS no-custodial** y un **NFT soulbound «Cédula
Cívica»** que lo identifica como humano único. El sistema **bloquea registros dobles**
por DNI (on-chain) y por rostro (off-chain, Hermes + pgvector). Una identidad → una
wallet → un voto por propuesta.

## 3. Decisiones tomadas (gate humano, 2026-05-29)

| # | Decisión | Valor elegido |
|---|---|---|
| D1 | Alcance del sprint | Identidad completa **+ esqueletos** de los otros 3 |
| D2 | Enfoque identidad | **A** — on-chain (unicidad dual) + dedupe facial off-chain |
| D3 | Manejo de clave | **No-custodial**: generada en el navegador, server nunca la ve |
| D4 | Entrega de wallet | Wallet en navegador + **backup cifrado** por email (keystore v3) |
| D5 | Verificación DNI+cara | **Mock realista** client-side (OCR + match + liveness simulados) |
| D6 | Dedupe facial | **Mock realista** client-side → embedding → dedupe en pgvector |
| D7 | Red | **Anvil local** (31337) ahora; Syscoin testnet objetivo opcional al final (la ya soportada en código es zkTanenbaum 57057; confirmar red NEVM/Rollux exacta en la tarea de deploy) |
| D8 | "La Tóxica" (futuro) | **Posts públicos** automáticos (no DMs privados) |
| D9 | Nombre del NFT | **Cédula Cívica** |
| D10 | Calidad | Mejores prácticas + stacks profesionales (ver §10) |

## 4. Hallazgo que justifica el sprint (anti-Sybil)

`CitizenRegistry.sol::register` solo valida `_hashes[msg.sender] == 0` — que **esa
address** no esté registrada. **No** valida que el `dniHash` ya exista para otra
address. Por lo tanto, hoy una persona registra N wallets con su único DNI y vota N
veces. El nuevo `IdentitySBT` cierra esto con un índice inverso `dniHash → usado` y
un dedupe facial que detecta el mismo rostro aunque cambie el documento.

## 5. Arquitectura

```
NAVEGADOR (todo lo sensible vive acá)            BLOCKCHAIN (Anvil 31337 → SYS testnet)
┌─────────────────────────────────────┐         ┌──────────────────────────────┐
│ Wizard /registro (multi-paso)        │         │ IdentitySBT.sol (NUEVO)      │
│  1 foto DNI  → OCR mock → dniHash     │  firma  │  · ERC-721 + ERC-5192 (SBT)  │
│  2 selfie    → embedding → faceCommit │ ──tx──▶ │  · unicidad dniHash          │
│  3 verifica  (match DNI↔cara+liveness)│  mint   │  · unicidad faceCommitment   │
│  4 wallet no-custodial (viem)         │         │  · implements ICitizenRegistry│
│     + keystore v3 cifrado (WebCrypto) │         │    → Vote.sol intacto        │
│  5 mint «Cédula Cívica»               │         └──────────────────────────────┘
└──────┬──────────────────────┬─────────┘
       │ embedding (read)      │ blob cifrado
       ▼                       ▼
┌────────────────────┐  ┌─────────────────────┐
│ HERMES (agents)    │  │ BACKEND BFF (Node)  │
│ POST /identity/    │  │ POST /backup/email  │
│   dedupe-face      │  │  reenvía blob cifrado│
│ pgvector similitud │  │  NUNCA descifra      │
│ SIN firmar on-chain│  │  read-only on-chain  │
└────────────────────┘  └─────────────────────┘
```

**Principio rector** (heredado de CLAUDE.md): secreto en el navegador; Hermes lee
(no firma); backend reenvía (no descifra); el ciudadano firma sus propias tx.

## 6. Componentes

### 6.1 `blockchain/contracts/IdentitySBT.sol` (nuevo)

- **Base**: OpenZeppelin Contracts v5 `ERC721` + interfaz **ERC-5192** (`locked(tokenId)`
  → `true`; eventos `Locked`/`Unlocked`) = soulbound estándar e interoperable.
- **Soulbound**: override de `_update` (OZ v5) para revertir cualquier transfer cuando
  `from != 0 && to != 0` (permite mint y burn opcional, bloquea transferencias).
- **API principal**:
  ```solidity
  function mint(bytes32 dniHash, bytes32 faceCommitment, string calldata uri) external returns (uint256 tokenId);
  ```
  Revierte si: `balanceOf(msg.sender) > 0` (ya tiene Cédula) · `dniHash` usado ·
  `faceCommitment` usado · cualquiera de los dos es `bytes32(0)`.
- **Índices**: `mapping(bytes32 => bool) usedDni; mapping(bytes32 => bool) usedFace;`
- **Implementa `ICitizenRegistry`**: `isRegistered(addr)` = `balanceOf(addr) > 0`;
  `hashOf(addr)` = dniHash del token de esa address. Así `Vote.sol` apunta al nuevo
  contrato **sin cambios** (DRY: una sola fuente de "quién es ciudadano").
- **Metadata (`tokenURI`) SIN PII**: `{ verificado, nivel:"mock", emitido, dniHash,
  faceCommitment }`. Nunca la foto ni el DNI en claro. Para la demo, data-URI o IPFS.
- **Eventos**: `CedulaMinted(address indexed holder, uint256 indexed tokenId, bytes32 dniHash, bytes32 faceCommitment)` + `Locked(tokenId)` (ERC-5192).

### 6.2 Frontend — wizard `/registro` (evoluciona el actual)

Reescribe `registro/page.tsx` a un wizard de 5 pasos (componentes aislados, testeables):

1. **`StepDniCapture`** — `getUserMedia` o upload; **OCR mock** extrae 8 dígitos
   (en demo: campo editable prellenado). Reusa `computeDniHash` existente.
2. **`StepFaceCapture`** — selfie + **liveness mock** (ej: "parpadeá"); genera un
   **embedding** (mock determinista basado en la imagen, dimensión consistente con
   `embedding_dim=384`). `faceCommitment = keccak256(embedding || salt)`.
3. **`StepVerify`** — match DNI↔cara (mock score) + llamada a Hermes
   `dedupe-face`; si hay duplicado, **bloquea** y explica.
4. **`StepWallet`** — `generatePrivateKey()` (viem) → `privateKeyToAccount`; pide
   contraseña; cifra a **keystore JSON v3** (Web Crypto, scrypt/PBKDF2 + AES); ofrece
   descargar el keystore y enviarlo por email (backend). Muestra la **address pública**.
   La clave en claro **nunca** sale del componente.
5. **`StepMint`** — con la wallet nueva, `writeContract` a `IdentitySBT.mint(...)`.
   Muestra la tarjeta de la Cédula Cívica + link al explorer.

- **Estado del wizard**: máquina de pasos local (sin libs pesadas); cada paso valida
  antes de avanzar.
- **Vista "Mi Cédula"**: tarjeta del NFT (tokenId, estado verificado, fecha).
- **Stack**: wagmi/viem (ya presente), shadcn/ui (ya presente). **Leer
  `node_modules/next/dist/docs/` antes de tocar** (AGENTS.md: Next 16 tiene breaking changes).

### 6.3 Agents (Hermes) — dedupe facial

- `POST /agents/identity/dedupe-face` — body `{ embedding: number[], threshold?: number }`;
  busca en pgvector el vecino más cercano; responde `{ duplicate: bool, similarity, topMatch? }`.
- Reusa `HermesMemoryStore` / `memory.py` + pgvector. Hermes **no firma** on-chain.
- **Almacenamiento**: solo el embedding (dato biométrico derivado), nunca la foto.
  Marcado como dato sensible; consentimiento explícito en la UI. (Para mock, embeddings
  sintéticos → riesgo real bajo, pero el diseño respeta el principio.)
- Endpoint companion `POST /agents/identity/register-face` para persistir el embedding
  tras un mint exitoso (idempotente por faceCommitment).

### 6.4 Backend BFF (Node) — relay de backup

- `POST /backup/email` — body `{ to, encryptedKeystore }`; reenvía el **blob ya cifrado**
  por email. **Nunca** descifra ni persiste la clave. Provider de email pluggable
  (mock/console en dev; Resend/nodemailer detrás de env en real).
- Mantiene el rol **read-only on-chain** del backend (no firma tx).

### 6.5 `shared/`

- Tipos nuevos: `Cedula` (tokenId, holder, dniHash, faceCommitment, mintedAt),
  `FaceDedupeResult`. Zod schemas para los endpoints nuevos.
- Regenerar ABI de `IdentitySBT` a `shared/abis/` tras compilar.

## 7. Esqueletos de los otros 3 subsistemas (Sprint 04+)

Solo interfaces + ADR + placeholder, **marcados "Sprint 04+ — no funcional"**:

- **Votación anónima**: ADR con approach **nullifier/ZK** (nullifier = marca única
  derivada de la identidad que evita doble voto sin revelar quién); `AnonymousVote.sol`
  stub (interfaz, sin lógica); página `/votacion` placeholder explicando el modelo.
- **Hermes multicanal**: `agents/app/channels/` con `Channel` (interfaz común:
  `receive()`, `send()`, `verify_unique()`) + stubs `telegram.py` / `discord.py` /
  `whatsapp.py` (raise `NotImplementedError`) + README de arquitectura.
- **Hermes "La Tóxica"**: `agents/app/toxica.py` stub (interfaz: input = transcripción/
  reporte de sesión del congreso + tally ciudadano → output = **post público** de
  brecha) + ADR de approach (transcripción de video vs. lectura de reportes;
  comparación con la votación; tono; human-in-the-loop) + página placeholder.

## 8. Modelo de seguridad y privacidad

- **PII nunca on-chain**: solo commitments (hashes). Metadata del NFT sin foto/DNI.
- **DNI en claro**: nunca sale del navegador (igual que hoy).
- **Clave privada**: generada y cifrada client-side; server jamás la ve; backup = blob
  cifrado (inútil sin la contraseña del ciudadano).
- **Biometría**: se persiste solo el embedding (no la imagen), con consentimiento.
- **Prompt injection**: cualquier dato a LLM pasa por `sanitize_untrusted` (ya existe).
- **Honestidad del modelo de confianza** (→ `docs/security/known-limitations.md`):
  el mock de verificación **no es seguridad real**. On-chain garantiza no-repetición de
  commitments exactos; el dedupe de rostros similares es off-chain por umbral. En
  producción: KYC real + **attestor con multisig 2-de-3** (ya previsto en CLAUDE.md),
  no una EOA única. El sprint deja el "slot" para ese verifier sin implementarlo.

## 9. Testing (regla del repo: coverage ≥80%, CI bloquea merge)

- **Solidity** (Hardhat): mint feliz; doble DNI revierte; doble faceCommitment revierte;
  segunda Cédula por misma address revierte; transfer revierte (soulbound); `locked()`
  = true; compat `ICitizenRegistry` (Vote.sol vota con el nuevo contrato).
- **Frontend** (vitest): wizard avanza/bloquea; `computeDniHash`; **round-trip de
  cifrado/descifrado** del keystore; generación de wallet; bloqueo por dedupe.
- **Agents** (pytest): dedupe (similitud, umbral, sin match); register-face idempotente;
  sanitización.
- **Backend** (vitest): `/backup/email` reenvía sin descifrar; valida payload (zod).
- Slither/solhint sobre `IdentitySBT.sol` (ya en CI desde Sprint 02).

## 10. Stack y mejores prácticas (D10)

- **Solidity**: OpenZeppelin Contracts v5 (ERC721, utils), **ERC-5192** para soulbound
  estándar. Solidity 0.8.24, Hardhat (ya configurado).
- **Wallet**: viem `generatePrivateKey` / `privateKeyToAccount`. **Keystore JSON v3**
  (Web3 Secret Storage Definition) → importable en MetaMask. Cifrado vía Web Crypto API.
- **Frontend**: Next.js 16 (App Router), wagmi v2, shadcn/ui, react-hook-form + zod
  (ya en el repo). Componentes pequeños y aislados.
- **Agents**: FastAPI + pydantic-settings, pgvector (ya cableado).
- **Validación cross-stack**: zod (TS) + pydantic (Py) sobre los mismos contratos de datos.
- **pnpm** (no npm). Conventional commits. Tests antes de commit.

## 11. Decisiones abiertas para fase Arquitectura (ADRs)

1. **ADR — Soulbound**: ERC-5192 puro vs. extensión con burn (revocación). → propuesta:
   ERC-5192 + burn opcional por el holder (derecho al olvido).
2. **ADR — Keystore**: keystore v3 vía lib establecida vs. Web Crypto a mano
   (PBKDF2+AES-GCM). → propuesta: keystore v3 estándar (interop MetaMask).
3. **ADR — Gating del mint**: mint abierto con unicidad on-chain (este sprint) vs.
   attestor firmante con multisig (producción). → propuesta: documentar el límite,
   diferir el attestor a sprint de producción.
4. **ADR — Dedupe facial**: umbral fijo vs. configurable; métrica de distancia
   (coseno) en pgvector.

## 12. Out of scope (explícito)

KYC/biometría real · OCR real · entrega por WhatsApp · votación anónima funcional ·
bots multicanal funcionales · "La Tóxica" funcional · attestor/multisig · deploy mainnet.

## 13. Criterios de aceptación

- [ ] Un ciudadano completa el wizard y obtiene wallet no-custodial + Cédula Cívica
      minteada en Anvil, sin que la clave toque el servidor.
- [ ] Reintentar con el mismo DNI → rechazado on-chain. Mismo rostro, otra wallet →
      rechazado off-chain (Hermes).
- [ ] `Vote.sol` funciona apuntando a `IdentitySBT` sin cambios de código.
- [ ] Transfer de la Cédula revierte (soulbound).
- [ ] Esqueletos de los 3 subsistemas presentes y navegables, marcados "no funcional".
- [ ] Coverage ≥80% por capa; CI verde.
- [ ] Backup por email reenvía solo blob cifrado.

## 14. Referencias

- `CLAUDE.md` (modelo de seguridad, sin signer custodial, pnpm).
- ADR-001 (estrategia de hash/salt), ADR-002 (audit log + HMAC + multisig 2-de-3).
- `docs/security/known-limitations.md`, `threat-model.md`.
- AEGIS v2.1.0 — `C:/dev/protocols/AEGIS/AEGIS-PROTOCOL.md`.
- ERC-721 (OpenZeppelin v5), ERC-5192 (Minimal Soulbound), Web3 Secret Storage (keystore v3).
