import type { Page } from "@playwright/test";

// Inyecta un mock window.ethereum que firma con la private key Anvil cuenta 0.
// Sólo para tests E2E. NO usar en producción.
const ANVIL_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

export async function injectAnvilWallet(page: Page) {
  await page.addInitScript(`
    (() => {
      const accounts = ["${ANVIL_ADDRESS}"];
      let chainId = "0x7a69"; // 31337
      const listeners = {};
      // @ts-ignore
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
          // proxy directo al RPC Anvil
          const resp = await fetch("http://localhost:8545", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
          });
          const json = await resp.json();
          if (json.error) throw json.error;
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
