# CLAUDE.md — CivicSys

Reglas y memoria persistente del proyecto para Claude Code y otros asistentes IA que operan sobre este repositorio.

## Stack y reglas operativas

- **Lenguajes**: Solidity 0.8.24 (Hardhat) · TypeScript / Node 20 · Python 3.11.
- **Package manager**: **`pnpm` (no `npm`)**. Decisión por seguridad (isolation via symlinks + content-addressable store). Traducir cualquier ejemplo de docs `npm install` → `pnpm install`.
- **Tests obligatorios** para cualquier cambio de comportamiento. CI bloquea merge si baja el coverage cross-stack (≥80% statements).
- **Antes de commit**: `pnpm lint` + `pnpm typecheck` + `pnpm test` por capa; `pytest` en `agents/`.
- **AEGIS v2.1.0**: protocolo de fases (Estrategia → Arquitectura → Táctica → Ejecución → Guardrails → State-Sync). Todo en consola del orquestador, sin sub-agentes en background. Ver `C:/dev/protocols/AEGIS/AEGIS-PROTOCOL.md`. Planes en `docs/plans/`. Devlogs en `docs/devlogs/` y `docs/aegis/devlogs/`.

## Estructura

```
CivicSys/
├── blockchain/      # Solidity contracts (Hardhat) — solo lectura desde backend Node
├── backend/         # Node BFF (Express + tRPC + viem) — SIN private keys
├── agents/          # Python (FastAPI + Hermes runtime) — SIN signer custodial
├── frontend/        # Next.js 16 (wagmi + MetaMask para firmar)
├── infra/           # docker-compose, Postgres+pgvector, Anvil
├── shared/          # ABIs + types + zod schemas
└── docs/            # planes AEGIS, devlogs, seguridad, testing
```

## Modelo de seguridad (Sprint 1/2)

**Sin signer custodial.** Hermes:

- **Lee** eventos on-chain via `EventListener` (sin firmar).
- **Llama** LLM con `ANTHROPIC_API_KEY` (httpx → endpoints hardcoded).
- **Sirve** API HTTP (sin escrituras on-chain).

El ciudadano firma todas las transacciones desde su wallet (MetaMask) en el frontend. El backend Node BFF es solo-lectura.

Cuando Sprint 3+ introduzca un publisher on-chain (ej. `AuditLog.sol::logReport`), será con multisig 2-de-3 — no una EOA única. Ver:

- [`docs/security/threat-model.md`](docs/security/threat-model.md)
- [`docs/plans/executed/arquitectura/ADR-002-audit-log-l1.md`](docs/plans/executed/arquitectura/ADR-002-audit-log-l1.md)

### Identidad soberana «Cédula Cívica» (Sprint 03)

`IdentitySBT.sol` (ERC-721 + ERC-5192 soulbound) es la **fuente de ciudadanía**: una address → una Cédula. Unicidad dual on-chain (`usedDni`/`usedFace`) impide **reutilizar el mismo commitment exacto** de DNI o rostro. **OJO (auditoría MNEMA, L-11):** esto NO es anti-Sybil completo — el `mint()` no exige pasar por el dedupe facial, así que un atacante con DNI nuevo + cualquier embedding puede mintear desde N wallets. La unicidad biométrica real requiere un **attestor firmante con multisig** (producción, diferido). **Implementa `ICitizenRegistry`**, así que `Vote.sol` lo consume sin cambios (apuntar `Vote` a la address de `IdentitySBT` en el deploy). El alta es vía `mint()`, no `register()`.

- **Wallet no-custodial**: generada y cifrada en el navegador (viem + Web Crypto, PBKDF2/AES-GCM). El server jamás ve la clave; el backend (`backup.email`) solo reenvía el blob cifrado. Ver ADR-007.
- **Dedupe facial off-chain**: `agents/app/identity.py` + `face_index.py` (cosine, umbral 0.92). Hermes no firma; persiste solo el embedding (no la imagen). Endpoints `POST /agents/identity/{dedupe-face,register-face}`. Ver ADR-008.
- **Mocks honestos**: verificación DNI+cara y dedupe son demostraciones del flujo, no biometría real (`docs/security/known-limitations.md`). Producción → attestor con multisig 2-de-3.
- ADRs: 006 (soulbound), 007 (wallet/keystore), 008 (dedupe), 009 (votación anónima esqueleto). Guía e2e: `docs/testing-cedula-civica.md`.

### Salt secreto

`PUBLIC_SALT` se generó con `openssl rand -hex 32` y vive en `.env` local de cada componente (frontend, backend, agents, blockchain deploy). **Nunca commitearlo.** Rotar siguiendo [`docs/security/runbook-rotacion-salt.md`](docs/security/runbook-rotacion-salt.md).

### Defensa contra prompt injection

Cualquier dato que llegue al prompt LLM (título de propuesta, descripción on-chain) **debe** pasar por `agents.app.security.sanitize_untrusted()` y envolverse en `<UNTRUSTED_INPUT>...</UNTRUSTED_INPUT>` con instrucción explícita al modelo. Ver `agents/app/reporter.py:_build_prompt` y `agents/tests/test_security.py` (≥10 payloads cubiertos).

### MCP Server (futuro)

El directorio `agents/mcp_server/` está reservado pero sin implementación activa. Antes de implementar cualquier tool MCP: leer [`docs/security/mcp-policy.md`](docs/security/mcp-policy.md) (Bearer auth obligatoria, allow-list, prohibiciones absolutas) y emitir ADR-004B con detalles del server.

### RPC failover

`agents/app/rpc.py:fetch_with_failover` implementa failover simple (primary → fallback en timeout/5xx). Configurar `RPC_FALLBACK` en `.env` para activar. Cross-validation multi-RPC queda para Sprint 3+. Ver [`docs/plans/executed/arquitectura/ADR-003-rpc-fallback.md`](docs/plans/executed/arquitectura/ADR-003-rpc-fallback.md).

### Integridad de reportes (HMAC)

Helpers `compute_hmac` / `verify_hmac` listos en `agents/app/security.py`. Cuando se introduzca persistencia de reportes (Sprint 02b o 03), usar desde el día 1. Generar `MEMORY_INTEGRITY_KEY` con `openssl rand -hex 32`. Ver [`docs/plans/executed/arquitectura/ADR-002-audit-log-l1.md`](docs/plans/executed/arquitectura/ADR-002-audit-log-l1.md).

## Auditoría externa

La auditoría base del proyecto fue realizada por **Tatiana Portillo** (Mayo 2026). Documento en [`docs/security/CivicSys-Auditoria-Ciberseguridad.docx`](docs/security/CivicSys-Auditoria-Ciberseguridad.docx). El Sprint 02 de hardening responde a las 9 vulnerabilidades priorizadas (pp. 20-21).

Auditoría externa profesional pendiente. RFP en [`docs/security/audit-scope.md`](docs/security/audit-scope.md).

## gitleaks pre-commit

Activación opcional local:

```bash
pip install pre-commit
pre-commit install
```

Config en `.pre-commit-config.yaml`. Evita commits accidentales de secretos.

## Comandos clave

```bash
# Levantar stack local
docker compose -f infra/docker-compose.yml up -d
cd blockchain && pnpm hardhat compile && pnpm hardhat run scripts/deploy.ts --network anvil
cd ../backend && pnpm dev
cd ../agents && ./.venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000
cd ../frontend/civicsys && pnpm dev

# Tests cross-stack
cd blockchain && pnpm test
cd backend && pnpm test
cd frontend/civicsys && pnpm test
cd agents && ./.venv/Scripts/python.exe -m pytest
```

## Convenciones

- **Commits**: convencionales (`feat:`, `fix:`, `docs:`, `ci:`, `cleanup:`, etc.) + sufijo de bloque/tarea si aplica (`feat(B): ...`).
- **Naming devlogs**: `YYYY-MM-DD-<contexto>-<modulo>-<accion>.md`. Ej: `2026-05-23-sprint02-security-hardening.md`.
- **PRs**: draft hasta tests verdes + revisión humana.

## Última actualización

2026-05-30 — Sprints 03-06 completos (los 4 subsistemas del hackathon, demoables): Identidad «Cédula Cívica» (S03), votación anónima por nullifier (S04, ADR-010), Hermes multicanal (S05), Hermes «La Tóxica» accountability (S06). Mocks honestamente documentados en `known-limitations.md` (L-11..L-18). Auditoría MNEMA aplicada en S03.
