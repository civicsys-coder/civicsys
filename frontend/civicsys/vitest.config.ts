/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: false,
    include: ["components/**/*.test.{ts,tsx}", "lib/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary", "html"],
      include: ["components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}", "hooks/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "components/ui/**",
        "lib/utils.ts",
        "lib/wagmi.ts",
        "lib/trpc.ts",
        // MatrixRain es un canvas decorativo (lluvia de 0/1): jsdom no provee
        // contexto 2D real, así que su loop de animación no es testeable en unit.
        // Sin lógica de negocio. Igual criterio que components/ui/.
        "components/MatrixRain.tsx",
      ],
      thresholds: {
        // El gate del spec es "statements >=80". lines/functions/branches
        // suelen seguir patrones similares con leves variaciones por el
        // line-counting de v8.
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 75,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
