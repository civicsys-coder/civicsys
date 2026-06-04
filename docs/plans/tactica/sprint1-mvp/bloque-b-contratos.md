# Bloque B · Contratos Solidity con TDD

**Objetivo**: Implementar `CitizenRegistry.sol` y `Vote.sol` con tests Hardhat/Chai + cobertura ≥80% statements y 100% branches en los `require`/`revert`. Compatible con zkTanenbaum (Solidity 0.8.24, EVM standard).

**Tareas**: 14
**LOC estimado**: ~600 (contratos + tests)
**Dependencias**: Bloque 0 (commit base) y Bloque A (Anvil corriendo para tests on-chain reales).
**Coverage gate**: `pnpm exec hardhat coverage` reporta ≥80% statements + 100% branches en reverts.

---

## Task B.1 — Bootstrap Hardhat + TypeScript en `blockchain/`

**Files**:
- Create: `blockchain/package.json`
- Create: `blockchain/tsconfig.json`
- Create: `blockchain/.gitignore`

- [ ] **Step 1**: Inicializar package.json en `blockchain/`

```bash
cd blockchain
pnpm init
pnpm pkg set name="@civicsys/contracts" type="module"
```

- [ ] **Step 2**: Instalar Hardhat + TypeScript + ethers v6 + Chai + solidity-coverage + viem (para parity con backend Node)

```bash
pnpm add -D \
  hardhat@^2.22.0 \
  @nomicfoundation/hardhat-toolbox@^5.0.0 \
  @nomicfoundation/hardhat-viem@^2.0.0 \
  typescript@^5.6.0 \
  @types/node@^22.0.0 \
  @types/chai@^4.3.0 \
  @types/mocha@^10.0.0 \
  ts-node@^10.9.0 \
  chai@^4.4.0 \
  solidity-coverage@^0.8.13 \
  dotenv@^17.0.0 \
  viem@^2.0.0
```

> **Nota**: `chai@^4` (no v5) porque Hardhat aún espera CommonJS-compatible Chai. Si pnpm te avisa de peer deps, ignoralo — Hardhat 2.x maneja la incompatibilidad internamente.

- [ ] **Step 3**: Crear `tsconfig.json`

```bash
cat > tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "outDir": "dist"
  },
  "include": ["./scripts", "./test", "./typechain-types", "hardhat.config.ts"]
}
EOF
```

- [ ] **Step 4**: Crear `.gitignore` específico de blockchain/

```bash
cat > .gitignore <<'EOF'
node_modules
cache
artifacts
typechain-types
coverage
coverage.json
.env
.openzeppelin
dist
EOF
```

- [ ] **Step 5**: Stage + commit

```bash
cd ..
git add blockchain/package.json blockchain/pnpm-lock.yaml \
        blockchain/tsconfig.json blockchain/.gitignore
git commit -m "blockchain(B.1): bootstrap hardhat + TypeScript + ethers + chai + solidity-coverage"
```

---

## Task B.2 — `blockchain/hardhat.config.ts` con redes localhost + zkTanenbaum

**Files**: Create `blockchain/hardhat.config.ts`.

- [ ] **Step 1**: Crear el config

```bash
cat > blockchain/hardhat.config.ts <<'EOF'
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-viem";
import "solidity-coverage";
import "dotenv/config";

const DEPLOYER_PRIVATE_KEY =
  process.env.DEPLOYER_PRIVATE_KEY ??
  // Anvil cuenta 0 (no la uses en mainnet, es bien conocida)
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const ZKTANENBAUM_RPC =
  process.env.ZKTANENBAUM_RPC ?? "https://rpc-zk.tanenbaum.io";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      // viaIR ayuda con stack-too-deep cuando los structs crezcan; off por
      // defecto para velocidad de compilación
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://localhost:8545",
      chainId: 31337,
      accounts: [DEPLOYER_PRIVATE_KEY],
    },
    zkTanenbaum: {
      url: ZKTANENBAUM_RPC,
      chainId: 57057,
      accounts: [DEPLOYER_PRIVATE_KEY],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
EOF
```

- [ ] **Step 2**: Compilar sin errores (esperable: warning de "no .sol files")

```bash
cd blockchain && pnpm exec hardhat compile
```

Expected output:
```
Compiled 0 Solidity files successfully (...)
```

- [ ] **Step 3**: Listar redes configuradas

```bash
pnpm exec hardhat help | grep -A 2 "Networks"  # informativo; no es estricto
```

- [ ] **Step 4**: Stage + commit

```bash
cd ..
git add blockchain/hardhat.config.ts
git commit -m "blockchain(B.2): hardhat.config.ts con redes localhost (31337) + zkTanenbaum (57057)"
```

---

## Task B.3 — Interfaz `ICitizenRegistry.sol`

**Files**: Create `blockchain/contracts/interfaces/ICitizenRegistry.sol`.

- [ ] **Step 1**: Crear el archivo de interfaz

```bash
mkdir -p blockchain/contracts/interfaces
cat > blockchain/contracts/interfaces/ICitizenRegistry.sol <<'EOF'
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title ICitizenRegistry
/// @notice Registro on-chain de ciudadanos por hash de DNI. Una dirección,
///         un hash. El hash se calcula off-chain como
///         keccak256(abi.encodePacked(dni, PUBLIC_SALT)).
interface ICitizenRegistry {
    /// @notice Emitido cuando una dirección se registra.
    /// @param citizen La dirección que llamó register
    /// @param dniHash El hash que ahora queda asociado
    /// @param timestamp block.timestamp de la transacción
    event CitizenRegistered(address indexed citizen, bytes32 dniHash, uint256 timestamp);

    /// @notice Asocia msg.sender con un hash de DNI. Una sola vez por dirección.
    /// @param dniHash keccak256(abi.encodePacked(dni, PUBLIC_SALT)) calculado off-chain
    /// @dev Revierte si la dirección ya está registrada o si dniHash es bytes32(0).
    function register(bytes32 dniHash) external;

    /// @notice Devuelve el hash asociado a una dirección, o bytes32(0) si no está registrada.
    function hashOf(address citizen) external view returns (bytes32);

    /// @notice True si la dirección está registrada.
    function isRegistered(address citizen) external view returns (bool);
}
EOF
```

- [ ] **Step 2**: Compilar para validar la interfaz

```bash
cd blockchain && pnpm exec hardhat compile
```

Expected: `Compiled 1 Solidity file successfully`.

- [ ] **Step 3**: Stage + commit

```bash
cd ..
git add blockchain/contracts/interfaces/ICitizenRegistry.sol
git commit -m "blockchain(B.3): interface ICitizenRegistry con register/hashOf/isRegistered"
```

---

## Task B.4 — `CitizenRegistry.sol` impl + tests TDD

**Files**:
- Create: `blockchain/contracts/CitizenRegistry.sol`
- Create: `blockchain/test/CitizenRegistry.test.ts`

- [ ] **Step 1**: Escribir tests primero (TDD red phase)

```bash
mkdir -p blockchain/test
cat > blockchain/test/CitizenRegistry.test.ts <<'EOF'
import { expect } from "chai";
import { network } from "hardhat";
import { keccak256, encodePacked, type Address } from "viem";

const { viem } = await network.connect();

const PUBLIC_SALT = "ssc-antipereza-2026-publico";

function dniHash(dni: string): `0x${string}` {
  return keccak256(encodePacked(["string", "string"], [dni, PUBLIC_SALT]));
}

describe("CitizenRegistry", () => {
  async function deploy() {
    const registry = await viem.deployContract("CitizenRegistry");
    const [owner, alice, bob] = await viem.getWalletClients();
    return { registry, owner, alice, bob };
  }

  describe("register", () => {
    it("permite que una dirección registre un hash y emite CitizenRegistered", async () => {
      const { registry, alice } = await deploy();
      const h = dniHash("12345678");

      await viem.assertions.emitWithArgs(
        registry.write.register([h], { account: alice.account }),
        registry,
        "CitizenRegistered",
        [alice.account.address, h] // timestamp se valida abajo
      );

      const stored = await registry.read.hashOf([alice.account.address]);
      expect(stored).to.equal(h);

      const registered = await registry.read.isRegistered([alice.account.address]);
      expect(registered).to.equal(true);
    });

    it("revierte si el hash es bytes32(0)", async () => {
      const { registry, alice } = await deploy();
      await expect(
        registry.write.register(
          ["0x0000000000000000000000000000000000000000000000000000000000000000"],
          { account: alice.account }
        )
      ).to.be.rejectedWith("CitizenRegistry: hash cero");
    });

    it("revierte si la dirección ya estaba registrada", async () => {
      const { registry, alice } = await deploy();
      const h = dniHash("12345678");
      await registry.write.register([h], { account: alice.account });

      await expect(
        registry.write.register([h], { account: alice.account })
      ).to.be.rejectedWith("CitizenRegistry: ya registrado");
    });

    it("permite que dos direcciones distintas registren hashes distintos", async () => {
      const { registry, alice, bob } = await deploy();
      const hA = dniHash("11111111");
      const hB = dniHash("22222222");

      await registry.write.register([hA], { account: alice.account });
      await registry.write.register([hB], { account: bob.account });

      expect(await registry.read.hashOf([alice.account.address])).to.equal(hA);
      expect(await registry.read.hashOf([bob.account.address])).to.equal(hB);
    });
  });

  describe("isRegistered + hashOf", () => {
    it("devuelve false / bytes32(0) si la dirección no se registró nunca", async () => {
      const { registry, alice } = await deploy();
      expect(await registry.read.isRegistered([alice.account.address])).to.equal(false);
      expect(await registry.read.hashOf([alice.account.address])).to.equal(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
    });
  });
});
EOF
```

- [ ] **Step 2**: Correr tests para ver el fail esperado (sin contrato todavía)

```bash
cd blockchain && pnpm exec hardhat test
```

Expected: fallan los 5 tests con "Contract not found: CitizenRegistry" o equivalente. Esto confirma TDD red phase.

- [ ] **Step 3**: Escribir el contrato mínimo para verde (green phase)

```bash
cat > blockchain/contracts/CitizenRegistry.sol <<'EOF'
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ICitizenRegistry} from "./interfaces/ICitizenRegistry.sol";

/// @title CitizenRegistry
/// @notice Registro on-chain de ciudadanos por hash de DNI.
/// @dev El hash se calcula off-chain (frontend o backend) como
///      keccak256(abi.encodePacked(dni, PUBLIC_SALT)). El contrato NO ve el DNI raw.
contract CitizenRegistry is ICitizenRegistry {
    /// @dev address => hash (bytes32(0) si no registrado).
    mapping(address => bytes32) private _hashes;

    /// @inheritdoc ICitizenRegistry
    function register(bytes32 dniHash) external {
        require(dniHash != bytes32(0), "CitizenRegistry: hash cero");
        require(_hashes[msg.sender] == bytes32(0), "CitizenRegistry: ya registrado");
        _hashes[msg.sender] = dniHash;
        emit CitizenRegistered(msg.sender, dniHash, block.timestamp);
    }

    /// @inheritdoc ICitizenRegistry
    function hashOf(address citizen) external view returns (bytes32) {
        return _hashes[citizen];
    }

    /// @inheritdoc ICitizenRegistry
    function isRegistered(address citizen) external view returns (bool) {
        return _hashes[citizen] != bytes32(0);
    }
}
EOF
```

- [ ] **Step 4**: Correr tests, verificar verde

```bash
pnpm exec hardhat test test/CitizenRegistry.test.ts
```

Expected:
```
  CitizenRegistry
    register
      ✔ permite que una dirección registre un hash y emite CitizenRegistered
      ✔ revierte si el hash es bytes32(0)
      ✔ revierte si la dirección ya estaba registrada
      ✔ permite que dos direcciones distintas registren hashes distintos
    isRegistered + hashOf
      ✔ devuelve false / bytes32(0) si la dirección no se registró nunca

  5 passing
```

- [ ] **Step 5**: Stage + commit

```bash
cd ..
git add blockchain/contracts/CitizenRegistry.sol blockchain/test/CitizenRegistry.test.ts
git commit -m "blockchain(B.4): CitizenRegistry contract + 5 tests (register/hashOf/isRegistered)"
```

---

## Task B.5 — Interfaz `IVote.sol`

**Files**: Create `blockchain/contracts/interfaces/IVote.sol`.

- [ ] **Step 1**: Crear interfaz

```bash
cat > blockchain/contracts/interfaces/IVote.sol <<'EOF'
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IVote
/// @notice Voto consultivo sobre una única propuesta legislativa preseeded en el
///         constructor. Sprint 1 — multi-propuesta dinámica defer a Sprint 2.
interface IVote {
    enum Choice { Yes, No, Abstain }

    struct Proposal {
        uint256 id;
        string title;
        string ipfsCid;
        uint256 openAt;
        uint256 closeAt;
        bool closed;
    }

    event VoteCast(address indexed voter, uint256 indexed proposalId, Choice choice);
    event ProposalClosed(uint256 indexed proposalId, uint256 yes, uint256 no, uint256 abstain);

    function castVote(uint256 proposalId, Choice choice) external;
    function getProposal(uint256 id) external view returns (Proposal memory);
    function tally(uint256 id) external view returns (uint256 yes, uint256 no, uint256 abstain);
    function close(uint256 id) external;
}
EOF
```

- [ ] **Step 2**: Compilar

```bash
cd blockchain && pnpm exec hardhat compile
```

Expected: `Compiled 1 Solidity file successfully` (más los anteriores en cache).

- [ ] **Step 3**: Stage + commit

```bash
cd ..
git add blockchain/contracts/interfaces/IVote.sol
git commit -m "blockchain(B.5): interface IVote con Choice/Proposal + 4 funciones + 2 eventos"
```

---

## Task B.6 — `Vote.sol` happy path (deploy + getProposal + tally inicial)

**Files**:
- Create: `blockchain/test/Vote.test.ts`
- Create: `blockchain/contracts/Vote.sol`

- [ ] **Step 1**: Tests primero (TDD red)

```bash
cat > blockchain/test/Vote.test.ts <<'EOF'
import { expect } from "chai";
import { network } from "hardhat";
import { keccak256, encodePacked, parseAbiItem } from "viem";

const { viem } = await network.connect();

const PUBLIC_SALT = "ssc-antipereza-2026-publico";
const PROPOSAL_TITLE = "Reforma del artículo X de la Constitución";
const IPFS_CID = "bafy...";

function dniHash(dni: string): `0x${string}` {
  return keccak256(encodePacked(["string", "string"], [dni, PUBLIC_SALT]));
}

async function nowSec(): Promise<bigint> {
  const publicClient = await viem.getPublicClient();
  const block = await publicClient.getBlock();
  return block.timestamp;
}

async function deployFixture() {
  const registry = await viem.deployContract("CitizenRegistry");
  const openAt = await nowSec();
  const closeAt = openAt + 7n * 24n * 3600n; // +7 días

  const vote = await viem.deployContract("Vote", [
    registry.address,
    PROPOSAL_TITLE,
    IPFS_CID,
    openAt,
    closeAt,
  ]);

  const [owner, alice, bob, carol] = await viem.getWalletClients();

  // Registrar alice y bob para los tests; carol queda fuera.
  await registry.write.register([dniHash("11111111")], { account: alice.account });
  await registry.write.register([dniHash("22222222")], { account: bob.account });

  return { registry, vote, owner, alice, bob, carol, openAt, closeAt };
}

describe("Vote", () => {
  describe("deploy (constructor seedea propuesta única)", () => {
    it("deja la propuesta accesible vía getProposal con id=1", async () => {
      const { vote, openAt, closeAt } = await deployFixture();
      const p = await vote.read.getProposal([1n]);
      expect(p.id).to.equal(1n);
      expect(p.title).to.equal(PROPOSAL_TITLE);
      expect(p.ipfsCid).to.equal(IPFS_CID);
      expect(p.openAt).to.equal(openAt);
      expect(p.closeAt).to.equal(closeAt);
      expect(p.closed).to.equal(false);
    });

    it("tally inicial es 0/0/0", async () => {
      const { vote } = await deployFixture();
      const [yes, no, abstain] = await vote.read.tally([1n]);
      expect(yes).to.equal(0n);
      expect(no).to.equal(0n);
      expect(abstain).to.equal(0n);
    });
  });
});
EOF
```

- [ ] **Step 2**: Correr tests, ver fail (sin contrato Vote)

```bash
cd blockchain && pnpm exec hardhat test test/Vote.test.ts
```

Expected: 2 tests fallan con "Contract not found: Vote".

- [ ] **Step 3**: Implementar `Vote.sol` con constructor + getProposal + tally

```bash
cat > blockchain/contracts/Vote.sol <<'EOF'
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IVote} from "./interfaces/IVote.sol";
import {ICitizenRegistry} from "./interfaces/ICitizenRegistry.sol";

/// @title Vote
/// @notice Voto consultivo sobre una única propuesta preseeded en el constructor.
contract Vote is IVote {
    /// @notice Registro de ciudadanos al que el contrato consulta para autorizar.
    ICitizenRegistry public immutable registry;

    /// @dev Mapping id => Proposal. Sprint 1 sólo tiene id=1.
    mapping(uint256 => Proposal) private _proposals;

    /// @dev Tallies por propuesta.
    mapping(uint256 => uint256) private _yesCount;
    mapping(uint256 => uint256) private _noCount;
    mapping(uint256 => uint256) private _abstainCount;

    /// @dev Por (proposalId, voter) marca si ya votó.
    mapping(uint256 => mapping(address => bool)) private _voted;

    constructor(
        address registryAddr,
        string memory title,
        string memory ipfsCid,
        uint256 openAt,
        uint256 closeAt
    ) {
        require(registryAddr != address(0), "Vote: registry cero");
        require(closeAt > openAt, "Vote: closeAt <= openAt");
        require(bytes(title).length > 0, "Vote: title vacio");

        registry = ICitizenRegistry(registryAddr);
        _proposals[1] = Proposal({
            id: 1,
            title: title,
            ipfsCid: ipfsCid,
            openAt: openAt,
            closeAt: closeAt,
            closed: false
        });
    }

    /// @inheritdoc IVote
    function getProposal(uint256 id) external view returns (Proposal memory) {
        return _proposals[id];
    }

    /// @inheritdoc IVote
    function tally(uint256 id) external view returns (uint256 yes, uint256 no, uint256 abstain) {
        yes = _yesCount[id];
        no = _noCount[id];
        abstain = _abstainCount[id];
    }

    /// @inheritdoc IVote
    function castVote(uint256 proposalId, Choice choice) external {
        Proposal storage p = _proposals[proposalId];
        require(p.id != 0, "Vote: propuesta inexistente");
        require(!p.closed, "Vote: propuesta cerrada");
        require(block.timestamp >= p.openAt, "Vote: aun no abierta");
        require(block.timestamp <= p.closeAt, "Vote: ya termino");
        require(registry.isRegistered(msg.sender), "Vote: no registrado");
        require(!_voted[proposalId][msg.sender], "Vote: ya votaste");

        _voted[proposalId][msg.sender] = true;
        if (choice == Choice.Yes) _yesCount[proposalId]++;
        else if (choice == Choice.No) _noCount[proposalId]++;
        else _abstainCount[proposalId]++;

        emit VoteCast(msg.sender, proposalId, choice);
    }

    /// @inheritdoc IVote
    function close(uint256 id) external {
        Proposal storage p = _proposals[id];
        require(p.id != 0, "Vote: propuesta inexistente");
        require(!p.closed, "Vote: ya cerrada");
        require(block.timestamp > p.closeAt, "Vote: aun activa");

        p.closed = true;
        emit ProposalClosed(id, _yesCount[id], _noCount[id], _abstainCount[id]);
    }
}
EOF
```

- [ ] **Step 4**: Correr tests, verificar verde

```bash
pnpm exec hardhat test test/Vote.test.ts
```

Expected: 2 tests pasan.

- [ ] **Step 5**: Stage + commit

```bash
cd ..
git add blockchain/contracts/Vote.sol blockchain/test/Vote.test.ts
git commit -m "blockchain(B.6): Vote contract + 2 tests (constructor + getProposal + tally inicial)"
```

---

## Task B.7 — `Vote.castVote` happy path + tests

**Files**: Modify `blockchain/test/Vote.test.ts` (agregar `describe("castVote")`).

- [ ] **Step 1**: Agregar tests al describe ya existente

Antes del último `});` que cierra `describe("Vote", ...)`, agregar:

```typescript
  describe("castVote — happy path", () => {
    it("acepta Yes de un registrado y emite VoteCast + actualiza tally", async () => {
      const { vote, alice } = await deployFixture();
      const tx = await vote.write.castVote([1n, 0], { account: alice.account }); // 0 = Yes

      const [yes, no, abstain] = await vote.read.tally([1n]);
      expect(yes).to.equal(1n);
      expect(no).to.equal(0n);
      expect(abstain).to.equal(0n);
    });

    it("acepta votos de dos registrados distintos y suma correcto", async () => {
      const { vote, alice, bob } = await deployFixture();
      await vote.write.castVote([1n, 0], { account: alice.account }); // Yes
      await vote.write.castVote([1n, 1], { account: bob.account });   // No

      const [yes, no, abstain] = await vote.read.tally([1n]);
      expect(yes).to.equal(1n);
      expect(no).to.equal(1n);
      expect(abstain).to.equal(0n);
    });

    it("acepta Abstain (Choice=2)", async () => {
      const { vote, alice } = await deployFixture();
      await vote.write.castVote([1n, 2], { account: alice.account });
      const [yes, no, abstain] = await vote.read.tally([1n]);
      expect(yes + no).to.equal(0n);
      expect(abstain).to.equal(1n);
    });
  });
```

> **Implementación**: El tape Edit del archivo se aplica de forma manual con tu editor — abrí `blockchain/test/Vote.test.ts` y agregá el `describe` antes del cierre. No hay diff snippet automatizable porque el contenido depende del estado tras Task B.6.

- [ ] **Step 2**: Correr todos los tests

```bash
cd blockchain && pnpm exec hardhat test
```

Expected: 5 + 2 + 3 = 10 tests pasan.

- [ ] **Step 3**: Stage + commit

```bash
cd ..
git add blockchain/test/Vote.test.ts
git commit -m "blockchain(B.7): 3 tests happy path castVote (Yes/No/Abstain)"
```

---

## Task B.8 — `Vote.castVote` revert paths + tests

**Files**: Modify `blockchain/test/Vote.test.ts`.

- [ ] **Step 1**: Agregar describe("castVote — reverts") antes del cierre de describe("Vote", ...)

```typescript
  describe("castVote — reverts", () => {
    it("revierte si la propuesta no existe", async () => {
      const { vote, alice } = await deployFixture();
      await expect(
        vote.write.castVote([999n, 0], { account: alice.account })
      ).to.be.rejectedWith("Vote: propuesta inexistente");
    });

    it("revierte si el votante no está registrado", async () => {
      const { vote, carol } = await deployFixture();
      await expect(
        vote.write.castVote([1n, 0], { account: carol.account })
      ).to.be.rejectedWith("Vote: no registrado");
    });

    it("revierte si el votante ya votó", async () => {
      const { vote, alice } = await deployFixture();
      await vote.write.castVote([1n, 0], { account: alice.account });
      await expect(
        vote.write.castVote([1n, 1], { account: alice.account })
      ).to.be.rejectedWith("Vote: ya votaste");
    });

    it("revierte si la propuesta aún no abrió", async () => {
      // Re-deploy con openAt en el futuro
      const registry = await viem.deployContract("CitizenRegistry");
      const [, alice] = await viem.getWalletClients();
      await registry.write.register([dniHash("11111111")], { account: alice.account });
      const futureOpen = (await nowSec()) + 3600n; // +1h
      const vote = await viem.deployContract("Vote", [
        registry.address, PROPOSAL_TITLE, IPFS_CID, futureOpen, futureOpen + 86400n,
      ]);
      await expect(
        vote.write.castVote([1n, 0], { account: alice.account })
      ).to.be.rejectedWith("Vote: aun no abierta");
    });

    it("revierte si la propuesta ya pasó closeAt", async () => {
      const { vote, alice, closeAt } = await deployFixture();
      const publicClient = await viem.getPublicClient();
      // Fast-forward time
      await publicClient.transport.request({
        method: "evm_setNextBlockTimestamp",
        params: [Number(closeAt + 10n)],
      });
      await publicClient.transport.request({ method: "evm_mine" });

      await expect(
        vote.write.castVote([1n, 0], { account: alice.account })
      ).to.be.rejectedWith("Vote: ya termino");
    });
  });
```

- [ ] **Step 2**: Correr tests

```bash
cd blockchain && pnpm exec hardhat test
```

Expected: 10 + 5 = 15 tests pasan.

- [ ] **Step 3**: Stage + commit

```bash
cd ..
git add blockchain/test/Vote.test.ts
git commit -m "blockchain(B.8): 5 tests revert castVote (sin propuesta · no registrado · doble · pre-open · post-close)"
```

---

## Task B.9 — `Vote.close` + tests (happy + reverts)

**Files**: Modify `blockchain/test/Vote.test.ts`.

- [ ] **Step 1**: Agregar describe("close", ...) antes del cierre

```typescript
  describe("close", () => {
    it("cierra propuesta tras closeAt y emite ProposalClosed", async () => {
      const { vote, alice, closeAt } = await deployFixture();
      await vote.write.castVote([1n, 0], { account: alice.account });

      const publicClient = await viem.getPublicClient();
      await publicClient.transport.request({
        method: "evm_setNextBlockTimestamp",
        params: [Number(closeAt + 10n)],
      });
      await publicClient.transport.request({ method: "evm_mine" });

      await vote.write.close([1n]);
      const p = await vote.read.getProposal([1n]);
      expect(p.closed).to.equal(true);
    });

    it("revierte si la propuesta aún está activa", async () => {
      const { vote } = await deployFixture();
      await expect(vote.write.close([1n])).to.be.rejectedWith("Vote: aun activa");
    });

    it("revierte si ya está cerrada", async () => {
      const { vote, closeAt } = await deployFixture();
      const publicClient = await viem.getPublicClient();
      await publicClient.transport.request({
        method: "evm_setNextBlockTimestamp",
        params: [Number(closeAt + 10n)],
      });
      await publicClient.transport.request({ method: "evm_mine" });

      await vote.write.close([1n]);
      await expect(vote.write.close([1n])).to.be.rejectedWith("Vote: ya cerrada");
    });

    it("revierte si la propuesta no existe", async () => {
      const { vote } = await deployFixture();
      await expect(vote.write.close([999n])).to.be.rejectedWith("Vote: propuesta inexistente");
    });
  });
```

- [ ] **Step 2**: Tests verde

```bash
cd blockchain && pnpm exec hardhat test
```

Expected: 15 + 4 = 19 tests pasan.

- [ ] **Step 3**: Stage + commit

```bash
cd ..
git add blockchain/test/Vote.test.ts
git commit -m "blockchain(B.9): 4 tests close (happy + 3 reverts)"
```

---

## Task B.10 — Revert tests del constructor de `Vote`

**Files**: Modify `blockchain/test/Vote.test.ts`.

- [ ] **Step 1**: Agregar describe("constructor — reverts") al inicio de describe("Vote")

```typescript
  describe("constructor — reverts", () => {
    it("revierte si registryAddr es 0x0", async () => {
      const openAt = await nowSec();
      await expect(
        viem.deployContract("Vote", [
          "0x0000000000000000000000000000000000000000",
          PROPOSAL_TITLE, IPFS_CID, openAt, openAt + 86400n,
        ])
      ).to.be.rejectedWith("Vote: registry cero");
    });

    it("revierte si closeAt <= openAt", async () => {
      const registry = await viem.deployContract("CitizenRegistry");
      const openAt = await nowSec();
      await expect(
        viem.deployContract("Vote", [
          registry.address, PROPOSAL_TITLE, IPFS_CID, openAt, openAt, // mismo timestamp
        ])
      ).to.be.rejectedWith("Vote: closeAt <= openAt");
    });

    it("revierte si title es string vacío", async () => {
      const registry = await viem.deployContract("CitizenRegistry");
      const openAt = await nowSec();
      await expect(
        viem.deployContract("Vote", [
          registry.address, "", IPFS_CID, openAt, openAt + 86400n,
        ])
      ).to.be.rejectedWith("Vote: title vacio");
    });
  });
```

- [ ] **Step 2**: Tests verde

```bash
cd blockchain && pnpm exec hardhat test
```

Expected: 19 + 3 = 22 tests pasan.

- [ ] **Step 3**: Stage + commit

```bash
cd ..
git add blockchain/test/Vote.test.ts
git commit -m "blockchain(B.10): 3 tests revert constructor Vote (registry 0 · closeAt<=openAt · title vacio)"
```

---

## Task B.11 — Coverage gate ≥80% statements + 100% branches en reverts

**Files**: ninguno (verificación + posibles tests adicionales si falla).

- [ ] **Step 1**: Correr coverage

```bash
cd blockchain && pnpm exec hardhat coverage
```

Expected output (último bloque del reporte):
```
File                                |  % Stmts | % Branch |  % Funcs |  % Lines |
------------------------------------|----------|----------|----------|----------|
 contracts/                         |     100  |    100   |    100   |     100  |
  CitizenRegistry.sol               |     100  |    100   |    100   |     100  |
  Vote.sol                          |     100  |    100   |    100   |     100  |
```

Si statements < 80% en algún contrato: revisar líneas no cubiertas (el reporte HTML en `coverage/index.html` las muestra resaltadas) y agregar tests. Si branches < 100% en revert paths: el revert no se testeó completamente — agregar caso.

- [ ] **Step 2**: Si falla el gate, iterar tests hasta verde

(no hay step específico — es loop)

- [ ] **Step 3**: Guardar reporte de coverage como artefacto

```bash
ls coverage/
```

Expected: `coverage/index.html`, `coverage/lcov.info`, `coverage.json`.

- [ ] **Step 4**: Configurar `package.json` scripts

Editar `blockchain/package.json` (con tu editor) y agregar:

```json
{
  "scripts": {
    "compile": "hardhat compile",
    "test": "hardhat test",
    "coverage": "hardhat coverage",
    "test:ci": "hardhat coverage && node -e 'const c=require(\"./coverage.json\"); const r=Object.values(c).reduce((a,b)=>({s:a.s+b.s.length,c:a.c+Object.values(b.s).filter(v=>v>0).length}),{s:0,c:0}); const pct=(r.c/r.s*100); if(pct<80){console.error(`Coverage ${pct.toFixed(2)}% < 80%`);process.exit(1)} console.log(`Coverage ${pct.toFixed(2)}% OK`);'"
  }
}
```

> **Nota**: El one-liner Node calcula coverage agregado y rompe con exit 1 si <80%. Vital para CI (Bloque I).

- [ ] **Step 5**: Verificar el nuevo script

```bash
pnpm test:ci
```

Expected: corre los tests, corre coverage, imprime `Coverage XX.XX% OK` con XX ≥ 80.

- [ ] **Step 6**: Stage + commit

```bash
cd ..
git add blockchain/package.json
git commit -m "blockchain(B.11): coverage gate ≥80% statements + script test:ci con exit 1"
```

---

## Task B.12 — Test E2E del flow completo (register → vote → close → tally)

**Files**: Create `blockchain/test/E2E.test.ts`.

- [ ] **Step 1**: Escribir test E2E que simula el demo

```bash
cat > blockchain/test/E2E.test.ts <<'EOF'
import { expect } from "chai";
import { network } from "hardhat";
import { keccak256, encodePacked } from "viem";

const { viem } = await network.connect();

const PUBLIC_SALT = "ssc-antipereza-2026-publico";

function dniHash(dni: string): `0x${string}` {
  return keccak256(encodePacked(["string", "string"], [dni, PUBLIC_SALT]));
}

describe("E2E — flow demo Sprint 1", () => {
  it("registra → vota 5 ciudadanos → cierra → tally correcto", async () => {
    const registry = await viem.deployContract("CitizenRegistry");

    const publicClient = await viem.getPublicClient();
    const openAt = (await publicClient.getBlock()).timestamp;
    const closeAt = openAt + 3600n;

    const vote = await viem.deployContract("Vote", [
      registry.address,
      "Demo Sprint 1",
      "bafy-demo",
      openAt,
      closeAt,
    ]);

    const wallets = await viem.getWalletClients();
    const voters = wallets.slice(1, 6); // 5 votantes (skip owner)

    // 1. Registro
    for (let i = 0; i < voters.length; i++) {
      await registry.write.register(
        [dniHash(`1000000${i}`)],
        { account: voters[i]!.account }
      );
    }

    // Confirmar registro
    for (const v of voters) {
      expect(await registry.read.isRegistered([v.account.address])).to.equal(true);
    }

    // 2. Votos: 3 Yes, 1 No, 1 Abstain
    await vote.write.castVote([1n, 0], { account: voters[0]!.account });
    await vote.write.castVote([1n, 0], { account: voters[1]!.account });
    await vote.write.castVote([1n, 0], { account: voters[2]!.account });
    await vote.write.castVote([1n, 1], { account: voters[3]!.account });
    await vote.write.castVote([1n, 2], { account: voters[4]!.account });

    // 3. Tally pre-close
    let [yes, no, abstain] = await vote.read.tally([1n]);
    expect(yes).to.equal(3n);
    expect(no).to.equal(1n);
    expect(abstain).to.equal(1n);

    // 4. Avanzar tiempo y cerrar
    await publicClient.transport.request({
      method: "evm_setNextBlockTimestamp",
      params: [Number(closeAt + 10n)],
    });
    await publicClient.transport.request({ method: "evm_mine" });

    await vote.write.close([1n]);
    const p = await vote.read.getProposal([1n]);
    expect(p.closed).to.equal(true);

    // 5. Tally post-close debe coincidir
    [yes, no, abstain] = await vote.read.tally([1n]);
    expect(yes).to.equal(3n);
    expect(no).to.equal(1n);
    expect(abstain).to.equal(1n);
  });
});
EOF
```

- [ ] **Step 2**: Correr E2E

```bash
cd blockchain && pnpm exec hardhat test test/E2E.test.ts
```

Expected: 1 test pasa.

- [ ] **Step 3**: Run all + coverage final

```bash
pnpm test:ci
```

Expected: ~23 tests verde + coverage ≥80%.

- [ ] **Step 4**: Stage + commit

```bash
cd ..
git add blockchain/test/E2E.test.ts
git commit -m "blockchain(B.12): test E2E flow demo Sprint 1 (5 votantes · 3Y/1N/1A)"
```

---

## Task B.13 — `gitleaks` pre-commit hook

**Files**: Create `.gitleaks.toml` (config) + `.husky/pre-commit` (hook).

> **Razón**: la PPT slide 17 menciona "No secrets hardcodeados" como criterio de QA. `gitleaks` corre en cada commit local + en CI (Bloque I) para detectar private keys, API keys, etc.

- [ ] **Step 1**: Instalar gitleaks como dev-dep del repo (via pnpm script wrapper)

> **Nota**: `gitleaks` no está en npm registry. Hay dos opciones:
> 1. Binario directo (`brew install gitleaks` / `winget install zricethezav.gitleaks` / `apt install gitleaks`).
> 2. Husky + pnpm script que invoque al binario.
> Sprint 1 va con opción 1 + verificación del binario disponible en el hook.

```bash
# Verificar instalación
gitleaks version 2>&1 | head -1 || echo "gitleaks no instalado — bajar de https://github.com/gitleaks/gitleaks/releases"
```

Si no está, el usuario lo instala manual antes de continuar.

- [ ] **Step 2**: Crear `.gitleaks.toml` con reglas custom mínimas

```bash
cat > .gitleaks.toml <<'EOF'
# CivicSys / SSC ANTIPEREZA · gitleaks config
title = "civicsys-gitleaks"

[allowlist]
description = "Allowlist patterns"
paths = [
    ".gitleaks.toml",
    "infra/.env.example",
    ".env.example",
    "**/.env.example",
]

[[rules]]
description = "Ethereum private key (0x + 64 hex)"
id = "eth-private-key"
regex = '''0x[a-fA-F0-9]{64}'''
[rules.allowlist]
regexes = [
    # Anvil default account 0 (bien conocida, no es secreto)
    '''0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80''',
    # Zero key como placeholder
    '''0x0{64}''',
]

[[rules]]
description = "Anthropic API key"
id = "anthropic-key"
regex = '''sk-ant-[a-zA-Z0-9-_]{32,}'''

[[rules]]
description = "OpenAI / OpenRouter API key"
id = "openai-key"
regex = '''sk-[a-zA-Z0-9]{32,}'''

[[rules]]
description = "Generic API token pattern"
id = "generic-token"
regex = '''(?i)(api[_-]?key|token|secret)\s*[:=]\s*['"][a-zA-Z0-9-_]{20,}['"]'''
EOF
```

- [ ] **Step 3**: Instalar Husky (gestor de hooks Git)

```bash
pnpm init  # si no hay package.json raíz
pnpm add -D husky
pnpm exec husky init
```

- [ ] **Step 4**: Configurar el pre-commit hook

```bash
cat > .husky/pre-commit <<'EOF'
#!/usr/bin/env sh
# CivicSys · pre-commit: gitleaks scan
if command -v gitleaks >/dev/null 2>&1; then
  gitleaks protect --staged --config .gitleaks.toml --redact -v || {
    echo ""
    echo "❌ gitleaks detectó posibles secretos. Revisá y arreglá antes de commitear."
    echo "   Si es un falso positivo, agregá la regla/path al allowlist en .gitleaks.toml"
    exit 1
  }
else
  echo "⚠️  gitleaks no instalado — saltando pre-commit scan. Bajalo de https://github.com/gitleaks/gitleaks/releases"
fi
EOF
chmod +x .husky/pre-commit
```

- [ ] **Step 5**: Smoke test del hook

```bash
# Crear archivo con un secreto fake
echo "ANTHROPIC_KEY=sk-ant-fake-1234567890abcdefghijklmnopqr" > test-leak.txt
git add test-leak.txt
git commit -m "test: should fail"
```

Expected: el commit es rechazado con mensaje de gitleaks.

```bash
# Limpiar
git reset HEAD test-leak.txt
rm test-leak.txt
```

- [ ] **Step 6**: Stage + commit del setup

```bash
git add .gitleaks.toml .husky/pre-commit package.json pnpm-lock.yaml
git commit -m "blockchain(B.13): gitleaks pre-commit hook con reglas eth-key/anthropic/openai/generic"
```

---

## Task B.14 — Cierre del Bloque B + state-sync intra-bloque

**Files**: ninguno (cierre + verificación).

- [ ] **Step 1**: Re-correr todos los tests + coverage

```bash
cd blockchain && pnpm test:ci
```

Expected: ~23 tests verde · coverage ≥80% statements · script termina con exit 0.

- [ ] **Step 2**: Confirmar git log del bloque

```bash
cd .. && git log --oneline blockchain/ | head -20
```

Expected: ~10 commits con prefijo `blockchain(B.X)`.

- [ ] **Step 3**: Verificar contratos compilados disponibles

```bash
ls blockchain/artifacts/contracts/
```

Expected: `CitizenRegistry.sol/`, `Vote.sol/`, `interfaces/` con sus `.json` y `.dbg.json`.

---

## Criterios de done del Bloque B

- [ ] `CitizenRegistry.sol` y `Vote.sol` compilan limpio en Solidity 0.8.24.
- [ ] 23+ tests verde · `pnpm exec hardhat test` 0 fallos.
- [ ] `pnpm exec hardhat coverage` reporta ≥80% statements + 100% branches en revert paths.
- [ ] `gitleaks` instalado + hook pre-commit funcional.
- [ ] `package.json` con script `test:ci` que falla si coverage < 80%.
- [ ] 14 commits del bloque (`blockchain(B.X)`).

**Gate humano antes de Bloque C**: Orlando revisa `pnpm test:ci` verde + coverage HTML (`coverage/index.html`). Aprueba pasar a deploy scripts.
