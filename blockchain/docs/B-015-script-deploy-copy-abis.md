---
id: B-015
title: "deploy.ts — copiar ABIs a shared/abis/"
owner: "Orlando"
backup: "junior"
effort: "30 min"
priority: P0
status: pending
depends_on: [B-014]
sprint: 1
layer: blockchain
---

# B-015 · Copiar ABIs a `shared/abis/`

## Por qué importa
Los agentes Python (`agents/services/blockchain_client.py`) leen los ABIs desde `shared/abis/` para construir el cliente Web3. Si los ABIs quedan solo en `blockchain/artifacts/` (que está en `.gitignore`), Sandro no puede arrancar el API sin recompilar localmente. Tener ABIs en `shared/abis/` es la **fuente de verdad** entre blockchain y agents.

## Conceptos clave
- **ABI**: JSON con la descripción de funciones y eventos. Sin ABI no se puede decodificar llamadas.
- **Versionado de ABI**: cuando un contrato cambia, el ABI cambia. El commit del nuevo ABI en `shared/abis/` es la señal explícita "yo, blockchain dev, te cambié el contrato".
- **`shared/`** está fuera de `blockchain/.gitignore`, por lo que va al repo.
- **Solo necesitamos `abi`, `bytecode` y `metadata`** — no todo el `.json` de Hardhat (que incluye sourcemaps de 1MB+).

## Pre-requisitos
- [ ] [B-014](./B-014-script-deploy.md) cerrada.

## Paso a paso

### 1. Editar `scripts/deploy.ts`
Agregar al final de `main()` (antes del último `console.log`):

```ts
  // ---- 6. Copiar ABIs a shared/abis/ ----
  const sharedAbisDir = path.join(__dirname, "..", "..", "shared", "abis");
  if (!fs.existsSync(sharedAbisDir)) fs.mkdirSync(sharedAbisDir, { recursive: true });

  const contractsToExport = [
    { name: "CitizenRegistry", path: "contracts/CitizenRegistry.sol" },
    { name: "Vote",            path: "contracts/Vote.sol" },
    { name: "ICitizenRegistry", path: "contracts/interfaces/ICitizenRegistry.sol" },
    { name: "IVote",            path: "contracts/interfaces/IVote.sol" },
  ];

  for (const c of contractsToExport) {
    const artifactPath = path.join(
      __dirname, "..", "artifacts", c.path, `${c.name}.json`
    );
    if (!fs.existsSync(artifactPath)) {
      console.warn(`  ⚠ artifact no encontrado: ${artifactPath}`);
      continue;
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
    const minimal = {
      contractName: c.name,
      sourceName:   artifact.sourceName,
      abi:          artifact.abi,
      // bytecode solo para los contratos concretos, no las interfaces
      bytecode:     c.name.startsWith("I") ? undefined : artifact.bytecode,
    };
    const outPath = path.join(sharedAbisDir, `${c.name}.json`);
    fs.writeFileSync(outPath, JSON.stringify(minimal, null, 2) + "\n");
    console.log(`  ✓ ABI exportado: ${outPath}`);
  }
```

### 2. Probar localmente
```bash
cd blockchain
npx hardhat run scripts/deploy.ts
ls ../shared/abis
```

Esperado:
```
CitizenRegistry.json
Vote.json
ICitizenRegistry.json
IVote.json
```

### 3. Inspeccionar uno
```bash
cat ../shared/abis/CitizenRegistry.json | jq '{contractName, abiCount: (.abi | length), bytecodeLen: (.bytecode | length)}'
```

Esperado:
```json
{
  "contractName": "CitizenRegistry",
  "abiCount": 18,
  "bytecodeLen": 8500
}
```

### 4. Verificar que `shared/abis/` NO está en `.gitignore`
```bash
cd ..
git check-ignore shared/abis/CitizenRegistry.json
# debe retornar exit 1 (no ignorado)
echo $?  # 1
```

### 5. Commit
```bash
git add blockchain/scripts/deploy.ts shared/abis/CitizenRegistry.json shared/abis/Vote.json shared/abis/ICitizenRegistry.json shared/abis/IVote.json
git commit -m "feat(blockchain): exportar ABIs a shared/abis/ (B-015)"
```

> Cada vez que un contrato cambie, el `deploy.ts` debe re-correrse y se actualizan los ABIs en `shared/`. Esto genera un commit que **señala** que rompimos la API a los consumidores.

## Verificación / Definition of Done

```bash
cd blockchain
npx hardhat compile
npx hardhat run scripts/deploy.ts
ls -la ../shared/abis/*.json
```

- ✅ Los 4 ABIs existen.
- ✅ Los ABIs concretos tienen `bytecode` no vacío.
- ✅ Las interfaces NO tienen `bytecode` (queda `undefined` y se omite).
- ✅ El commit del repo incluye los `.json` de `shared/abis/`.

## Errores comunes

- **`Cannot find module artifact`**
  El path está mal. Verificá que `artifacts/contracts/X.sol/X.json` exista. Si no, faltó `npx hardhat compile`.

- **`shared/abis/` no se commitea**
  El `.gitignore` raíz tiene un patrón muy amplio. Agregá `!shared/abis/` para forzar incluir.

- **ABI bytecode muy grande**
  Si el `bytecode` supera 24576 bytes, NO podés desplegar en EVM. Reducí logic, partí en libs, o activá `viaIR: true` en optimizer.

## Lecturas
- [Solidity ABI spec](https://docs.soliditylang.org/en/v0.8.24/abi-spec.html)
- [`agents/services/blockchain_client.py`](./../agents/docs/A-009-blockchain-client-setup.md) — consumidor

## Notas para revisor
- ¿Los ABIs van con `bytecode` para concretos y sin para interfaces? Confirmar.
- En Sprint 2, considerar generar también `shared/types/*.ts` desde TypeChain output para el frontend.
- Si el sourceName tiene `..` en el path, probablemente compilaste con paths raros — revisar.
