# Bloque H · E2E Playwright (happy path completo)

**Objetivo**: Un escenario Playwright que ejecuta el flujo demo end-to-end contra Anvil local: conectar wallet → registrar DNI → votar → ver tally actualizado. Sirve como **bloqueante en CI** — si el flujo se rompe, no se mergea.

**Tareas**: 3
**LOC estimado**: ~150
**Dependencias**: B (contratos), E (backend), F (agents Python), G (frontend) — todos los servicios arriba.
**Coverage gate**: no aplica unit-coverage (E2E). El gate es "1 escenario verde".

---

## Task H.1 — Instalar Playwright + scripts

**Files**: Modify `frontend/civicsys/package.json`.

- [ ] **Step 1**: Instalar

```bash
cd frontend/civicsys
pnpm add -D @playwright/test@^1.49.0 dotenv@^17.0.0
pnpm exec playwright install chromium
```

- [ ] **Step 2**: Crear `playwright.config.ts`

```bash
cat > playwright.config.ts <<'EOF'
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,    // demo flow es secuencial
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
EOF
```

- [ ] **Step 3**: Agregar script `test:e2e` a `package.json` (editar manual)

```json
{
  "scripts": {
    "test:e2e": "playwright test"
  }
}
```

- [ ] **Step 4**: Commit

```bash
cd ../..
git add frontend/civicsys/package.json \
        frontend/civicsys/pnpm-lock.yaml \
        frontend/civicsys/playwright.config.ts
git commit -m "frontend(H.1): playwright config + script test:e2e"
```

---

## Task H.2 — Test E2E happy path con MetaMask-stub

**Files**: Create `frontend/civicsys/e2e/happy-path.spec.ts`.

> **Nota**: testear MetaMask real en Playwright es complejo (requiere `@synthetixio/synpress` o similar). Para Sprint 1 demo, **mockeamos** la conexión wallet con un mock injected provider que firma tx automáticamente con una private key conocida (la account 0 de Anvil). Esto cubre el flujo end-to-end sin depender de la extensión.

- [ ] **Step 1**: Crear `e2e/anvil-injected.ts` helper

```bash
mkdir -p frontend/civicsys/e2e
cat > frontend/civicsys/e2e/anvil-injected.ts <<'EOF'
import type { Page } from "@playwright/test";

// Inyecta un mock window.ethereum que firma con la private key Anvil cuenta 0.
// Sólo para tests E2E. NO usar en producción.
const ANVIL_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const ANVIL_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

export async function injectAnvilWallet(page: Page) {
  await page.addInitScript(`
    (() => {
      const accounts = ["${ANVIL_ADDRESS}"];
      let chainId = "0x7a69"; // 31337
      const listeners = {};
      window.ethereum = {
        isMetaMask: true,
        isConnected: () => true,
        request: async ({ method, params }) => {
          if (method === "eth_requestAccounts") return accounts;
          if (method === "eth_accounts") return accounts;
          if (method === "eth_chainId") return chainId;
          if (method === "wallet_switchEthereumChain") {
            chainId = params[0].chainId;
            (listeners.chainChanged || []).forEach(cb => cb(chainId));
            return null;
          }
          if (method === "eth_sendTransaction") {
            // Delegamos a Anvil directamente via fetch JSON-RPC
            const resp = await fetch("http://localhost:8545", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                jsonrpc: "2.0", id: 1, method: "eth_sendTransaction",
                params,
              }),
            });
            const json = await resp.json();
            return json.result;
          }
          // fallback: proxy directo a Anvil
          const resp = await fetch("http://localhost:8545", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
          });
          const json = await resp.json();
          return json.result;
        },
        on: (event, cb) => {
          listeners[event] = listeners[event] || [];
          listeners[event].push(cb);
        },
        removeListener: () => {},
      };
    })();
  `);
}
EOF
```

- [ ] **Step 2**: Test happy path

```bash
cat > frontend/civicsys/e2e/happy-path.spec.ts <<'EOF'
import { test, expect } from "@playwright/test";
import { injectAnvilWallet } from "./anvil-injected";

test.describe("SSC ANTIPEREZA happy path", () => {
  test.beforeEach(async ({ page }) => {
    await injectAnvilWallet(page);
  });

  test("home → conectar → registrar → votar → ver tally actualizado", async ({ page }) => {
    // 1. Home
    await page.goto("/");
    await expect(page.getByText(/La IA asesora/)).toBeVisible();

    // 2. Conectar wallet
    await page.getByRole("button", { name: /Conectar wallet/i }).click();
    await expect(page.getByText(/0xf39F.*9266/i)).toBeVisible({ timeout: 5000 });

    // 3. Ir a registro
    await page.getByRole("link", { name: /Empezar.*registro/i }).click();
    await expect(page).toHaveURL(/\/registro/);

    // 4. Ingresar DNI y registrar
    await page.getByLabel(/DNI/i).fill("12345678");
    await expect(page.getByText(/0x[a-f0-9]{6}/i)).toBeVisible();
    await page.getByRole("button", { name: /^Registrar$/i }).click();

    // Esperar confirmación on-chain (Anvil 2s block-time)
    await page.waitForTimeout(4000);

    // 5. Ir a la propuesta
    await page.goto("/propuesta/1");
    await expect(page.getByText(/Demo Sprint 1/i)).toBeVisible();

    // 6. Capturar tally inicial
    const yesInitial = await page.locator("text=/^\\d+$/").first().textContent();

    // 7. Votar Sí
    await page.getByRole("button", { name: /^Sí$/i }).click();
    await page.waitForTimeout(4000);

    // 8. Verificar tally incrementado
    await page.reload();
    const yesAfter = await page.locator("text=/^\\d+$/").first().textContent();
    expect(Number(yesAfter)).toBeGreaterThan(Number(yesInitial));
  });
});
EOF
```

- [ ] **Step 3**: Commit (no correr todavía — necesita infra + backend + agents arriba; lo dejamos para H.3)

```bash
cd ../..
git add frontend/civicsys/e2e/
git commit -m "frontend(H.2): E2E Playwright happy-path con Anvil-injected wallet · 1 escenario"
```

---

## Task H.3 — Correr E2E end-to-end + integrar al gate

**Files**: ninguno (orquestación + verificación).

- [ ] **Step 1**: Levantar toda la stack

```bash
# Terminal 1 — infra
bash infra/up.sh

# Terminal 2 — deploy contratos
cd blockchain && pnpm exec hardhat run scripts/deploy-local.ts --network localhost && cd ..

# Configurar .env backend con addresses
REG=$(jq -r '.contracts.CitizenRegistry' blockchain/deployments/localhost.json)
VOTE=$(jq -r '.contracts.Vote' blockchain/deployments/localhost.json)

cat > backend/.env <<EOF
CHAIN_ID=31337
REGISTRY_ADDRESS=$REG
VOTE_ADDRESS=$VOTE
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/civicsys
PORT=4000
EOF

cat > agents/.env <<EOF
CHAIN_ID=31337
REGISTRY_ADDRESS=$REG
VOTE_ADDRESS=$VOTE
RPC_URL=http://localhost:8545
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/civicsys
ANTHROPIC_API_KEY=sk-ant-PLACEHOLDER
EOF

# Terminal 3 — backend
cd backend && pnpm dev &

# Terminal 4 — agents
cd ../agents && source .venv/Scripts/activate && uvicorn app.main:app --port 8000 &

# Esperar a que ambos estén listos
sleep 5
```

- [ ] **Step 2**: Correr Playwright (levanta Next.js dev automáticamente per `webServer` config)

```bash
cd ../frontend/civicsys && pnpm test:e2e
```

Expected: 1 escenario verde · `1 passed`.

- [ ] **Step 3**: Tear down

```bash
pkill -f "tsx src/server.ts" || true
pkill -f "uvicorn app.main:app" || true
cd ../.. && bash infra/down.sh
```

- [ ] **Step 4**: No commit (es smoke test).

---

## Criterios de done del Bloque H

- [ ] Playwright instalado + configurado.
- [ ] `e2e/happy-path.spec.ts` corre verde end-to-end contra Anvil + backend + agents + frontend.
- [ ] `frontend/civicsys/e2e/anvil-injected.ts` provee mock wallet sin necesitar MetaMask real.

**Gate humano antes de Bloque I**: Orlando verifica `pnpm test:e2e` verde en frontend/civicsys/. Aprueba pasar a CI workflow.
