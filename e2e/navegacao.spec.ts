import { test, expect } from "@playwright/test";
import { ROUTES, seedDemo, openDemo, expectNoHorizontalOverflow, collectPageErrors } from "./demo";

test.beforeEach(async ({ page }) => {
  await seedDemo(page);
});

for (const route of ROUTES) {
  test(`${route.path} abre sem erros e sem rolagem lateral`, async ({ page }) => {
    const errors = collectPageErrors(page);
    await openDemo(page, route.path);
    await expect(page.locator("main h1, #conteudo h1").first()).toBeVisible();
    await expect(page.locator("main h1, #conteudo h1").first()).toContainText(route.heading);
    await expectNoHorizontalOverflow(page);
    expect(errors).toEqual([]);
  });
}

test("barra inferior do celular leva às cinco abas", async ({ page, isMobile }) => {
  test.skip(!isMobile, "A barra inferior só aparece no celular.");
  await openDemo(page, "/");
  const nav = page.getByRole("navigation", { name: "Navegação no celular" });
  await expect(nav).toBeVisible();

  // A barra precisa caber inteira dentro da tela, acima da área segura.
  const box = await nav.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
  expect(box!.width).toBeLessThanOrEqual(viewport.width + 1);

  for (const route of ROUTES.filter((r) => r.nav)) {
    const link = nav.getByRole("link", { name: route.nav! });
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${route.path === "/" ? "/$" : route.path}`));
    await expect(link).toHaveAttribute("aria-current", "page");
    // Alvos de toque de pelo menos 44 px (recomendação da Apple).
    const target = await link.boundingBox();
    expect(target!.height).toBeGreaterThanOrEqual(44);
  }
});

test("cabeçalho dá acesso a notificações e configurações", async ({ page }) => {
  await openDemo(page, "/");
  await page.getByRole("link", { name: "Preferências de notificações" }).first().click();
  await expect(page).toHaveURL(/\/notificacoes/);
  await page.getByRole("link", { name: "Configurações do casal" }).first().click();
  await expect(page).toHaveURL(/\/configuracoes/);
});

test("campos de formulário não provocam zoom no Safari", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Regra específica do iPhone.");
  await openDemo(page, "/compromissos");
  await page.getByRole("button", { name: "Nova responsabilidade" }).click();
  const small = await page.locator("form input, form select, form textarea").evaluateAll((fields) =>
    fields
      .filter((f) => (f as HTMLElement).offsetParent !== null)
      .filter((f) => parseFloat(getComputedStyle(f).fontSize) < 16)
      .map((f) => (f as HTMLInputElement).name || f.tagName),
  );
  expect(small, "campos com fonte menor que 16 px").toEqual([]);
});
