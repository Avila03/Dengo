import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

function src(path:string) {
  return readFileSync(new URL("../"+path,import.meta.url),"utf8");
}

test("shopping navigation has exactly two main destinations without nested tabs",()=>{
  const hub=src("components/shopping-hub.tsx");
  assert.match(hub,/Lista de compras/);
  assert.match(hub,/Pagamentos/);
  assert.match(hub,/className="purchases-tabs purchases-main-choice"/);
  assert.doesNotMatch(hub,/className="payment-section-nav"/);
  assert.doesNotMatch(hub,/className="clean-summary-details"/);
  assert.equal((hub.match(/aria-pressed=\{tab ===/g)||[]).length,2);
  assert.match(hub,/query\.get\("aba"\) === "gastos" \? "extrato"/);
  assert.match(hub,/PAYMENT_SECTIONS\.some/);
  assert.match(hub,/section !== "vencimentos" \?/);
  assert.match(hub,/backToPayments/);
});
test("payments summary displays one main amount, details are optional",()=>{
  const pc=src("components/payment-center.tsx");
  assert.match(pc,/className="payment-overview-value"/);
  assert.match(pc,/className="payment-overview-details"/);
  assert.match(pc,/Falta pagar/);
  assert.match(pc,/Previsto/);
  assert.match(pc,/Já pago/);
  assert.doesNotMatch(pc,/className="payment-forecast"/);
  assert.match(pc,/section === "vencimentos" \?/);
  assert.match(pc,/className="payment-detail-heading"/);
});
test("one Add payment action reveals three supported plan types",()=>{
  const pc=src("components/payment-center.tsx");
  assert.equal((pc.match(/className="primary payment-add-trigger"/g)||[]).length,1);
  assert.match(pc,/showCreateMenu \? \(/);
  assert.match(pc,/className="payment-create-options"/);
  assert.match(pc,/openNew\("subscription"\)/);
  assert.match(pc,/openNew\("installment"\)/);
  assert.match(pc,/openNew\("bill"\)/);
  assert.doesNotMatch(pc,/className="payment-quick-create"/);
});
test("next due list initially compact and expandable without losing payment actions",()=>{
  const pc=src("components/payment-center.tsx");
  assert.match(pc,/showAllDue \? dueList : dueList\.slice\(0,4\)/);
  assert.match(pc,/aria-expanded=\{showAllDue\}/);
  assert.match(pc,/dueList\.length>4/);
  assert.match(pc,/openCharge\(alert\.charge!\)/);
  assert.match(pc,/payStandalone\(alert\.expense!\)/);
  assert.match(pc,/planCharges\(entries,paymentTarget\.due,paymentTarget\.due\)/);
});
test("all financial destinations and deep links remain available",()=>{
  const pc=src("components/payment-center.tsx");
  const hub=src("components/shopping-hub.tsx");
  for(const link of ["assinaturas","parcelas","contas","extrato"]) {
    assert.ok(pc.includes('href="/compras?aba=pagamentos&sec='+link+'"'),link);
  }
  assert.match(hub,/section === "extrato" \? <Finance embedded \/>/);
  assert.match(hub,/<PaymentCenter section=\{section\}/);
  assert.match(pc,/<CleanSheet title="Registrar pagamento"/);
  assert.match(pc,/const plans=planKind\?planList\(entries,planKind\)/);
});
test("mobile payment layout is explicitly responsive",()=>{
  const css=src("app/clarity.css");
  for(const selector of [".purchases-main-choice",".purchases-back",
    ".payment-management-link",".payment-overview-details",
    ".payment-dashboard-due",".payment-add-trigger",
    ".payment-create-options"]) {
    assert.ok(css.includes(selector),selector);
  }
  assert.match(css,/\.payment-create-options\{grid-template-columns:1fr/);
});
