# Testing e2e — Registro «Cédula Cívica» (Sprint 03)

Guía para verificar el subsistema de **identidad soberana** end-to-end en localhost.

## Pre-requisitos (stack arriba)

```bash
# 1. Infra (Postgres + Anvil)  — nota: Postgres host port = 55432 en esta máquina
docker compose -f infra/docker-compose.yml --env-file infra/.env up -d postgres anvil

# 2. Contratos a Anvil (IdentitySBT + CitizenRegistry + Vote)
cd blockchain && pnpm compile && pnpm exec hardhat run scripts/deploy-local.ts --network localhost && cd ..

# 3. Hermes (Docker aislado, con identity endpoints)
docker compose -f infra/docker-compose.yml --env-file infra/.env up -d --build hermes

# 4. Backend Node + Frontend (host)
cd backend && pnpm dev            # :4000
cd frontend/civicsys && pnpm dev  # :3000
```

## Flujo del wizard (navegador) — http://localhost:3000/registro

El registro es un **wizard de 5 pasos**. Todo lo sensible (DNI, clave privada) vive
solo en el navegador.

1. **DNI** — ingresá 8 dígitos (ej. `12345678`). Se calcula el `dniHash` (mismo
   algoritmo que el contrato y Hermes). El número en claro nunca sale del navegador.
2. **Rostro** — "Tomar selfie" (mock + liveness simulado) → genera un embedding (384
   dims) y el `faceCommitment`. No se guarda la imagen, solo el derivado (ADR-008).
3. **Verificar** — match DNI↔cara (mock 98%) + **dedupe facial contra Hermes**. Si el
   rostro ya existe, **bloquea** el avance.
4. **Wallet** — genera una wallet **no-custodial** (viem). Mostrá la address pública;
   poné una contraseña (≥8) y **descargá el respaldo cifrado** (o enviálo por email).
   La clave en claro nunca toca el servidor (ADR-007). Marcá "guardé mi respaldo".
5. **Cédula** — firma el `mint` de `IdentitySBT` con la wallet nueva. Aparece la tarjeta
   de la **Cédula Cívica** (NFT soulbound) + el embedding queda registrado en Hermes.

> MetaMask **no** es necesario en este flujo: la wallet se crea en el wizard y firma el
> mint directamente sobre Anvil (chain 31337).

## Criterios de aceptación a verificar

- [ ] Completar el wizard → wallet creada + Cédula minteada (tarjeta visible).
- [ ] **Doble DNI**: reintentar con el mismo DNI desde otra sesión → el mint **revierte**
      on-chain (`Identity: dni ya usado`).
- [ ] **Doble rostro**: mismo embedding, otra wallet → **bloqueo en paso 3** (Hermes
      `duplicate: true`).
- [ ] **Soulbound**: la Cédula no es transferible (transfer revierte).
- [ ] `Vote.sol` reconoce al holder de la Cédula vía `ICitizenRegistry` (votar funciona).

## Verificación por API / CLI (sin navegador)

```bash
# Hermes: registrar un rostro y detectar el duplicado
EMB=$(python -c "print(','.join(['0.0']*383+['1.0']))")
curl -s -X POST http://localhost:8000/agents/identity/register-face \
  -H 'Content-Type: application/json' \
  -d "{\"embedding\":[$EMB],\"faceCommitment\":\"0x$(printf 'ab%.0s' {1..32})\"}"
# → {"ok":true}
curl -s -X POST http://localhost:8000/agents/identity/dedupe-face \
  -H 'Content-Type: application/json' -d "{\"embedding\":[$EMB]}"
# → {"duplicate":true,"similarity":1.0,"topMatch":"0xabab…"}

# Contrato desplegado
curl -s http://localhost:8545 -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_call","params":[{"to":"<IdentitySBT>","data":"0x06fdde03"},"latest"],"id":1}'
# name() → "Cedula Civica"
```

## Suite automatizada (cross-stack)

```bash
cd blockchain && pnpm test          # 32 tests (incl. 24 IdentitySBT)
cd backend && pnpm test             # 24 tests (incl. backup relay)
cd frontend/civicsys && pnpm test:ci  # 45 tests · coverage ≥80%
# agents (contenedor efímero, sin venv en host):
docker run --rm -v "<ruta>/agents:/app" -w /app ssca-hermes:local \
  sh -c "pip install -q pytest pytest-asyncio pytest-cov respx; python -m pytest -q"
# 81 tests · coverage 86.6%
```

## Límites honestos (ver `docs/security/known-limitations.md`)

- La verificación DNI+cara y el dedupe facial son **mocks realistas**, no biometría real:
  demuestran el **flujo**, no son seguridad. On-chain garantiza no-repetición de
  commitments exactos; el dedupe de rostros similares es off-chain por umbral.
- El mint es abierto con unicidad on-chain; producción requiere un **attestor con
  multisig 2-de-3** (slot previsto, no implementado).
