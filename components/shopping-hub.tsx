"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingBag, Wallet, Check, Receipt } from "lucide-react";
import { Shell } from "./shell";
import { Collection } from "./collection";
import { Finance } from "./finance";
import { useDengo } from "./provider";
import { money, monthlySummary } from "@/lib/finance";
import { localToday } from "@/lib/model";

export function ShoppingHub() {
  const router = useRouter();
  const query = useSearchParams();
  const { entries } = useDengo();
  const tab = query.get("aba") === "gastos" ? "gastos" : "lista";
  const pending = entries.filter((e) => e.kind === "shopping" && !e.done).length;
  const bought = entries.filter((e) => e.kind === "shopping" && e.done).length;
  const spent = monthlySummary(entries, localToday().slice(0, 7)).total;
  const changeTab = (next: "lista" | "gastos") => {
    router.push(next === "gastos" ? "/compras?aba=gastos" : "/compras", { scroll: false });
  };
  return (
    <Shell>
      <section className="purchases-header">
        <div>
          <span className="eyebrow">O QUE PRECISAMOS E O QUE JÁ FIZEMOS</span>
          <h1>Compras<span className="rose">.</span></h1>
          <p>Lista, histórico de compras e gastos do casal reunidos no mesmo lugar.</p>
        </div>
        <div className="purchases-stats">
          <span><ShoppingBag size={18} /> <strong>{pending}</strong> pendentes</span>
          <span><Check size={18} /> <strong>{bought}</strong> comprados</span>
          <span><Receipt size={18} /> <strong>{money(spent)}</strong> pagos neste mês</span>
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
          <Wallet size={18} /> Gastos e acertos
        </button>
      </div>
      {tab === "lista" ? <Collection kind="shopping" embedded /> : <Finance embedded />}
    </Shell>
  );
}
