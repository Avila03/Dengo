import { test, expect } from "@playwright/test";
import { seedDemo, openDemo } from "./demo";

test("aberto sem internet, mostra um aviso em vez do erro do navegador", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "O modo offline do Playwright com service worker é confiável no Chromium.");
  await seedDemo(page);
  await openDemo(page, "/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.goto("/compras").catch(() => {});
  await expect(page.getByRole("heading", { name: "Sem internet no momento" })).toBeVisible();
  // Nenhuma página ou dado do casal é guardado em cache.
  expect(await page.evaluate(() => caches.keys())).toEqual([]);
  await context.setOffline(false);
  await expect(page.getByRole("button", { name: /Abrir demonstração/ })).toBeVisible({ timeout: 10_000 });
});
