# ADR-001 — Estrategia de hash del ciudadano

**Fecha**: 2026-05-23
**Estado**: ACEPTADO
**Decisor**: Orlando (orquestador AEGIS)
**Input**: `docs/plans/executed/estrategia/sprint-02-security-hardening/05-decisiones-abiertas-para-arquitecto.md` DA-1
**Sustituye**: comentario en `.env.example` declarando `PUBLIC_SALT` como "no secreto"

## Contexto

La auditoría de Tatiana (HC-01 + SC-05) identifica que `PUBLIC_SALT="ssc-antipereza-2026-publico"` está commiteado en 3 `.env.example` del repo público MIT. El espacio de DNIs peruanos es 10^8 (8 dígitos). Conocer el salt + el algoritmo `keccak256(dni || salt)` permite a un atacante:

1. Pre-computar todos los 10^8 hashes en horas con hardware consumer.
2. Llamar `isRegistered(citizen_address)` y, conocido el hash, recuperar el DNI por lookup.
3. Deanonimizar todo el padrón.

El comentario actual del `.env.example` —"NO ES SECRETO — la cadena lo necesita consistente"— refleja la confusión que produjo este diseño: el salt **debe** ser consistente entre frontend/backend/contratos, pero **no debe ser público**. Estas dos propiedades son compatibles: el secreto vive en `.env` local de cada componente del sistema (frontend deploy, backend deploy, hardhat deploy), nunca en VCS.

## Opciones evaluadas

### A. Salt secreto rotado (RECOMENDADA estratega)

- Valor de 256 bits aleatorios via `openssl rand -hex 32`.
- Vive en `.env` (gitignored).
- `.env.example` queda con placeholder `PUBLIC_SALT=<GENERATE_WITH_OPENSSL_RAND_HEX_32>` y comentario actualizado.
- Algoritmo de hash sin cambios: `keccak256(dni || salt)`.
- Compatible con el contrato `CitizenRegistry.sol` (que recibe `bytes32` ya calculado off-chain).

### B. HMAC con pepper

- `HMAC-SHA256(pepper, dni)` con `pepper` en HSM / Vault / env seguro.
- Requiere wrapper para producir `bytes32` (truncar o re-hashear el HMAC).
- Mejor postura criptográfica contra leak: si el pepper se filtra parcialmente o se observa output, HMAC tiene mejores propiedades que keccak256 directo.

### C. ZK Proof de DNI

- El ciudadano prueba conocimiento de un DNI válido sin revelarlo.
- El contrato verifica la prueba; no hay hash on-chain.

## Decisión

**Opción A** para Sprint 02. Salt rotado + movido fuera de VCS.

## Justificación

- **Cierra el vector descrito por Tatiana** (HC-01): pre-cómputo público no aplica si el salt no es público.
- **Cambio mínimo de superficie**: no toca `CitizenRegistry.sol`, no toca el algoritmo en `helpers.py`. Solo:
  - Generar valor nuevo.
  - Actualizar `.env.example` con placeholder + comentario.
  - Persistir el valor real en `.env` local (no commiteado).
  - Actualizar tests que dependen del string literal.
- **Compatibilidad**: viem (`encodePacked(['string','string'], [dni, public_salt])`) y `eth_utils.keccak(b)` Python producen el mismo `bytes32` para los mismos inputs. Sin cambio.
- **Costo**: bajo. Una tarjeta de tareas (3-5 archivos de tests a actualizar).

**Opción B** se difiere a producción/mainnet:
- HMAC es más robusto contra observación parcial del output, pero el ataque actual no requiere eso — requiere conocer el salt y enumerar el espacio de DNIs.
- Para producción con un pepper en HSM, el cambio implica refactor del cliente (Solidity ya espera `bytes32` cualquiera — compatible — pero el JS/Python necesita librería HMAC).
- ADR-001B en Sprint 03 cuando se prepare deploy mainnet.

**Opción C** se descarta para hackathon:
- Esfuerzo grande (circuito, prover, verifier on-chain).
- Cambia arquitectura cliente/contrato significativamente.
- No alineado con timeline hackathon.

## Consecuencias

### Positivas

- HC-01 cerrado a nivel Sprint 02 testnet.
- El padrón actual de Anvil local queda invalidado al rotar (necesario re-registrar) — pero como Sprint 1 no llegó a producción, no hay padrón ciudadano real que migrar.
- Reduce confusión conceptual del comentario "no es secreto".

### Negativas

- Sigue siendo un **secreto único** — si el VPS de Hermes es comprometido, el salt se filtra. Producción debe usar HSM (ADR-001B futuro).
- Tests pierden la propiedad "valor determinista en CI" — se compensa con que cada test passes un salt explícito al helper (no depende de env).

### Mitigaciones complementarias

- `gitleaks` pre-commit (deferido del Sprint 1) — escanea futuros commits para evitar que el nuevo salt entre por accidente.
- `docs/security/known-limitations.md` referencia que el salt-secret-único es aceptable para hackathon, no para mainnet.

## Implementación (referencia para fase Táctica)

1. Generar salt nuevo: `openssl rand -hex 32` (no commitear el valor).
2. Actualizar 3 `.env.example`:
   ```env
   # PUBLIC_SALT — secreto compartido entre frontend, backend y deploy de contratos.
   # GENERAR con `openssl rand -hex 32` y persistir en `.env` local de cada componente.
   # NO commitear el valor real. NO compartir en chats públicos.
   PUBLIC_SALT=<GENERATE_WITH_OPENSSL_RAND_HEX_32>
   ```
3. Actualizar `agents/tests/test_helpers.py` para no depender del literal viejo (parametrizar con salt explícito).
4. Documentar el procedimiento de rotación en `docs/security/runbook-rotacion-salt.md`.
5. Actualizar `CLAUDE.md` del repo con nota sobre cómo poblar `.env` antes de correr cualquier servicio.

## Referencias

- Documento Tatiana: HC-01, SC-05.
- NIST SP 800-53 SC-12 (Cryptographic Key Establishment).
- ISO/IEC 27001:2022 A.8.24 (Use of cryptography).

## Cuándo revisar este ADR

- Antes de deploy a mainnet (entonces evaluar Opción B con HSM).
- Si emerge un vector adicional (rainbow tables específicas para DNI peruano publicadas, etc.).
