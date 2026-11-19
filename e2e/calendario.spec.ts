import { test, expect } from "@playwright/test";
import { seedDemo, openDemo, expectNoHorizontalOverflow, collectPageErrors } from "./demo";

test.beforeEach(async ({ page }) => { await seedDemo(page); });

test("calendário mostra próximas datas, faixas e o dia escolhido", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openDemo(page, "/calendario");
  const proximas = page.locator(".next-dates");
  await expect(proximas.getByRole("heading", { name: "Próximas datas" })).toBeVisible();
  await expect(proximas.locator(".next-date")).toHaveCount(3);
  await expect(proximas.locator(".next-date").first()).toContainText("Viagem a Gramado");
  // A viagem aparece como faixa em três dias seguidos.
  await expect(page.locator(".month-sheet-bar.is-multi")).toHaveCount(3);
  // Tocar numa próxima data abre o dia certo.
  await proximas.locator(".next-date").first().click();
  await expect(page.locator(".agenda-day")).toContainText("Viagem a Gramado");
  await expect(page.locator(".agenda-day")).toContainText("dia 1/3");
  await expectNoHorizontalOverflow(page);
  expect(errors).toEqual([]);
});

test("fichas de categoria escondem e mostram", async ({ page }) => {
  await openDemo(page, "/calendario");
  const viagem = page.getByRole("button", { name: "Viagem", exact: true });
  await viagem.click();
  await expect(viagem).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".month-sheet-bar.is-multi")).toHaveCount(0);
  await expect(page.locator(".next-date").first()).not.toContainText("Viagem a Gramado");
  await viagem.click();
  await expect(page.locator(".month-sheet-bar.is-multi")).toHaveCount(3);
});

test("aba Próximos agrupa por semana e abre detalhes", async ({ page }) => {
  await openDemo(page, "/calendario");
  await page.getByRole("button", { name: "Próximos", exact: true }).click();
  await expect(page.locator(".agenda-group h2").first()).toHaveText("Esta semana");
  await page.getByRole("button", { name: "Ver detalhes de Viagem a Gramado" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("link", { name: /Google Agenda/ })).toBeVisible();
  await expect(dialog.getByRole("button", { name: /Baixar \.ics/ })).toBeVisible();
});
