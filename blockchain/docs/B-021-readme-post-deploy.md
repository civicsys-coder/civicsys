---
id: B-021
title: "Actualizar blockchain/README.md con direcciones reales"
owner: "Tatiana"
backup: "Orlando"
effort: "30 min"
priority: P1
status: pending
depends_on: [B-019]
sprint: 1
layer: blockchain
---

# B-021 · Actualizar `blockchain/README.md` post-deploy

## Por qué importa
El `README.md` actual de `blockchain/` describe la **especificación**, no el **estado real**. Una vez desplegado hay que reflejar:

- Direcciones reales de contratos.
- Link al explorer.
- Block del deploy.
- Cómo apuntar `agents/.env` a estas direcciones.

Un README desactualizado en hackathon es **peor que no tener README** — alguien lo lee y pierde 1 hora siguiendo direcciones viejas.

## Conceptos clave
- **Single source of truth**: las direcciones en sí están en `deployments/zkTanenbaum.json`. El README **enlaza** a ese JSON y replica las direcciones para lectura rápida.
- **Status badges (opcional)**: agregar un badge "deployed on zkTanenbaum" da señal visual.

## Pre-requisitos
- [ ] [B-019](./B-019-deploy-zktanenbaum.md) cerrada.

## Paso a paso

### 1. Editar `blockchain/README.md`
Agregar al inicio (o donde haga sentido), después de la descripción:

```markdown
## Estado del deploy

| Contrato | Address | Block | Explorer |
|----------|---------|-------|----------|
| CitizenRegistry | `0xABC...` | 12345 | [↗](https://explorer-zk.tanenbaum.io/address/0xABC...) |
| Vote | `0xDEF...` | 12346 | [↗](https://explorer-zk.tanenbaum.io/address/0xDEF...) |

- Red: **zkTanenbaum** (Chain ID 57057)
- Fecha de deploy: **2026-05-19**
- Detalles completos: [`deployments/zkTanenbaum.json`](./deployments/zkTanenbaum.json)

> Las direcciones se regeneran en cada redeploy. Para uso desde `agents/`, leer siempre el JSON.
```

### 2. Documentar cómo apuntar `agents/.env` a las direcciones
Agregar sección:

```markdown
## Integración con `agents/`

Después del deploy, agregar a `agents/.env`:

\```bash
CITIZEN_REGISTRY_ADDRESS=0xABC...
VOTE_CONTRACT_ADDRESS=0xDEF...
DEPLOY_BLOCK=12345
\```

O leer dinámicamente desde Python:

\```python
import json, pathlib
dep = json.loads(pathlib.Path("../blockchain/deployments/zkTanenbaum.json").read_text())
registry_addr = dep["CitizenRegistry"]["address"]
vote_addr = dep["Vote"]["address"]
\```
```

### 3. Actualizar Quick Start

Reemplazar el "Quick Start" actual con uno que refleje el flujo real:

```markdown
## Quick Start

\```bash
# 1. Setup
cd blockchain
npm install
cp .env.example .env  # Llenar DEPLOYER_PRIVATE_KEY (testnet, NUNCA mainnet)

# 2. Local
npx hardhat compile
npx hardhat test
npx hardhat coverage

# 3. Deploy a zkTanenbaum
npx hardhat run scripts/deploy.ts --network zkTanenbaum
npx hardhat run scripts/seed-proposals.ts --network zkTanenbaum
npx hardhat run scripts/verify.ts --network zkTanenbaum  # opcional
\```
```

### 4. Agregar referencia a `docs/`
Agregar al pie:

```markdown
## Documentación

- [Tareas atómicas del Sprint 1](./docs/README.md) — qué se hizo y cómo.
- [Cobertura](./docs/COVERAGE.md) — snapshot del último coverage.
- [Sprint plan](../docs/sprints/sprint1.md) — DoD, riesgos, equipo.
- [ADR-0001](../docs/adr/0001-zkTanenbaum-as-target-chain.md) — por qué zkTanenbaum.
- [Threat model](../docs/security/threat-model-sprint1.md) — amenazas y mitigaciones.
```

### 5. Commit
```bash
git add blockchain/README.md
git commit -m "docs(blockchain): README post-deploy con direcciones reales (B-021)"
```

## Verificación / Definition of Done

```bash
# 1. README tiene direcciones reales (no placeholders 0x000...000)
grep -E "0x[0-9a-fA-F]{40}" blockchain/README.md | head

# 2. Links al explorer son válidos
# Manual: hacer clic, debe abrir la página del contrato
```

- ✅ Direcciones reales en el README.
- ✅ Links al explorer funcionan.
- ✅ Quick start ejecutable de copy-paste.
- ✅ Referencias a `docs/` actualizadas.

## Errores comunes

- **README dice una dirección, deployments dice otra**
  Sincronización rota: alguien redesplegó y no actualizó el README. Re-correr esta tarea.

- **Link al explorer 404**
  El explorer es relativamente nuevo, puede que no haya indexado aún. Esperar 30 min y reintentar.

- **Direcciones de testnet en mainnet contexto**
  Si el demo se hizo en mainnet (por error), nada de esto es seguro. Confirmar Chain ID = 57057.

## Lecturas
- [How to write a good README](https://www.makeareadme.com/)
- [Keep a Changelog](https://keepachangelog.com/) — referencia conceptual

## Notas para revisor
- ¿Las direcciones del README coinciden EXACTAMENTE con `deployments/zkTanenbaum.json`?
- ¿El Quick Start lo puede correr alguien que recién clona el repo?
- ¿Se omitió accidentalmente la nota "private key NUNCA mainnet"?
