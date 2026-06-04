import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { webcrypto } from "node:crypto";

// jsdom no siempre expone Web Crypto (crypto.subtle). keystore.ts y
// face-embedding.ts lo necesitan. Polyfill desde node:crypto.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
}

afterEach(() => {
  cleanup();
});
