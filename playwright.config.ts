import { defineConfig, devices } from "@playwright/test";

/**
 * Testes de ponta a ponta no modo demonstração: sem Supabase, sem contas reais.
 * O build precisa ser feito antes com NEXT_PUBLIC_DEMO_MODE=true e sem as
 * variáveis do Supabase (veja `npm run e2e:build`).
 */
const port = Number(process.env.E2E_PORT || 3100);

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    // O Dengo é usado principalmente no Safari do iPhone.
    { name: "iphone", use: { ...devices["iPhone 13"] } },
    { name: "iphone-mini", use: { ...devices["iPhone SE"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /capturas/ },
  ],
  webServer: {
    command: `npx next start --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
