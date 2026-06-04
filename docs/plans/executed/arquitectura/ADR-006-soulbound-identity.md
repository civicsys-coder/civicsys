# ADR-006 — Identidad soulbound «Cédula Cívica» (ERC-5192 + burn del holder)

**Fecha**: 2026-05-29
**Estado**: ACEPTADO
**Decisor**: Orlando (orquestador AEGIS)
**Input**: `docs/superpowers/specs/2026-05-29-identidad-soberana-cedula-civica-design.md` §6.1, §11.1
**Sustituye**: el alta vía `CitizenRegistry.sol::register` (no garantiza unicidad de DNI)

## Contexto

`CitizenRegistry.sol::register` solo valida `_hashes[msg.sender] == 0` — que **esa
address** no esté registrada. **No** valida que el `dniHash` ya exista para otra
address (hallazgo anti-Sybil, spec §4). Hoy una persona registra N wallets con su
único DNI y vota N veces.

Se necesita una **identidad única por humano**, no transferible, que sirva de fuente
de verdad de "quién es ciudadano" para `Vote.sol` sin reescribirlo.

## Opciones evaluadas

### A. ERC-5192 puro (soulbound estricto)
NFT que nunca se mueve ni se quema. Identidad permanente e inmutable.

### B. ERC-5192 + burn opcional del holder (RECOMENDADA)
Soulbound estándar (no transferible) pero el holder puede **quemar su propia** Cédula
(derecho al olvido). El burn libera la address pero **no** libera los commitments
(`dniHash`/`faceCommitment` siguen marcados como usados → no re-registro con la misma
identidad).

### C. ERC-721 mutable con flag `isHuman`
NFT transferible con un booleano. Descartada: transferible rompe el 1-persona-1-identidad.

## Decisión

**Opción B**: `IdentitySBT` = `ERC721` (OpenZeppelin v5) + interfaz **ERC-5192**
(`locked(tokenId) == true`, eventos `Locked`/`Unlocked`), con `burn` restringido al
holder. Implementa `ICitizenRegistry` para que `Vote.sol` lo consuma **sin cambios**.

## Justificación

- **Cierra el agujero anti-Sybil**: índices inversos `usedDni`/`usedFace` (mapping
  `bytes32 => bool`) revierten cualquier reutilización de DNI o rostro.
- **Soulbound estándar e interoperable**: ERC-5192 es la EIP mínima de SBT; wallets y
  exploradores la reconocen. Se implementa overrideando `_update` (OZ v5) para revertir
  transferencias cuando `from != 0 && to != 0` (permite mint y burn, bloquea transfer).
- **DRY**: `isRegistered(addr) = balanceOf(addr) > 0` y `hashOf(addr)` exponen la misma
  interfaz que ya consume `Vote.sol`. Una sola fuente de ciudadanía.
- **Derecho al olvido**: el burn del holder es un requisito razonable de privacidad; no
  reabre el vector Sybil porque los commitments quedan quemados permanentemente.

## Consecuencias

### Positivas
- Una address → una Cédula → un voto por propuesta.
- `Vote.sol` intacto (apunta al nuevo contrato vía `ICitizenRegistry`).
- PII nunca on-chain: solo `dniHash` y `faceCommitment` (commitments), metadata sin foto/DNI.

### Negativas
- El mint es **abierto** con unicidad on-chain; no hay attestor que valide que el
  `dniHash` corresponde a un DNI real (eso es el mock de verificación client-side). En
  producción se requiere un **attestor firmante con multisig 2-de-3** (ya previsto en
  CLAUDE.md / ADR-002). Este sprint deja el slot sin implementarlo (ver ADR-006 §revisar).
- `register(bytes32)` de `ICitizenRegistry` queda deshabilitado (revierte): el alta es
  vía `mint()`. Consumidores que llamaran `register` directo deben migrar.

## Implementación (referencia)

- `blockchain/contracts/IdentitySBT.sol` — `mint(dniHash, faceCommitment, uri)` revierte
  si: ya tiene Cédula, dni usado, face usado, o cualquiera es `bytes32(0)`.
- `blockchain/contracts/interfaces/IERC5192.sol` — interfaz estándar.
- Tests: mint feliz, doble dni, doble face, segunda cédula, transfer revierte, burn,
  compat `Vote.sol` (`blockchain/test/IdentitySBT.test.ts`).

## Referencias

- EIP-5192 (Minimal Soulbound NFT). OpenZeppelin Contracts v5 (ERC721, `_update`).
- ADR-002 (audit log + multisig 2-de-3). Spec §4 (hallazgo Sybil), §6.1, §8.

## Cuándo revisar este ADR

- Antes de mainnet: introducir attestor con multisig que firme la validez del `dniHash`
  contra KYC real, en vez de mint abierto.
