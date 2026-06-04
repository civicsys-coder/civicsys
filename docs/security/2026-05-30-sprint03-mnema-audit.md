# Auditoría de seguridad MNEMA — Sprint 03 «Cédula Cívica»

**Fecha**: 2026-05-30
**Método**: protocolo MNEMA (Counsel pattern) — 4 auditores adversarios en paralelo, con
sesgos opuestos y sin verse entre sí (anti-sycophancy), + síntesis/veredicto (este documento).
**Alcance**: el diff del Sprint 03 (identidad soberana): `IdentitySBT.sol`, dedupe facial de
Hermes, relay de backup, wallet/keystore/embedding client-side, wizard de registro.

## Los 4 auditores (lentes)

1. **Smart contracts** — Solidity/ERC-5192, unicidad dual, soulbound, control de acceso.
2. **Cripto / AppSec** — manejo de la private key, PBKDF2/AES-GCM, no-custodial, backup.
3. **Privacidad / PII** — DNI, biometría, qué toca la cadena, oráculos de deanonimización.
4. **Red-team anti-Sybil** — vectores concretos para registrarse/votar dos veces.

## Veredicto de síntesis

El sprint **demuestra correctamente el flujo** de identidad única y el núcleo criptográfico
está bien hecho (clave generada con CSPRNG en el navegador, AES-GCM con IV/salt únicos, el
server nunca ve la clave). **Pero la *propiedad* de unicidad biométrica no existe end-to-end**:
el hallazgo raíz (red-team V1) es que `mint()` no tiene binding con el dedupe — la verificación
facial es un gate de UI, no una precondición on-chain. Esto, más la naturaleza mock del
embedding, hace que la garantía "1 persona = 1 voto" **no se sostenga** sin un attestor (fuera
del alcance del sprint por diseño, spec §12).

La respuesta correcta no es "mejorar el mock facial" sino **atar el dedupe al `mint()`** y
alimentar el padrón desde eventos on-chain — diferido a producción y documentado.

## Hallazgos corregidos en este sprint (fix aplicado)

| # | Hallazgo | Severidad | Fix |
|---|----------|-----------|-----|
| F1 | `tokenURI` exponía `dniHash`/`faceCommitment` legibles on-chain | ALTA (privacidad) | Metadata del NFT sin commitments ni PII (`StepMint.tsx`). |
| F2 | `dedupe-face` devolvía `topMatch` (commitment) + `similarity` cruda → oráculo de deanonimización del padrón | ALTA | Devuelve **solo** `{duplicate}` (`main.py`). |
| F3 | `threshold` del dedupe controlable por el cliente (debilitable) | MEDIA | Eliminado del request; es config del servidor (`main.py`). |
| F4 | `register-face` aceptaba `faceCommitment` con cualquier formato | MEDIA | Validación `^0x[0-9a-fA-F]{64}$` (pydantic). |
| F5 | Contraseña del backup mínimo 8 (único secreto del blob) | MEDIA | Mínimo 12 (`StepWallet.tsx`). |
| F6 | Approvals colgantes sin efecto (ERC-5192 no estricto) | INFO | `approve`/`setApprovalForAll` revierten (`IdentitySBT.sol`). |
| F7 | Burn sin evento semántico (auditoría del derecho al olvido) | BAJA | Evento `CedulaBurned` emitido en `burn`. |

Tests añadidos: approve revierte + evento `CedulaBurned` (blockchain, 34 verdes);
dedupe sin `topMatch`/`similarity` + 422 en input inválido (agents, 81 verdes).

## Hallazgos aceptados / documentados (no se cierran este sprint)

Trasladados a `docs/security/known-limitations.md` con plan de mitigación:

- **L-11** — `mint()` sin binding al dedupe (anti-Sybil biométrico no exigible on-chain). **El
  más importante.** Requiere attestor + multisig (producción).
- **L-12** — padrón off-chain best-effort, sin binding ni persistencia (in-memory). Fix:
  indexar desde eventos `CedulaMinted` + pgvector.
- **L-13** — embedding facial es mock (no reconoce la misma cara). Fix: modelo facial real.
- **L-14** — `dniHash` reversible por `PUBLIC_SALT` expuesto al cliente (espacio DNI 10^8).
  Fix: pepper secreto server-side (HMAC). Mitigado parcial: sacado del `tokenURI`.
- **L-15** — endpoints de identidad sin auth ni rate limiting. Mitigado parcial: oráculo
  cerrado. Falta auth + throttling.
- **L-16** — private key en el contexto global de React durante toda la sesión. Fix: acortar
  vida en memoria + CSP.

## Disenso registrado (MNEMA)

El auditor de contratos consideró el sistema "razonablemente seguro para el alcance"; el
red-teamer fue más severo ("la garantía 1-persona-1-voto NO se sostiene"). La síntesis adopta
la postura del red-teamer sobre la **propiedad de seguridad** (es correcta: el binding falta),
pero coincide con el auditor de contratos en que, **para el alcance declarado** (hackathon,
mock, no mainnet), el contrato en sí es correcto y sin vulnerabilidades explotables de
implementación. Ambas cosas son ciertas: el *contrato* está bien; el *sistema de identidad
end-to-end* depende de un control (dedupe) que no es vinculante. No se descarta ningún
hallazgo del red-team: se trasladan a L-11/L-12 como deuda crítica de producción.

## Conclusión

Apto para **demo de hackathon**. **No apto para producción** hasta cerrar L-11 (attestor +
binding del mint), L-12 (padrón desde la cadena) y L-14 (pepper server-side). El claim de
CLAUDE.md fue corregido para no sobre-vender el anti-Sybil.
