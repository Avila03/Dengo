import { test, expect } from "@playwright/test";
import { seedDemo, openDemo, ENTRIES_KEY, collectPageErrors } from "./demo";

test.describe("com dados de exemplo", () => {
test.beforeEach(async ({ page }) => {
  await seedDemo(page);
});

test("cria, conclui e reabre uma responsabilidade", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openDemo(page, "/compromissos");
  await page.getByRole("button", { name: "Nova responsabilidade" }).click();
  await page.getByLabel("Nome da responsabilidade").fill("Pagar a conta de luz");
  await page.getByLabel("Quem vai cuidar?").selectOption("Ana");
  await page.getByRole("button", { name: "Salvar" }).click();

  const concluir = page.getByRole("button", { name: "Concluir Pagar a conta de luz" });
  await expect(concluir).toBeVisible();
  await concluir.click();

  await page.getByRole("group", { name: "Filtrar lista" }).getByRole("button", { name: "Concluídas" }).click();
  const reabrir = page.getByRole("button", { name: "Reabrir Pagar a conta de luz" });
  await expect(reabrir).toBeVisible();
  await reabrir.click();
  await page.getByRole("group", { name: "Filtrar lista" }).getByRole("button", { name: "Pendentes" }).click();
  await expect(page.getByRole("button", { name: "Concluir Pagar a conta de luz" })).toBeVisible();

  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "[]"), ENTRIES_KEY);
  expect(saved.some((e: { title: string; assignee: string }) =>
    e.title === "Pagar a conta de luz" && e.assignee === "Ana")).toBe(true);
  expect(errors).toEqual([]);
});

test("filtros por responsável separam as tarefas", async ({ page }) => {
  await openDemo(page, "/compromissos");
  const porPessoa = page.getByRole("group", { name: "Filtrar por responsável" });
  await porPessoa.getByRole("button", { name: "Dos dois" }).click();
  await expect(page.getByRole("button", { name: "Ver detalhes de Regar as plantas" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ver detalhes de Levar o carro na revisão" })).toBeHidden();
});

test("tarefa atrasada aparece destacada", async ({ page }) => {
  await openDemo(page, "/compromissos");
  const item = page.locator("li.entry", { hasText: "Levar o carro na revisão" });
  await expect(item).toHaveClass(/task-entry-overdue/);
  await expect(item).toContainText("Atrasada");
});

test("abre os detalhes de uma responsabilidade", async ({ page }) => {
  await openDemo(page, "/compromissos");
  await page.getByRole("button", { name: "Ver detalhes de Regar as plantas" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Regar as plantas");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("dados da demonstração sobrevivem a um recarregamento", async ({ page }) => {
  await openDemo(page, "/compromissos");
  await page.getByRole("button", { name: "Concluir Regar as plantas" }).click();
  await openDemo(page, "/compromissos");
  await page.getByRole("group", { name: "Filtrar lista" }).getByRole("button", { name: "Todos" }).click();
  await expect(page.getByRole("button", { name: "Reabrir Regar as plantas" })).toBeVisible();
});

});

test("tela vazia mostra só um botão de criar", async ({ page }) => {
  await seedDemo(page, { empty: true });
  await openDemo(page, "/compromissos");
  await expect(page.getByRole("button", { name: /Nova responsabilidade/ })).toHaveCount(1);
  await expect(page.getByRole("group", { name: "Filtrar lista" })).toHaveCount(0);
});

test("cola, mostra e tira um bilhete", async ({ page }) => {
  await seedDemo(page, { empty: true });
  await openDemo(page, "/");
  const campo = page.getByLabel(/Escrever um bilhete/);
  await campo.fill("Passa no mercado na volta?");
  await page.getByRole("button", { name: "Colar" }).click();
  const bilhete = page.locator(".note-latest");
  await expect(bilhete).toContainText("Passa no mercado na volta?");
  await expect(campo).toHaveValue("");
  await bilhete.getByRole("button", { name: "Tirar este bilhete" }).click();
  await expect(page.locator(".note-latest")).toHaveCount(0);
});
