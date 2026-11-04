import type { Draft, Entry } from "./model.ts";
import { parseMoney } from "./finance.ts";
import type { PayMethod } from "./payment-plans.ts";
import { isDate } from "./model.ts";

export type ShoppingStatus = "planned" | "bought" | "payment-pending" | "paid";

export function relatedShoppingExpense(item: Entry, entries: Entry[]): Entry | undefined {
  if (item.kind !== "shopping") return undefined;
  return entries.find((entry) => entry.kind === "expense" &&
    entry.data?.sourceId === item.id);
}
export function shoppingStatus(item: Entry, entries: Entry[]): ShoppingStatus {
  const expense = relatedShoppingExpense(item, entries);
  if (expense) return expense.done ? "paid" : "payment-pending";
  return item.done ? "bought" : "planned";
}
export function plannedShoppingTotal(entries: Entry[]): number {
  return entries.filter((item) => item.kind === "shopping" && !item.done)
    .reduce((sum,item) => sum + (item.data?.budget || 0), 0);
}
/** Registrar a compra e seu gasto em uma única operação do backend. */
export function makePurchaseExpense(
  item: Entry,
  details: {
    amount: string;
    payer: 0 | 1;
    shareFirst: 0 | 5000 | 10000;
    paid: boolean;
    date: string;
    category: string;
    method?: PayMethod;
    names: [string, string];
  },
): Draft {
  if (item.kind !== "shopping") throw new Error("Escolha um item de compras.");
  if (!isDate(details.date)) throw new Error("Escolha uma data válida.");
  if (![0, 1].includes(details.payer) || ![0, 5000, 10000].includes(details.shareFirst))
    throw new Error("Escolha o responsável pelo pagamento e a divisão.");
  return {
    kind: "expense",
    title: item.title,
    detail: item.detail,
    assignee: details.names[details.payer],
    due: details.date,
    done: details.paid,
    data: {
      amount: parseMoney(details.amount),
      payer: details.payer,
      shareFirst: details.shareFirst,
      category: details.category || "Mercado",
      paymentMethod: details.method || "pix",
      recurrence: "none",
      sourceId: item.id,
    },
  };
}
