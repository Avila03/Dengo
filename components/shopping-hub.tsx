"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingBag, Wallet, Check, Receipt, CalendarClock } from "lucide-react";
import { Shell } from "./shell";
import { Collection } from "./collection";
import { Finance } from "./finance";
import { PaymentCenter, PAYMENT_SECTIONS, type PaymentSection } from "./payment-center";
import { useDengo } from "./provider";
import { money, monthlySummary } from "@/lib/finance";
import { plannedShoppingTotal, shoppingStatus } from "@/lib/shopping";
import { localToday } from "@/lib/model";
import { activeReminders, monthForecast } from "@/lib/payment-plans";

export function ShoppingHub() {
  const router = useRouter();
  const query = useSearchParams();
  const { entries } = useDengo();
  const tab = ["gastos","pagamentos"].includes(query.get("aba")||"") ? "pagamentos" : "lista";
  const sectionParam = query.get("sec");
  const section: PaymentSection = PAYMENT_SECTIONS.some(s=>s.value===sectionParam)
    ? sectionParam as PaymentSection
    : query.get("aba")==="gastos" ? "extrato":"vencimentos";
  const pending = entries.filter((e) => e.kind === "shopping" && !e.done).length;
  const bought = entries.filter((e) => e.kind === "shopping" && e.done).length;
  const spent = monthlySummary(entries, localToday().slice(0, 7)).total;
  const planned = plannedShoppingTotal(entries);
  const paymentPending = entries.filter((e) => e.kind === "shopping" &&
    shoppingStatus(e, entries) === "payment-pending").length;
  const reminders=activeReminders(entries,localToday());
  const financial=monthForecast(entries,localToday().slice(0,7));
  const changeTab=(next:"lista"|"pagamentos")=>{
    router.push(next==="pagamentos"?"/compras?aba=pagamentos":"/compras",{scroll:false});
  };
  const changeSection=(next:PaymentSection)=>{
    router.push("/compras?aba=pagamentos&sec="+next,{scroll:false});
  };
  return (
    <Shell>
      <section className="purchases-header">
        <div>
          <span className="eyebrow">NOSSA ORGANIZAÇÃO</span>
          <h1>Compras<span className="rose">.</span></h1>
          <p>Lista e pagamentos do casal.</p>
        </div>
        {pending > 0 || financial.remaining > 0 ? (
          <div className="clean-shopping-summary">
            {pending > 0 ? <span><ShoppingBag size={16}/><strong>{pending}</strong> a comprar</span> : null}
            {financial.remaining > 0 ? <span><CalendarClock size={16}/>
              <strong>{money(financial.remaining)}</strong> a pagar</span> : null}
          </div>
        ) : null}
      </section>
      {tab === "pagamentos" ? <details className="clean-summary-details">
        <summary>Ver resumo financeiro completo</summary>
        <div className="purchases-stats">
          <span><ShoppingBag size={18} /> <strong>{pending}</strong> pendentes</span>
          <span><Check size={18} /> <strong>{bought}</strong> comprados</span>
          <span><Receipt size={18} /> <strong>{money(spent)}</strong> pagos neste mês</span>
          {planned > 0 ? <span><ShoppingBag size={18} /> <strong>{money(planned)}</strong> previstos</span> : null}
          {paymentPending > 0 ? <span><Wallet size={18} /> <strong>{paymentPending}</strong> aguardando pagamento</span> : null}
          {financial.remaining>0 ? <span><CalendarClock size={18}/> <strong>{money(financial.remaining)}</strong> a pagar neste mês</span>:null}
        </div>
      </details> : null}
      {reminders.length>0 && tab==="lista" ? (
        <button type="button" className="shopping-reminder-shortcut"
          onClick={()=>changeTab("pagamentos")}>
          <CalendarClock size={17}/>
          <span>{reminders.length} {reminders.length===1?"pagamento precisa":"pagamentos precisam"} de atenção</span>
          <strong>Ver vencimentos</strong>
        </button>
      ):null}
      <div role="group" aria-label="Áreas de compras" className="purchases-tabs">
        <button type="button" aria-pressed={tab === "lista"}
          className={tab === "lista" ? "selected" : ""}
          onClick={() => changeTab("lista")}>
          <ShoppingBag size={18} /> Lista
        </button>
        <button type="button" aria-pressed={tab === "pagamentos"}
          className={tab === "pagamentos" ? "selected" : ""}
          onClick={() => changeTab("pagamentos")}>
          <Wallet size={18}/> Pagamentos
        </button>
      </div>
      {tab==="lista" ? <Collection kind="shopping" embedded /> : (
        <>
          <div className="payment-section-nav" role="group" aria-label="Organizar pagamentos">
            {PAYMENT_SECTIONS.map(item=>(
              <button type="button" key={item.value}
                className={section===item.value?"selected":""}
                aria-pressed={section===item.value}
                onClick={()=>changeSection(item.value)}>
                {item.title}
              </button>
            ))}
          </div>
          {section==="extrato" ? <Finance embedded/> : <PaymentCenter key={section} section={section}/>}
        </>
      )}
    </Shell>
  );
}
