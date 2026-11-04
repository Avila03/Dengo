import type { Entry } from "./model";
export const CATEGORIES = [
  "Mercado",
  "Casa",
  "Lazer",
  "Transporte",
  "Saúde",
  "Viagens",
  "Outros",
];
export function parseSharePercent(text:string):number {
  if (!/^\d{1,3}(?:[.,]\d{1,2})?$/.test(text.trim())) throw new Error("Informe uma porcentagem entre 0 e 100, com até duas casas decimais.");
  const [whole,fraction=""]=text.trim().replace(",",".").split(".");
  const basis=Number(whole)*100+Number(fraction.padEnd(2,"0"));
  if(basis>10000)throw new Error("A divisão deve ficar entre 0 e 100%.");
  return basis;
}
export function splitAmount(amount:number, shareFirst:number):[number,number] {
  if(!Number.isSafeInteger(amount)||amount<0||!Number.isInteger(shareFirst)||shareFirst<0||shareFirst>10000)throw new Error("Valor ou divisão inválida.");
  const first=Number((BigInt(amount)*BigInt(shareFirst)+5000n)/10000n);
  return [first,amount-first];
}
export function parseMoney(value: string) {
  const v = value.trim().replace(/\s|R\$/g, "");
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(v))
    throw new Error("Use um valor como 123,45, sem separador de milhares.");
  const [whole, fraction = ""] = v.replace(",", ".").split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 100000000)
    throw new Error("Valor fora do limite permitido.");
  return cents;
}
export function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
// Positivo: primeira pessoa deve receber da segunda. Todos os cálculos são em centavos.
export function balance(entries: Entry[]) {
  return entries.reduce((sum, e) => {
    const d = e.data;
    if (!e.done || !d?.amount) return sum;
    if (e.kind === "transfer")
      return sum + (d.payer === 0 ? d.amount : -d.amount);
    if (e.kind !== "expense") return sum;
    const firstShare = Math.round((d.amount * (d.shareFirst ?? 5000)) / 10000);
    return sum + (d.payer === 0 ? d.amount - firstShare : -firstShare);
  }, 0);
}
export function monthlySummary(entries: Entry[], month: string) {
  const paid = entries.filter(
    (e) => e.kind === "expense" && e.done && e.due.startsWith(month),
  );
  return {
    total: paid.reduce((s, e) => s + (e.data?.amount || 0), 0),
    categories: Object.fromEntries(
      CATEGORIES.map((c) => [
        c,
        paid
          .filter((e) => (e.data?.category || "Outros") === c)
          .reduce((s, e) => s + (e.data?.amount || 0), 0),
      ]),
    ),
  };
}
