import { test, expect } from "@playwright/test";
import path from "node:path";
import { ROUTES, seedDemo, openDemo } from "./demo";

/**
 * Gera uma captura de cada tela em cada um dos 13 temas, no tamanho do iPhone.
 * Não compara pixels: serve de referência para revisar mudanças visuais
 * (por exemplo, a consolidação do CSS) comparando os artefatos do CI antes e depois.
 */
const THEMES = [
  "original", "noite", "lavanda", "salvia", "iris", "grafite", "floresta",
  "ametista", "cobalto", "atelier", "fucsia", "neon", "mono",
];
const DIR = process.env.CAPTURAS_DIR || "capturas";

test.describe.configure({ mode: "parallel" });

for (const theme of THEMES) {
  test(`capturas do tema ${theme}`, async ({ page }, info) => {
    test.skip(info.project.name !== "iphone", "Capturas só no tamanho iPhone 13.");
    await seedDemo(page, { theme });
    await openDemo(page, "/");
    await expect(page.locator("html")).toHaveAttribute("data-dengo-theme", theme);
    for (const route of ROUTES) {
      await openDemo(page, route.path);
      await page.locator("main h1, #conteudo h1").first().waitFor();
      // Animações e cursores piscando geram diferenças falsas entre execuções.
      await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}" });
      const name = route.path === "/" ? "inicio" : route.path.slice(1);
      await page.screenshot({ path: path.join(DIR, theme, `${name}.png`), fullPage: true });
    }
  });
}
