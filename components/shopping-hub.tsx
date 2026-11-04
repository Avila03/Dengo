"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ShoppingBag, Wallet } from "lucide-react";
import { Shell } from "./shell";
import { Collection } from "./collection";
import { Finance } from "./finance";
import { PaymentCenter, PAYMENT_SECTIONS, type PaymentSection } from "./payment-center";

/** Dois destinos, sem abas financeiras dentro de outras abas. */
export function ShoppingHub() {
  const router = useRouter();
  const query = useSearchParams();
  const tab = ["gastos", "pagamentos"].includes(query.get("aba") || "") ? "pagamentos" : "lista";
  const requested = query.get("sec");
  const section: PaymentSection = PAYMENT_SECTIONS.some((item) => item.value === requested)
    ? requested as PaymentSection
    : query.get("aba") === "gastos" ? "extrato" : "vencimentos";

  const changeTab = (next: "lista" | "pagamentos") =>
    router.push(next === "lista" ? "/compras" : "/compras?aba=pagamentos", { scroll: false });

  const backToPayments = () =>
    router.push("/compras?aba=pagamentos", { scroll: false });

  return (
    <Shell>
      <header className="purchases-header purchases-simple-head">
        <div>
          <h1>Financeiro<span className="rose">.</span></h1>
          <p>As compras e os pagamentos de vocês, em ordem.</p>
        </div>
      </header>
      <nav role="group" aria-label="Escolher área financeira" className="purchases-tabs purchases-main-choice">
        <button type="button" aria-pressed={tab === "lista"}
          className={tab === "lista" ? "selected" : ""}
          onClick={() => changeTab("lista")}>
          <ShoppingBag size={18} /> Lista de compras
        </button>
        <button type="button" aria-pressed={tab === "pagamentos"}
          className={tab === "pagamentos" ? "selected" : ""}
          onClick={() => changeTab("pagamentos")}>
          <Wallet size={18}/> Pagamentos
        </button>
      </nav>

      {tab === "lista" ? (
        <Collection kind="shopping" embedded />
      ) : (
        <div className="purchases-payment-content">
          {section !== "vencimentos" ? (
            <button type="button" className="purchases-back"
              onClick={backToPayments}>
              <ArrowLeft size={17}/> Voltar aos pagamentos
            </button>
          ) : null}
          {section === "extrato" ? <Finance embedded /> : <PaymentCenter section={section} key={section} />}
        </div>
      )}
    </Shell>
  );
}
