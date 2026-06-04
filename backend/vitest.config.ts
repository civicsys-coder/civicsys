import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary", "html"],
      include: ["src/routers/**/*.ts", "src/services/**/*.ts", "src/lib/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
    },
  },
});
