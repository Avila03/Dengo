"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Bell, CalendarClock, Check, CircleDollarSign, CreditCard, Pause,
  Pencil, Plus, Repeat2, Play, Receipt, Trash2, X, AlertCircle, ArrowRight,
} from "lucide-react";
import { useDengo } from "./provider";
import { CleanSheet } from "./clean-sheet";
import { DeleteButton } from "./ui";
import { type Draft, type Entry, localToday } from "@/lib/model";
import { addMonths } from "@/lib/model";
import { CATEGORIES, money, parseMoney } from "@/lib/finance";
import {
  type PlanCharge, type PlanKind, type PayMethod, type PlanStatus,
  PAYMENT_METHODS, PLAN_TYPE_LABEL, isPlan, planStatus,
  planList, planCharges, monthForecast, paymentAlerts, activeReminders,
  planChargeAmount, moneyOrEstimate, preparePlanDraft, paymentDraftForCharge,
  paymentMethodLabel,
} from "@/lib/payment-plans";

export type PaymentSection = "vencimentos" | "assinaturas" | "parcelas" | "contas" | "extrato";
export const PAYMENT_SECTIONS: {value:PaymentSection;title:string}[] = [
  {value:"vencimentos",title:"Vencimentos"},
  {value:"assinaturas",title:"Assinaturas"},
  {value:"parcelas",title:"Parcelas"},
  {value:"contas",title:"Contas fixas"},
  {value:"extrato",title:"Extrato e acertos"},
];

const defaultPlanKind:Record<string,PlanKind> = {
  assinaturas:"subscription",parcelas:"installment",contas:"bill",
};
const PLAN_STATUS_LABELS:Record<PlanStatus,string> = {
  active:"Ativo",paused:"Pausado",canceled:"Cancelado",
};
function asInputMoney(amount?:number) {
  return amount ? (amount/100).toFixed(2).replace(".",",") : "";
}
function dateDisplay(date:string) {
  return new Date(date+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"});
}
function entryDraft(e:Entry):Draft {
  return {kind:e.kind,title:e.title,detail:e.detail,assignee:e.assignee,
    due:e.due,done:e.done,data:e.data};
}

export function PaymentCenter({section}: {section:PaymentSection}) {
  const {entries,names,busy,add,update,remove,toggle} = useDengo();
  const today=localToday();
  const [month,setMonth]=useState(today.slice(0,7));
  const [formType,setFormType]=useState<PlanKind|null>(null);
  const [showCreateMenu,setShowCreateMenu]=useState(false);
  const [showAllDue,setShowAllDue]=useState(false);
  const [editing,setEditing]=useState<Entry|null>(null);
  const [formError,setFormError]=useState("");
  const [paymentTarget,setPaymentTarget]=useState<PlanCharge|null>(null);
  const [paymentError,setPaymentError]=useState("");
  const [statusNotice,setStatusNotice]=useState("");
  const projection=monthForecast(entries,month);
  const due=paymentAlerts(entries,today,45);
  const notifications=activeReminders(entries,today);
  const upcoming=due.filter(x=>x.daysAway>=0).slice(0,12);
  const overdue=due.filter(x=>x.overdue).slice(-6);
  const dueList=[...overdue,...upcoming];
  const visibleDue=showAllDue ? dueList : dueList.slice(0,4);
  const planKind=defaultPlanKind[section];
  const plans=planKind?planList(entries,planKind):[];
  const selectedPlan=editing && isPlan(editing)?editing:null;

  function openNew(kind:PlanKind) {
    setFormType(kind);setEditing(null);setFormError("");setShowCreateMenu(false);
    setPaymentTarget(null);setStatusNotice("");
    window.requestAnimationFrame(()=>document.getElementById("payment-plan-form")?.scrollIntoView({behavior:"smooth",block:"start"}));
  }
  function editPlan(plan:Entry) {
    setFormType(plan.data!.paymentPlanType!);setEditing(plan);
    setFormError("");setPaymentTarget(null);setStatusNotice("");
    window.requestAnimationFrame(()=>document.getElementById("payment-plan-form")?.scrollIntoView({behavior:"smooth",block:"start"}));
  }
  async function savePlan(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setFormError("");
    const f=new FormData(event.currentTarget);
    if(!formType)return;
    try {
      const previousPayments=selectedPlan?entries.filter(e=>
        e.kind==="expense" && e.data?.paymentPlanId===selectedPlan.id):[];
      const count=Number(f.get("count")||2);
      if(previousPayments.some(e=>(e.data?.paymentCycle??-1)>=count) && formType==="installment") {
        setFormError("O número de parcelas não pode ser menor que as já registradas.");
        return;
      }
      const draft=preparePlanDraft({
        kind:formType,
        title:String(f.get("title")||""),
        detail:String(f.get("detail")||""),
        due:String(f.get("due")||selectedPlan?.due||""),
        amount:String(f.get("amount")||""),
        frequency:String(f.get("frequency")||"monthly") as "monthly"|"yearly",
        count,
        payer:Number(f.get("payer")||0) as 0|1,
        shareFirst:Math.round(Number(f.get("share")||50)*100),
        category:String(f.get("category")||"Casa"),
        method:String(f.get("method")||"pix") as PayMethod,
        remind:Number(f.get("remind")||0) as 0|1|3|7,
        names:names as [string,string],
      });
      if(!draft.title)throw new Error("Dê um nome ao pagamento.");
      const next=selectedPlan?{
        ...draft,
        data:{...draft.data,planStatus:selectedPlan.data?.planStatus||"active"},
      }:draft;
      const ok=selectedPlan?await update(selectedPlan,next):await add(next);
      if(ok){setFormType(null);setEditing(null);setStatusNotice("Pagamento organizado com sucesso!");}
      else setFormError("Não foi possível salvar. Confira os valores.");
    }catch(error){setFormError(error instanceof Error?error.message:"Não foi possível salvar.");}
  }
  async function setStatus(plan:Entry,status:PlanStatus) {
    setStatusNotice("");
    const okay=await update(plan,{...entryDraft(plan),
      data:{...plan.data,planStatus:status}});
    if(okay)setStatusNotice(plan.title+": "+PLAN_STATUS_LABELS[status].toLowerCase()+".");
    else setStatusNotice("Não foi possível alterar o pagamento.");
  }
  async function savePayment(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setPaymentError("");
    if(!paymentTarget)return;
    const fresh=planCharges(entries,paymentTarget.due,paymentTarget.due).find(c=>
      c.plan.id===paymentTarget.plan.id && c.cycle===paymentTarget.cycle);
    if(!fresh){setPaymentError("Vencimento indisponível. Atualize a página.");return;}
    const f=new FormData(event.currentTarget);
    try {
      const amount=String(f.get("amount")||"");
      const method=String(f.get("method")||"pix") as PayMethod;
      const isPaid=f.get("paid")==="on";
      const paymentDate=String(f.get("paymentDate")||localToday());
      const draft=paymentDraftForCharge({...fresh,payment:undefined},{
        amount,method,paid:isPaid,names:names as [string,string],paidOn:paymentDate,
      });
      const ok=fresh.payment ? await update(fresh.payment,{
        ...draft,
        data:{...fresh.payment.data,...draft.data},
      }) : await add(draft);
      if(ok) {
        setPaymentTarget(null);
        setStatusNotice(isPaid?"Pagamento registrado!":"Pagamento salvo como pendente.");
      } else setPaymentError("Não foi possível salvar o pagamento. Confira se ele já foi registrado.");
    }catch(error){setPaymentError(error instanceof Error?error.message:"Verifique os dados.");}
  }
  function openCharge(charge:PlanCharge) {
    setPaymentTarget(charge);setPaymentError("");setFormType(null);
    window.requestAnimationFrame(()=>document.getElementById("plan-payment-form")?.scrollIntoView({behavior:"smooth",block:"start"}));
  }
  async function payStandalone(expense:Entry) {
    if(expense.done)return;
    await toggle(expense);
  }
  const paidCount=(plan:Entry)=>entries.filter(e=>e.kind==="expense" &&
    e.data?.paymentPlanId===plan.id && e.done).length;
  const registeredCount=(plan:Entry)=>entries.filter(e=>e.kind==="expense" &&
    e.data?.paymentPlanId===plan.id).length;

  return (
    <section className="payment-center">
      {section === "vencimentos" ? (
        <>
          <div className="payment-overview-heading">
            <div>
              <h2>Este mês</h2>
              <p>O que falta pagar, em um só lugar.</p>
            </div>
            <label>
              <span>Mês</span>
              <input type="month" aria-label="Mês de referência" value={month}
                onChange={event=>setMonth(event.target.value)}/>
            </label>
          </div>
          <div className="payment-overview-card" aria-label="Resumo do mês">
            <div className="payment-overview-value">
              <span>Falta pagar</span>
              <strong>{money(projection.remaining)}</strong>
            </div>
            <details className="payment-overview-details">
              <summary>Ver valores do mês</summary>
              <div className="payment-overview-breakdown">
                <span>Previsto <strong>{money(projection.expected)}</strong></span>
                <span>Já pago <strong>{money(projection.paid)}</strong></span>
              </div>
            </details>
          </div>
        </>
      ) : (
        <header className="payment-detail-heading">
          <h2>{section==="assinaturas"?"Assinaturas":
            section==="parcelas"?"Compras parceladas":"Contas fixas"}</h2>
          <p>{section==="assinaturas"?"Serviços que renovam todo mês ou ano.":
            section==="parcelas"?"Acompanhe quantas parcelas ainda faltam.":
            "Despesas que se repetem a cada mês."}</p>
        </header>
      )}

      {statusNotice ? <p className="notice" role="status">{statusNotice}</p> : null}

      {section==="vencimentos" ? (
        <>
          <section className="payment-dashboard-due" aria-label="Próximos pagamentos">
            <div className="payment-dashboard-section-head">
              <h3>Próximos vencimentos</h3>
              {notifications.length > 0 ? (
                <span className="payment-dashboard-alert"><Bell size={13}/>
                  {notifications.length} {notifications.length===1?"aviso":"avisos"}
                </span>
              ) : null}
            </div>
            {visibleDue.length ? visibleDue.map((alert,index)=>(
              <div className={"payment-due-row"+(alert.overdue?" is-overdue":"")} key={
                (alert.charge?.plan.id||alert.expense?.id||"other")+"-"+(alert.charge?.cycle??index)
              }>
                <div className="payment-due-info">
                  <strong>{alert.title}{alert.charge?.plan.data?.paymentPlanType==="installment"?
                    " · "+(alert.charge.cycle+1)+"/"+alert.charge.plan.data.planCount:""}</strong>
                  <small>{dateDisplay(alert.due)} · {alert.overdue
                    ? Math.abs(alert.daysAway)+" dia(s) atrasado"
                    : alert.daysAway===0?"Hoje":alert.daysAway===1?"Amanhã":
                      "Em "+alert.daysAway+" dias"}
                  </small>
                </div>
                <strong>{moneyOrEstimate(alert.amount)}</strong>
                {alert.charge? <button type="button" className="secondary"
                  onClick={()=>openCharge(alert.charge!)} disabled={busy}>
                    {alert.charge.payment?"Editar":"Registrar"}
                  </button>:
                  <button type="button" className="secondary" disabled={busy}
                    onClick={()=>void payStandalone(alert.expense!)}>
                    <Check size={15}/> Pagar
                  </button>}
              </div>
            )) : (
              <div className="payment-dashboard-empty">
                <Check size={18}/>
                <span>Nenhum pagamento pendente nos próximos dias.</span>
              </div>
            )}
            {dueList.length>4 ? (
              <button type="button" className="payment-dashboard-expand"
                aria-expanded={showAllDue} onClick={()=>setShowAllDue(value=>!value)}>
                {showAllDue?"Mostrar menos":"Ver todos os "+dueList.length+" vencimentos"}
              </button>
            ) : null}
          </section>

          <section className="payment-management" aria-label="Organizar os tipos de pagamento">
            <div className="payment-dashboard-section-head">
              <h3>Organizar pagamentos</h3>
              <div className="payment-add-menu">
                <button type="button" className="primary payment-add-trigger"
                  aria-expanded={showCreateMenu} aria-controls="payment-create-options"
                  onClick={()=>setShowCreateMenu(value=>!value)}>
                  {showCreateMenu?<X size={16}/>:<Plus size={16}/>}
                  {showCreateMenu?"Fechar":"Adicionar"}
                </button>
              </div>
            </div>
            {showCreateMenu ? (
              <div id="payment-create-options" className="payment-create-options"
                role="group" aria-label="Tipo de pagamento para cadastrar">
                <button type="button" onClick={()=>openNew("subscription")}>
                  <Repeat2 size={17}/> Assinatura
                </button>
                <button type="button" onClick={()=>openNew("installment")}>
                  <CreditCard size={17}/> Compra parcelada
                </button>
                <button type="button" onClick={()=>openNew("bill")}>
                  <Receipt size={17}/> Conta fixa
                </button>
              </div>
            ) : null}
            <div className="payment-management-list">
              <Link href="/compras?aba=pagamentos&sec=assinaturas" className="payment-management-link">
                <span className="payment-management-icon"><Repeat2 size={19}/></span>
                <span className="payment-management-copy"><strong>Assinaturas</strong>
                  <small>{planList(entries,"subscription").length} cadastradas</small></span>
                <ArrowRight size={17}/>
              </Link>
              <Link href="/compras?aba=pagamentos&sec=parcelas" className="payment-management-link">
                <span className="payment-management-icon"><CreditCard size={19}/></span>
                <span className="payment-management-copy"><strong>Compras parceladas</strong>
                  <small>{planList(entries,"installment").length} cadastradas</small></span>
                <ArrowRight size={17}/>
              </Link>
              <Link href="/compras?aba=pagamentos&sec=contas" className="payment-management-link">
                <span className="payment-management-icon"><Receipt size={19}/></span>
                <span className="payment-management-copy"><strong>Contas fixas</strong>
                  <small>{planList(entries,"bill").length} cadastradas</small></span>
                <ArrowRight size={17}/>
              </Link>
              <Link href="/compras?aba=pagamentos&sec=extrato" className="payment-management-link">
                <span className="payment-management-icon"><CircleDollarSign size={19}/></span>
                <span className="payment-management-copy"><strong>Extrato e acertos</strong>
                  <small>Gastos registrados e divisão entre vocês</small></span>
                <ArrowRight size={17}/>
              </Link>
            </div>
          </section>
        </>
      ):null}

      {planKind ? (
        <>
          <div className="payment-section-toolbar">
            <span>{plans.length} {plans.length===1?"cadastro":"cadastros"}</span>
            <button type="button" className="primary" onClick={()=>openNew(planKind)}>
              <Plus size={17}/> {planKind==="subscription"?"Nova assinatura":
                planKind==="installment"?"Nova compra parcelada":"Nova conta fixa"}
            </button>
          </div>
          <div className="payment-plan-grid">
            {plans.map(plan=>{
              const status=planStatus(plan);
              const registered=registeredCount(plan);
              const paid=paidCount(plan);
              const totalCount=plan.data?.planCount||0;
              const next=planCharges(entries,today,addMonths(today,14)).find(c=>
                c.plan.id===plan.id && !c.payment?.done);
              const complete=planKind==="installment" && paid>=totalCount && totalCount>0;
              return <article className="panel payment-plan-card" key={plan.id}>
                <div className="payment-plan-top">
                  <div>
                    <span className="eyebrow">{PLAN_TYPE_LABEL[planKind]}</span>
                    <h3>{plan.title}</h3>
                  </div>
                  <span className={"tag payment-plan-status "+(complete?"completed":status)}>
                    {complete?"Concluído":PLAN_STATUS_LABELS[status]}
                  </span>
                </div>
                <div className="payment-plan-facts">
                  <div><small>{planKind==="installment"?"Valor total":"Valor previsto"}</small>
                    <strong>{moneyOrEstimate(plan.data?.amount||0)}</strong>
                  </div>
                  <div><small>{planKind==="installment"?"Parcelas":"Frequência"}</small>
                    <strong>{planKind==="installment"?
                      paid+"/"+totalCount+" pagas":
                      planKind==="subscription" && plan.data?.planFrequency==="yearly"?"Anual":"Mensal"}</strong>
                  </div>
                </div>
                {planKind==="installment" ? (
                  <>
                    <progress max={totalCount||1} value={Math.min(paid,totalCount)} aria-label={
                      "Progresso de "+plan.title
                    }/>
                    <small>Faltam {Math.max(0,totalCount-paid)} parcelas.
                      {" "}Parcelas divididas em centavos, sem arredondar o valor total.</small>
                  </>
                ):null}
                {next && !complete ? (
                  <button type="button" className="primary clean-plan-pay" disabled={busy}
                    onClick={() => openCharge(next)}>
                    <Check size={15} /> {next.payment ? "Atualizar pagamento" : "Registrar pagamento"}
                  </button>
                ) : null}
                <details className="clean-plan-details">
                  <summary>Detalhes e opções</summary>
                  <div className="clean-plan-expanded">
                <div className="payment-plan-meta">
                  <span><CalendarClock size={15}/> Primeiro vencimento: {dateDisplay(plan.due)}</span>
                  <span><CreditCard size={15}/> {paymentMethodLabel(plan.data?.paymentMethod)}</span>
                  <span><Bell size={15}/> Avisar {plan.data?.planReminderDays??3} dias antes</span>
                  <span>{names[plan.data?.payer??0]} paga · {(plan.data?.shareFirst??5000)/100}% para {names[0]}</span>
                  {next?<span>Próximo pendente: {dateDisplay(next.due)} · {moneyOrEstimate(next.amount)}</span>:null}
                </div>
                <div className="payment-plan-actions">
                  <button type="button" className="secondary" onClick={()=>editPlan(plan)}>
                    <Pencil size={15}/> Editar
                  </button>
                  {status==="active" ? <button type="button" className="secondary"
                    disabled={busy} onClick={()=>void setStatus(plan,"paused")}>
                    <Pause size={15}/> Pausar
                  </button> : <button type="button" className="secondary"
                    disabled={busy} onClick={()=>void setStatus(plan,"active")}>
                    <Play size={15}/> Reativar
                  </button>}
                  {status!=="canceled" ? <button type="button" className="secondary"
                    disabled={busy} onClick={()=>{
                      if(window.confirm("Cancelar os próximos vencimentos de "+plan.title+"? O histórico pago será mantido."))
                        void setStatus(plan,"canceled");
                    }}>Cancelar</button> : null}
                  {registered===0 ? <DeleteButton label={plan.title} disabled={busy}
                    onDelete={()=>void remove(plan)}/>:null}
                </div>
                  </div>
                </details>
              </article>;
            })}
          </div>
          {!plans.length ? <section className="panel empty">
            <CircleDollarSign size={29}/>
            <h3>{planKind==="subscription"?"Nenhuma assinatura cadastrada.":
              planKind==="installment"?"Nenhuma compra parcelada.":"Nenhuma conta fixa cadastrada."}</h3>
            <p>Cadastrem o primeiro pagamento para acompanhar o calendário.</p>
          </section>:null}
        </>
      ):null}

      {formType ? (
        <CleanSheet title={selectedPlan ? "Editar pagamento" : "Novo pagamento"}
          onClose={() => {setFormType(null);setEditing(null);}}>
        <form key={selectedPlan?.id||formType} className="panel payment-plan-form"
          id="payment-plan-form" onSubmit={(e)=>void savePlan(e)}>
          <div className="payment-form-header"><div>
            <span className="eyebrow">ORGANIZAR SEM COMPLICAÇÃO</span>
            <h3>{selectedPlan?"Editar ": "Cadastrar "}{PLAN_TYPE_LABEL[formType].toLowerCase()}</h3>
          </div><button type="button" className="icon-btn" aria-label="Fechar cadastro"
            onClick={()=>{setFormType(null);setEditing(null);}}><X size={18}/></button></div>
          <div className="payment-form-grid">
            <label className="full">Nome
              <input required maxLength={120} name="title" placeholder={
                formType==="subscription"?"Ex.: Netflix":formType==="installment"?"Ex.: Televisão":"Ex.: Energia"
              } defaultValue={selectedPlan?.title||""}/>
            </label>
            <label>Valor {formType==="installment"?"total da compra":
              formType==="bill"?"estimado (opcional)":"da assinatura"} (R$)
              <input name="amount" inputMode="decimal" placeholder="Ex.: 89,90"
                required={formType!=="bill"} defaultValue={asInputMoney(selectedPlan?.data?.amount)}/>
            </label>
            <label>Primeiro vencimento
              <input required type="date" name="due" defaultValue={selectedPlan?.due||today}
                disabled={!!selectedPlan && registeredCount(selectedPlan)>0}/>
            </label>
            {formType==="subscription" ? <label>Repetição
              <select name="frequency" defaultValue={selectedPlan?.data?.planFrequency||"monthly"}>
                <option value="monthly">Mensal</option><option value="yearly">Anual</option>
              </select>
            </label> : <input type="hidden" name="frequency" value="monthly"/>}
            {formType==="installment" ? <label>Número de parcelas
              <input required type="number" name="count" min={2} max={240} step={1}
                defaultValue={selectedPlan?.data?.planCount||10}/>
            </label> : null}
            <label>Quem paga?
              <select name="payer" defaultValue={selectedPlan?.data?.payer??0}>
                {names.map((name,index)=><option key={index} value={index}>{name}</option>)}
              </select>
            </label>
            <label>Divisão: parte de {names[0]} (%)
              <input required type="number" name="share" min={0} max={100} step={0.01}
                defaultValue={(selectedPlan?.data?.shareFirst??5000)/100}/>
              <small>O restante fica para {names[1]}.</small>
            </label>
            <label>Forma de pagamento
              <select name="method" defaultValue={selectedPlan?.data?.paymentMethod||"pix"}>
                {PAYMENT_METHODS.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}
              </select>
            </label>
            <label>Categoria
              <select name="category" defaultValue={selectedPlan?.data?.category||"Casa"}>
                {CATEGORIES.map(x=><option key={x}>{x}</option>)}
              </select>
            </label>
            <label>Lembrete interno
              <select name="remind" defaultValue={selectedPlan?.data?.planReminderDays??3}>
                <option value={0}>No vencimento</option>
                <option value={1}>1 dia antes</option>
                <option value={3}>3 dias antes</option>
                <option value={7}>7 dias antes</option>
              </select>
            </label>
            <label className="full">Observação (opcional)
              <input name="detail" maxLength={240} defaultValue={selectedPlan?.detail||""}
                placeholder="Detalhes para lembrar depois"/>
            </label>
          </div>
          {selectedPlan && registeredCount(selectedPlan)>0 ? (
            <p className="payment-small-note">A data inicial fica bloqueada após registrar pagamentos, para manter o histórico das parcelas.</p>
          ):null}
          {formError?<p className="error" role="alert">{formError}</p>:null}
          <div className="payment-form-actions">
            <button className="primary" type="submit" disabled={busy}>
              <Check size={16}/>{busy?"Salvando…":"Salvar"}
            </button>
            <button type="button" className="secondary" onClick={()=>setFormType(null)}>Cancelar</button>
          </div>
        </form>
        </CleanSheet>
      ):null}

      {paymentTarget ? (
        <CleanSheet title="Registrar pagamento" onClose={() => setPaymentTarget(null)}>
        <form className="panel payment-plan-form" id="plan-payment-form"
        key={paymentTarget.plan.id+"-"+paymentTarget.cycle} onSubmit={(e)=>void savePayment(e)}>
        <div className="payment-form-header"><div>
          <span className="eyebrow">REGISTRAR PAGAMENTO</span>
          <h3>{paymentTarget.plan.title}
            {paymentTarget.plan.data?.paymentPlanType==="installment"
              ?" · "+(paymentTarget.cycle+1)+"/"+paymentTarget.plan.data.planCount:""}
          </h3>
          <p>Vencimento: {dateDisplay(paymentTarget.due)}</p>
        </div><button type="button" className="icon-btn" aria-label="Fechar pagamento"
          onClick={()=>setPaymentTarget(null)}><X size={18}/></button></div>
        <div className="payment-form-grid">
          <label>Valor efetivo (R$)
            <input required name="amount" inputMode="decimal" placeholder="Ex.: 120,00"
              defaultValue={asInputMoney(paymentTarget.payment?.data?.amount??paymentTarget.amount)}/>
          </label>
          <label>Forma de pagamento
            <select name="method" defaultValue={paymentTarget.payment?.data?.paymentMethod ||
                paymentTarget.plan.data?.paymentMethod||"pix"}>
              {PAYMENT_METHODS.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
          </label>
          <label>Data em que pagou
            <input type="date" name="paymentDate"
              defaultValue={paymentTarget.payment?.data?.paymentPaidAt||today}/>
          </label>
          <label className="checkbox-label payment-form-paid">
            <input type="checkbox" name="paid" defaultChecked={paymentTarget.payment?.done ?? true}/>
            Pagamento já realizado
          </label>
        </div>
        {paymentError?<p className="error" role="alert">{paymentError}</p>:null}
        <div className="payment-form-actions">
          <button className="primary" type="submit" disabled={busy}>
            <Check size={16}/>{busy?"Salvando…":"Salvar pagamento"}
          </button>
          <button type="button" className="secondary" onClick={()=>setPaymentTarget(null)}>Cancelar</button>
        </div>
        <small>O registro entra no extrato e é dividido entre vocês quando estiver marcado como pago.</small>
      </form>
      </CleanSheet>
      ):null}
    </section>
  );
}
