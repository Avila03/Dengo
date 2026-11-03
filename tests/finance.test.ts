import { test } from "node:test";
import assert from "node:assert/strict";
import { balance, parseMoney, monthlySummary } from "../lib/finance.ts";
import type { Entry } from "../lib/model.ts";
const expense = (
  amount: number,
  payer: 0 | 1,
  shareFirst = 5000,
  done = true,
): Entry => ({
  id: crypto.randomUUID(),
  kind: "expense",
  title: "Conta",
  detail: "",
  assignee: "A",
  due: "2026-11-03",
  done,
  created_at: "2026-11-03T12:00:00Z",
  data: { amount, payer, shareFirst, category: "Casa" },
});
test("money is parsed without floating point drift or ambiguous grouping", () => {
  assert.equal(parseMoney("100,01"), 10001);
  assert.equal(parseMoney("0.29"), 29);
  for (const v of ["1.000,00", "-10", "0", "1,999", "NaN"])
    assert.throws(() => parseMoney(v));
});
test("odd cent is assigned consistently and offsetting expenses cancel", () => {
  assert.equal(balance([expense(10001, 0)]), 5000);
  assert.equal(balance([expense(10001, 1)]), -5001);
  assert.equal(balance([expense(10000, 0), expense(10000, 1)]), 0);
});
test("custom splits include individual expenses and exclude future bills", () => {
  assert.equal(balance([expense(10000, 0, 2500)]), 7500);
  assert.equal(balance([expense(10000, 1, 0)]), 0);
  assert.equal(balance([expense(10000, 0, 10000)]), 0);
  assert.equal(balance([expense(10000, 0, 5000, false)]), 0);
});
test("repayments reduce balance in either direction", () => {
  const transfer: Entry = { ...expense(5000, 1), kind: "transfer" };
  assert.equal(balance([expense(10000, 0), transfer]), 0);
  assert.equal(
    balance([
      expense(10000, 1),
      { ...transfer, data: { amount: 5000, payer: 0 } },
    ]),
    0,
  );
});
test("monthly budgets count paid expenses only, not settlements", () => {
  const older = { ...expense(1000, 0), due: "2026-10-31" };
  const r = monthlySummary(
    [
      expense(3000, 0),
      expense(2000, 1),
      expense(9000, 0, 5000, false),
      older,
      { ...expense(1000, 0), kind: "transfer" },
    ],
    "2026-11",
  );
  assert.equal(r.total, 5000);
  assert.equal(r.categories.Casa, 5000);
});
