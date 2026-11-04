"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingBag, Wallet, Check, Receipt } from "lucide-react";
import { Shell } from "./shell";
import { Collection } from "./collection";
import { Finance } from "./finance";
import { useDengo } from "./provider";
import { money, monthlySummary } from "@/lib/finance";
import { plannedShoppingTotal, shoppingStatus } from "@/lib/shopping";
import { localToday } from "@/lib/model";

export function ShoppingHub() {
  const router = useRouter();
  const query = useSearchParams();
  const { entries } = useDengo();
  const tab = query.get("aba") === "gastos" ? "gastos" : "lista";
  const pending = entries.filter((e) => e.kind === "shopping" && !e.done).length;
  const bought = entries.filter((e) => e.kind === "shopping" && e.done).length;
  const spent = monthlySummary(entries, localToday().slice(0, 7)).total;
  const planned = plannedShoppingTotal(entries);
  const paidPurchases = entries.filter((e) => e.kind === "shopping" &&
    shoppingStatus(e, entries) === "paid").length;
  const paymentPending = entries.filter((e) => e.kind === "shopping" &&
    shoppingStatus(e, entries) === "payment-pending").length;
  const changeTab = (next: "lista" | "gastos") => {
    router.push(next === "gastos" ? "/compras?aba=gastos" : "/compras", { scroll: false });
  };
  return (
    <Shell>
      <section className="purchases-header">
        <div>
          <span className="eyebrow">O QUE PRECISAMOS E O QUE JÁ FIZEMOS</span>
          <h1>Compras<span className="rose">.</span></h1>
          <p>Planejem, registrem o valor comprado e dividam os gastos sem sair daqui.</p>
        </div>
        <div className="purchases-stats">
          <span><ShoppingBag size={18} /> <strong>{pending}</strong> pendentes</span>
          <span><Check size={18} /> <strong>{bought}</strong> comprados</span>
          <span><Receipt size={18} /> <strong>{money(spent)}</strong> pagos neste mês</span>
          {planned > 0 ? <span><ShoppingBag size={18} /> <strong>{money(planned)}</strong> previstos</span> : null}
          {paymentPending > 0 ? <span><Wallet size={18} /> <strong>{paymentPending}</strong> aguardando pagamento</span> : null}
        </div>
      </section>
      <div role="group" aria-label="Áreas de compras" className="purchases-tabs">
        <button type="button" aria-pressed={tab === "lista"}
          className={tab === "lista" ? "selected" : ""}
          onClick={() => changeTab("lista")}>
          <ShoppingBag size={18} /> Lista de compras
        </button>
        <button type="button" aria-pressed={tab === "gastos"}
          className={tab === "gastos" ? "selected" : ""}
          onClick={() => changeTab("gastos")}>
          <Wallet size={18} /> Extrato e acertos
        </button>
      </div>
      {tab === "lista" ? <Collection kind="shopping" embedded /> : <Finance embedded />}
    </Shell>
  );
}
