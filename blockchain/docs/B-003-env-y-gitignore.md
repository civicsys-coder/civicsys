---
id: B-003
title: ".env + .gitignore seguros (sin claves al repo)"
owner: "Tatiana"
backup: "Orlando"
effort: "30 min"
priority: P0
status: pending
depends_on: [B-001]
sprint: 1
layer: blockchain
---

# B-003 · `.env` y `.gitignore` seguros

## Por qué importa
Una clave privada filtrada en un repo público es **dinero perdido y reputación rota** en minutos — existen bots que escanean GitHub en tiempo real. El [threat model](../../docs/security/threat-model-sprint1.md) marca **T6 (Elevation of Privilege)** como crítica: si `SIGNER_PRIVATE_KEY` se filtra, el atacante puede firmar txs en nombre de la API y registrar ciudadanos falsos / cerrar propuestas. Esta tarea es **defensa en profundidad básica** y se hace **antes** de pegar la primera clave real.

## Conceptos clave
- **`.env`**: archivo plano con `KEY=valor`, una por línea. Cargado en runtime por `dotenv`.
- **`.env.example`**: versión sin secretos del `.env` que se commitea para guiar a otros devs. Ya existe en `blockchain/.env.example`.
- **`.gitignore`**: lista de patrones de archivos que git ignora. Si `.env` se agrega *después* de un commit accidental no basta — hay que reescribir historia.
- **gitleaks**: scanner que busca patrones de secretos (private keys, tokens, etc.) en archivos. Lo correremos como pre-commit hook.
- **Testnet vs mainnet**: la clave de testnet controla TSYS sin valor real; si filtramos una de mainnet, el riesgo es financiero. En el repo **solo deben aparecer keys de testnet**, idealmente solo en el `.env` local de cada dev.

## Pre-requisitos
- [ ] [B-001](./B-001-setup-hardhat-typescript.md) completada.
- [ ] Nunca, nunca usar la misma clave que usás para mainnet personal.

## Paso a paso

### 1. Revisar el `.env.example` ya existente
Está en `blockchain/.env.example` (creado en bootstrap del repo). Confirmá que tiene esto y nada de claves reales:

```bash
# Wallet de despliegue (TESTNET — nunca mainnet)
DEPLOYER_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000

# RPC
RPC_PRIMARY=https://rpc-zk.tanenbaum.io
RPC_FALLBACK=

# Salt público compartido con agents/.env
PUBLIC_SALT=ssc-antipereza-2026-publico

# Verificación de contratos en explorer (no requiere key aún)
EXPLORER_API_KEY=
```

> El `0x0000...` es un **valor obviamente falso**: una key de 32 bytes ceros. Si alguien la copia "tal cual" no firma nada real. Mantenerlo así.

### 2. Crear `.env` real (LOCAL, NUNCA COMMITEAR)
```bash
cd blockchain
cp .env.example .env
```

Abrir `.env` con tu editor y reemplazar:
- `DEPLOYER_PRIVATE_KEY` — generá una clave **nueva** solo para testnet. En una terminal Node:
  ```js
  const { ethers } = require("ethers");
  const w = ethers.Wallet.createRandom();
  console.log("address:", w.address);
  console.log("privateKey:", w.privateKey);
  ```
  Pegá `privateKey` en `.env`. Anotá la `address` para pedir TSYS al faucet ([B-018](./B-018-solicitar-faucet-tsys.md)).

> **Nunca** generar la wallet desde el navegador o pegarla en un sitio web. `ethers.Wallet.createRandom()` usa `crypto.randomBytes` localmente.

### 3. Verificar `.gitignore`
Mostrá el actual:
```bash
cat .gitignore 2>/dev/null || cat ../.gitignore
```

Deben aparecer (si falta alguno, agregarlo):
```gitignore
node_modules
artifacts
cache
coverage
coverage.json
typechain-types
.env
.env.local
.env.*.local
!.env.example
```

Si tenés que agregar en `blockchain/.gitignore`:
```bash
cat >> .gitignore <<'EOF'
node_modules
artifacts
cache
coverage
coverage.json
typechain-types
.env
.env.local
.env.*.local
!.env.example
EOF
```

> El patrón `!.env.example` **negativa** la regla previa, garantizando que el ejemplo sigue siendo trackable.

### 4. Test manual de la blindada
```bash
git status -s
```

NO debe aparecer `.env` en la lista. Si aparece, **detener**, revisar `.gitignore`, no commitear hasta que `.env` esté ignorado.

### 5. Instalar `gitleaks` como pre-commit hook (recomendado)
Instalación en Windows con `winget` o `scoop`:
```powershell
scoop install gitleaks   # o: choco install gitleaks
```

Crear `.git/hooks/pre-commit` (si no usás un manager tipo Husky):
```bash
#!/usr/bin/env bash
set -e
gitleaks protect --staged --redact --no-banner
```

```bash
chmod +x .git/hooks/pre-commit
```

> Si `gitleaks` no está disponible para alguien del equipo, no bloqueamos — pero la persona DEBE correr `gitleaks detect` manualmente antes de PR.

### 6. Probar el hook
Crear adrede un archivo con un patrón "secret":
```bash
echo "DEPLOYER_PRIVATE_KEY=0xa1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd" > prueba.txt
git add prueba.txt
git commit -m "test gitleaks"
```

Salida esperada:
```
○ gitleaks: 1 leak found
✘ commit aborted
```

Limpiar:
```bash
git restore --staged prueba.txt
rm prueba.txt
```

### 7. Documentar la práctica en `docs/security/`
Agregar línea al `docs/security/threat-model-sprint1.md` si no existe ya:
> Pre-commit hook con `gitleaks` activo en todas las máquinas del equipo. Ver [B-003](../../blockchain/docs/B-003-env-y-gitignore.md).

### 8. Commit (solo lo permitido)
```bash
git add blockchain/.gitignore docs/security/threat-model-sprint1.md
git commit -m "chore(security): blindar .env + pre-commit gitleaks (B-003)"
```

## Verificación / Definition of Done

```bash
# 1. .env existe local pero está ignorado
ls blockchain/.env && git check-ignore blockchain/.env

# 2. .env.example está trackable
git ls-files blockchain/.env.example

# 3. (opcional) gitleaks detect no encuentra nada
gitleaks detect --source . --no-banner
```

Resultado esperado:
- ✅ `blockchain/.env` existe en disco pero `git check-ignore` lo confirma como ignorado.
- ✅ `blockchain/.env.example` aparece en `git ls-files`.
- ✅ `gitleaks` salida `no leaks found`.

## Errores comunes

- **`.env` ya está commiteado (¡pánico!)**
  Pasos: 1) cambiar las keys inmediatamente, 2) `git rm --cached .env && git commit`, 3) si el repo es público, reescribir historia con `git filter-repo --path blockchain/.env --invert-paths` y forzar push (coordinar con todo el equipo antes de hacer force-push).

- **`gitleaks: command not found`**
  Instalá con tu package manager, o saltá el hook **temporalmente** con `git commit --no-verify` solo si estás muy seguro (preferentemente, no).

- **El junior reusa una key de mainnet por error**
  Tarea de revisor: verificar que la dirección que aparece en `deployments/zkTanenbaum.json` no tiene historia de transacciones en mainnet (consultar en https://etherscan.io/address/{address}).

## Lecturas
- [Threat model · T6 EoP](../../docs/security/threat-model-sprint1.md)
- [gitleaks docs](https://github.com/gitleaks/gitleaks)
- [Has someone leaked your secret? — GitHub secret scanning](https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning)

## Notas para revisor
- Confirmar que **NINGÚN** archivo trackeado contiene una clave que matchea `0x[0-9a-fA-F]{64}` salvo el `0x000...000` dummy.
- Idealmente el dueño de las claves cambia su key entre Sprint 1 y Sprint 2 (rotación).
- Si en un workshop alguien comparte pantalla con `.env` abierto, recordarle cerrar.
