import { test } from "node:test";
import assert from "node:assert/strict";
import type { Entry } from "../lib/model.ts";
import {
  makePurchaseExpense, plannedShoppingTotal,
  relatedShoppingExpense, shoppingStatus,
} from "../lib/shopping.ts";
import { balance, money, monthlySummary } from "../lib/finance.ts";

const item: Entry = {
  id: "shopping-1",
  kind: "shopping", title: "Café", detail: "2 pacotes",
  assignee: "Bruno", due: "", done: false,
  created_at: "2026-11-03T12:00:00Z",
  data: { budget: 3900 },
};
test("shopping items can save a budget without counting it as paid expense", () => {
  assert.equal(plannedShoppingTotal([item]), 3900);
  assert.equal(shoppingStatus(item, [item]), "planned");
  assert.equal(monthlySummary([item], "2026-11").total, 0);
  assert.equal(money(item.data?.budget || 0), "R$ 39,00");
});
test("registering a paid purchase links the list item, payment and balance", () => {
  const draft = makePurchaseExpense(item, {
    amount: "48,25", payer: 0, shareFirst: 5000,
    paid: true, date: "2026-11-03", category: "Mercado",
    names: ["Bruno", "Par"],
  });
  assert.equal(draft.kind, "expense");
  assert.equal(draft.title, item.title);
  assert.equal(draft.data?.amount, 4825);
  assert.equal(draft.data?.sourceId, item.id);
  assert.equal(draft.data?.shareFirst, 5000);
  const expense: Entry = {
    ...draft, id: "expense-1", created_at: "2026-11-03T12:01:00Z",
  };
  const bought: Entry = { ...item, done: true };
  assert.equal(shoppingStatus(bought, [bought, expense]), "paid");
  assert.equal(relatedShoppingExpense(bought, [expense])?.id, "expense-1");
  assert.equal(plannedShoppingTotal([bought, expense]), 0);
  assert.equal(monthlySummary([bought, expense], "2026-11").total, 4825);
  assert.equal(balance([bought, expense]), 2412);
});
test("unpaid purchases are shown separately and excluded from financial balance", () => {
  const draft = makePurchaseExpense(item, {
    amount: "75", payer: 1, shareFirst: 10000,
    paid: false, date: "2026-11-03", category: "Casa",
    names: ["Bruno", "Par"],
  });
  const expense: Entry = {
    ...draft, id: "expense-2", created_at: "2026-11-03T12:01:00Z",
  };
  const bought = { ...item, done: true };
  assert.equal(shoppingStatus(bought, [bought, expense]), "payment-pending");
  assert.equal(monthlySummary([expense], "2026-11").total, 0);
  assert.equal(balance([expense]), 0);
  assert.equal(shoppingStatus(bought, [bought]), "bought");
});
test("purchase registration rejects incorrect amounts and dates", () => {
  const options = {
    amount: "0", payer: 0 as const, shareFirst: 5000 as const,
    paid: true, date: "2026-11-03", category: "Mercado",
    names: ["Bruno", "Par"] as [string, string],
  };
  assert.throws(() => makePurchaseExpense(item, options), /valor|limite/i);
  assert.throws(() => makePurchaseExpense(item, { ...options, amount: "5", date: "2026-02-30" }), /data válida/);
  assert.throws(() => makePurchaseExpense({ ...item, kind:"task" }, { ...options, amount: "5" }), /compras/);
});
