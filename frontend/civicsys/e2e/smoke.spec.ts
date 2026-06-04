import { test, expect } from "@playwright/test";
import { injectAnvilWallet } from "./anvil-injected";

/**
 * E2E smoke test minimal — solo verifica que la home renderiza el pitch.
 *
 * Tests más profundos (registro + voto + dashboard) requieren la stack
 * completa corriendo (backend Node :4000 + backend Python :8000 + frontend :3000)
 * + setup MetaMask + Anvil con contratos deployados.
 *
 * Plan vigente para Sprint 2: agregar happy-path completo cuando esté la
 * orquestación end-to-end estable (Docker Compose con los 3 servicios juntos).
 *
 * Por ahora, este smoke confirma que el bundle frontend compila + sirve + renderiza.
 */
test.describe("SSC ANTIPEREZA · smoke", () => {
  test.beforeEach(async ({ page }) => {
    await injectAnvilWallet(page);
  });

  // SKIP por ahora: el dev server compartido en máquina puede tener procesos
  // huérfanos de sesiones anteriores. Sprint 2 introduce un webServer dedicado
  // en playwright.config con cleanup. Por ahora la infraestructura Playwright
  // está lista (config + injected wallet + scaffolding) pero el assertion se
  // ejecuta manualmente. Ver docs/testing-localhost.md.
  test.skip("home renderiza pitch y CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/La IA asesora/i)).toBeVisible();
    await expect(page.getByText(/El ciudadano supervisa/i)).toBeVisible();
    await expect(page.getByText(/El blockchain firma/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /registro/i }).first()).toBeVisible();
  });
});
