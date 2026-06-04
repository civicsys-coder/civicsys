# ADR-007 — Wallet no-custodial + cifrado de respaldo (PBKDF2 / AES-GCM)

**Fecha**: 2026-05-29
**Estado**: ACEPTADO
**Decisor**: Orlando (orquestador AEGIS)
**Input**: spec §6.2 (StepWallet), §6.4 (backup relay), §11.2 · decisiones D3/D4

## Contexto

El ciudadano necesita una **cuenta SYS** para firmar el mint de su Cédula. El sistema no
debe ser custodial: el servidor **nunca** debe ver la clave privada. Además se quiere un
**backup** recuperable (por descarga y/o email) sin que ese backup, si se filtra, revele
la clave.

Principio rector heredado de CLAUDE.md: el secreto vive en el navegador; el backend
reenvía (no descifra); el ciudadano firma sus propias tx.

## Opciones evaluadas

### Generación de la clave
- **viem `generatePrivateKey()` client-side (RECOMENDADA)** — clave generada y mantenida
  en memoria del navegador; `privateKeyToAccount` deriva la address pública.
- Server-side / HD wallet custodiada — descartada: viola no-custodial.

### Formato de cifrado del backup
- **A. Keystore v3 canónico** (Web3 Secret Storage, aes-128-ctr + scrypt) — importable
  directo en MetaMask, pero implementarlo a mano es propenso a errores y las libs añaden peso.
- **B. JSON cifrado propio con Web Crypto: PBKDF2(SHA-256, 150k) → AES-GCM-256
  (RECOMENDADA)** — API nativa del navegador, sin dependencias, AEAD (integridad +
  confidencialidad). Interop directa con import de MetaMask queda como *stretch* (el
  usuario importa por clave revelada localmente bajo su contraseña).

## Decisión

Clave generada client-side con **viem**. Backup = **JSON cifrado** vía **Web Crypto API**:
PBKDF2-SHA256 (≥150 000 iteraciones, salt aleatorio de 16 bytes) deriva una clave
**AES-GCM-256** (IV aleatorio de 12 bytes) que cifra la private key. El blob resultante
(`{version, kdf, iterations, salt, iv, ciphertext}`) es lo único que puede salir del
navegador. El backend solo lo **reenvía** por email; nunca lo descifra ni lo persiste.

## Justificación

- **No-custodial real**: la clave en claro nunca abandona el componente del navegador.
- **AES-GCM** es autenticado: detecta manipulación y password incorrecta (la verificación
  del tag falla → `decrypt` lanza). El test de "password incorrecta → throw" lo cubre.
- **Web Crypto nativo**: sin dependencias nuevas, disponible en navegador y en jsdom/Node
  (`node:crypto.webcrypto`) para los tests.
- **PBKDF2 150k**: balance razonable costo/seguridad para derivación desde password humano
  en hardware de cliente.

## Consecuencias

### Positivas
- El backup filtrado es inútil sin la contraseña del ciudadano.
- Cero dependencias criptográficas nuevas; superficie auditable mínima.
- Round-trip testeable (cifrar→descifrar) y fallo testeable (password mala).

### Negativas / límites honestos
- **No es keystore-v3 canónico** → no se importa con un clic en MetaMask. Mitigación: el
  usuario puede importar por private key (revelada localmente bajo su password). Documentado.
- PBKDF2 es más débil que scrypt/argon2 contra ASICs; 150k iter es aceptable para
  hackathon, no para custodia de fondos grandes. Revisar para producción.
- El relay por email confía en el transporte del provider; el blob va cifrado, pero el
  metadato (destinatario) no.

## Implementación (referencia)

- `frontend/civicsys/lib/wallet.ts` — `createWallet()` (viem).
- `frontend/civicsys/lib/keystore.ts` — `encryptKey`/`decryptKey` (Web Crypto).
- `backend/src/routers/backup.ts` — mutation tRPC `email` que reenvía el blob sin descifrar.
- `backend/src/services/email.service.ts` — provider pluggable (console en dev).

## Referencias

- Web3 Secret Storage Definition (keystore v3). Web Crypto API (W3C).
- CLAUDE.md (modelo sin signer custodial). spec §8.

## Cuándo revisar este ADR

- Antes de manejar fondos reales: evaluar scrypt/argon2 y keystore-v3 canónico para interop.
