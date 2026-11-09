import { expect, type Page } from "@playwright/test";

/** Chaves usadas pelo modo demonstração (lib/model.ts e lib/appearance.ts). */
export const ENTRIES_KEY = "dengo.demo.v1";
export const PREFS_KEY = "dengo.preferences.v1";
export const APPEARANCE_KEY = "dengo:appearance:v1:demo";

export const ROUTES = [
  { path: "/", heading: /Nosso dia|Hoje/i, nav: "Nosso dia" },
  { path: "/compromissos", heading: /Responsabilidades/i, nav: "Responsabilidades" },
  { path: "/compras", heading: /Financeiro|Compras|Lista de compras/i, nav: "Financeiro" },
  { path: "/lugares", heading: /lugares/i, nav: "Lugares" },
  { path: "/filmes", heading: /Filmes/i, nav: "Filmes" },
  { path: "/configuracoes", heading: /espaço|Configura/i, nav: null },
  { path: "/notificacoes", heading: /Notifica|Avisos/i, nav: null },
] as const;

type SeedOptions = { theme?: string; empty?: boolean };

/**
 * Prepara o armazenamento local antes do primeiro carregamento. Os dados só
 * são gravados se ainda não existirem, para que alterações feitas durante o
 * teste sobrevivam a navegações completas.
 */
export async function seedDemo(page: Page, options: SeedOptions = {}) {
  await page.addInitScript(
    ({ keys, theme, empty }) => {
      const day = (offset: number) => {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      };
      const now = new Date().toISOString();
      const base = (id: string, rest: Record<string, unknown>) => ({
        id, detail: "", due: "", done: false, created_at: now,
        created_by_slot: 0, updated_by_slot: 0, updated_at: now, ...rest,
      });
      const entries = empty ? [] : [
        base("e2e-task-1", { kind: "task", title: "Regar as plantas", assignee: "Nós dois", due: day(0) }),
        base("e2e-task-2", { kind: "task", title: "Levar o carro na revisão", assignee: "Ana", due: day(-2) }),
        base("e2e-task-3", { kind: "task", title: "Organizar o armário", assignee: "Bruno", due: day(5), done: true }),
        base("e2e-shop-1", { kind: "shopping", title: "Café", assignee: "Nós dois",
          data: { quantityMilli: 2000, unit: "un", unitPrice: 2490 } }),
        base("e2e-shop-2", { kind: "shopping", title: "Frutas da semana", assignee: "Ana" }),
        base("e2e-exp-1", { kind: "expense", title: "Mercado", assignee: "Bruno", due: day(-1), done: true,
          data: { amount: 18750, payer: 1, shareFirst: 5000, category: "Mercado", paymentMethod: "pix" } }),
        base("e2e-event-1", { kind: "event", title: "Jantar de aniversário", assignee: "Nós dois", due: day(3),
          data: { time: "20:00", eventRepeat: "none" } }),
        base("e2e-movie-1", { kind: "movie", title: "Filme de domingo", assignee: "Nós dois",
          data: { mediaType: "movie", watchStatus: "not_started" } }),
        base("e2e-place-1", { kind: "place", title: "Café da praça", assignee: "Nós dois",
          data: { placeCollection: "Cafés", favorite: true, address: "Rua das Flores, 10" } }),
      ];
      if (localStorage.getItem(keys.entries) === null)
        localStorage.setItem(keys.entries, JSON.stringify(entries));
      if (localStorage.getItem(keys.prefs) === null)
        localStorage.setItem(keys.prefs, JSON.stringify({
          title: "Casa de teste", names: ["Ana", "Bruno"], since: "2022-03-14", photo: "", budgets: {},
        }));
      if (theme) localStorage.setItem(keys.appearance, JSON.stringify({ theme }));
    },
    {
      keys: { entries: ENTRIES_KEY, prefs: PREFS_KEY, appearance: APPEARANCE_KEY },
      theme: options.theme ?? null,
      empty: !!options.empty,
    },
  );
}

/** Abre um endereço e passa pelo lobby da demonstração. */
export async function openDemo(page: Page, path = "/") {
  await page.goto(path);
  const enter = page.getByRole("button", { name: /Abrir demonstração/i });
  await enter.click();
  await expect(enter).toBeHidden();
}

/** Garante que nada força rolagem lateral, o problema mais comum no iPhone. */
export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const offenders = [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width || getComputedStyle(el).position === "fixed") return false;
        // Elementos dentro de áreas roláveis horizontais (chips, carrosséis) são permitidos.
        for (let p = el.parentElement; p; p = p.parentElement) {
          const s = getComputedStyle(p).overflowX;
          if (s === "auto" || s === "scroll" || s === "hidden" || s === "clip") return false;
        }
        return r.right > doc.clientWidth + 1 || r.left < -1;
      })
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join(".")}`);
    return { scroll: doc.scrollWidth, width: doc.clientWidth, offenders };
  });
  expect(overflow.offenders, `elementos fora da tela: ${overflow.offenders.join(", ")}`).toEqual([]);
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.width + 1);
}

/** Coleta erros de JavaScript da página para falhar o teste no final. */
export function collectPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon|manifest/i.test(m.text())) errors.push(m.text());
  });
  return errors;
}
