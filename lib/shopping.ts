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
    shareFirst: number;
    paid: boolean;
    date: string;
    category: string;
    method?: PayMethod;
    names: [string, string];
  },
): Draft {
  if (item.kind !== "shopping") throw new Error("Escolha um item de compras.");
  if (!isDate(details.date)) throw new Error("Escolha uma data válida.");
  if (![0, 1].includes(details.payer) || !Number.isInteger(details.shareFirst) || details.shareFirst < 0 || details.shareFirst > 10000)
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

export const SHOPPING_UNITS = [
  ["un","unidade(s)"], ["kg","kg"], ["g","g"], ["l","litro(s)"],
  ["ml","mL"], ["pacote","pacote(s)"], ["caixa","caixa(s)"], ["garrafa","garrafa(s)"],
] as const;
export function parseQuantity(text: string): number {
  const value=text.trim();
  if (!/^\d+(?:[.,]\d{1,3})?$/.test(value)) throw new Error("Use uma quantidade como 2 ou 1,5, com até três casas decimais.");
  const [whole,fraction=""]=value.replace(",",".").split(".");
  const quantity=Number(whole)*1000+Number(fraction.padEnd(3,"0"));
  if (!Number.isSafeInteger(quantity) || quantity<1 || quantity>1000000000) throw new Error("A quantidade deve ser maior que zero e menor ou igual a 1.000.000.");
  return quantity;
}
export function shoppingItemTotal(quantityMilli:number,unitPrice:number):number {
  if (!Number.isSafeInteger(quantityMilli) || quantityMilli<1 || !Number.isSafeInteger(unitPrice) || unitPrice<0) throw new Error("Quantidade ou preço inválido.");
  const total=Number((BigInt(quantityMilli)*BigInt(unitPrice)+500n)/1000n);
  if (total>100000000) throw new Error("O total deste item ultrapassa R$ 1.000.000,00.");
  return total;
}
export function quantityLabel(item:Entry):string {
  if (item.data?.quantityMilli===undefined) return "";
  const unit=SHOPPING_UNITS.find(([key])=>key===item.data?.unit)?.[1]||"unidade(s)";
  return new Intl.NumberFormat("pt-BR",{maximumFractionDigits:3}).format(item.data.quantityMilli/1000)+" "+unit;
}
