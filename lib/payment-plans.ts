import type { Draft, Entry } from "./model.ts";
import { addMonths, isDate } from "./model.ts";
import { money, parseMoney } from "./finance.ts";

export type PlanKind = "subscription" | "installment" | "bill";
export type PlanStatus = "active" | "paused" | "canceled";
export type PayMethod = "pix" | "credit" | "debit" | "boleto" | "cash" | "transfer" | "other";
export const PAYMENT_METHODS: {value:PayMethod;label:string}[] = [
  {value:"pix",label:"Pix"}, {value:"credit",label:"Cartão de crédito"},
  {value:"debit",label:"Cartão de débito"}, {value:"boleto",label:"Boleto"},
  {value:"cash",label:"Dinheiro"}, {value:"transfer",label:"Transferência"},
  {value:"other",label:"Outro"},
];
export const PLAN_TYPE_LABEL:Record<PlanKind,string> = {
  subscription:"Assinatura", installment:"Parcelamento", bill:"Conta fixa",
};
export type PlanCharge = {
  plan: Entry;
  cycle: number;
  due: string;
  amount: number;
  payment?: Entry;
};

export function isPlan(entry: Entry): boolean {
  return entry.kind === "expense" &&
    ["subscription","installment","bill"].includes(entry.data?.paymentPlanType || "");
}
export function planStatus(entry: Entry): PlanStatus {
  return entry.data?.planStatus || "active";
}
export function planList(entries: Entry[], kind?:PlanKind): Entry[] {
  return entries.filter((e)=> isPlan(e) &&
    (!kind || e.data?.paymentPlanType === kind)).sort((a,b)=>
      a.title.localeCompare(b.title,"pt-BR"));
}
export function paymentMethodLabel(value?:string):string {
  return PAYMENT_METHODS.find((method)=>method.value===value)?.label || "Não informado";
}
export function planInstallmentAmount(total:number,count:number,cycle:number):number {
  if (!Number.isSafeInteger(total) || total < 1 || !Number.isInteger(count) || count < 1 ||
      !Number.isInteger(cycle) || cycle < 0 || cycle >= count)
    throw new Error("Parcelamento inválido.");
  const base=Math.floor(total/count);
  return base+(cycle < total%count ? 1 : 0);
}
export function planCycleDue(plan:Entry,cycle:number):string {
  if(!isPlan(plan) || !isDate(plan.due) || !Number.isInteger(cycle) || cycle<0)
    throw new Error("Plano ou vencimento inválido.");
  const stride=plan.data?.planFrequency === "yearly" ? 12 : 1;
  return addMonths(plan.due,cycle*stride,Number(plan.due.slice(-2)));
}
export function planChargeAmount(plan:Entry,cycle:number):number {
  if(plan.data?.paymentPlanType==="installment")
    return planInstallmentAmount(plan.data.amount || 0,plan.data.planCount || 0,cycle);
  return plan.data?.amount || 0;
}
function planPaymentByCycle(entries:Entry[]) {
  const map=new Map<string,Entry>();
  for(const entry of entries)
    if(entry.kind==="expense" && !isPlan(entry) && entry.data?.paymentPlanId &&
        Number.isInteger(entry.data.paymentCycle)) {
      const key=entry.data.paymentPlanId+"::"+entry.data.paymentCycle;
      if(!map.has(key)) map.set(key,entry);
    }
  return map;
}
export function planCharges(entries:Entry[],from:string,to:string):PlanCharge[] {
  if(!isDate(from) || !isDate(to) || from>to) return [];
  const payments=planPaymentByCycle(entries);
  const result:PlanCharge[]=[];
  for(const plan of planList(entries)) {
    if(planStatus(plan)!=="active") continue;
    const kind=plan.data!.paymentPlanType!;
    const limit=kind==="installment" ? Math.min(plan.data?.planCount || 0,240) :
      plan.data?.planFrequency==="yearly" ? 150 : 1200;
    for(let cycle=0;cycle<limit;cycle++) {
      const due=planCycleDue(plan,cycle);
      if(due>to) break;
      if(due<from) continue;
      result.push({
        plan,cycle,due,amount:planChargeAmount(plan,cycle),
        payment:payments.get(plan.id+"::"+cycle),
      });
    }
  }
  return result.sort((a,b)=>a.due.localeCompare(b.due) ||
    a.plan.title.localeCompare(b.plan.title,"pt-BR"));
}
export function duePlanCalendarEntries(entries:Entry[],from:string,to:string):Entry[] {
  return planCharges(entries,from,to).filter((charge)=>!charge.payment).map((charge)=>({
    ...charge.plan,
    id:charge.plan.id+"::payment::"+charge.cycle,
    due:charge.due,
    done:false,
    data: {
      ...charge.plan.data,
      amount:charge.amount,
      paymentPlanType:undefined,
      paymentPlanId:charge.plan.id,
      paymentCycle:charge.cycle,
      paymentPlanVirtual:true,
      recurrence:"none",
    },
  }));
}
export function preparePlanDraft(input:{
  kind:PlanKind;title:string;detail:string;due:string;amount:string;
  frequency:"monthly"|"yearly";count:number;payer:0|1;shareFirst:number;
  category:string;method:PayMethod;remind:0|1|3|7;names:[string,string];
}):Draft {
  if(!isDate(input.due))throw new Error("Escolha a data do primeiro vencimento.");
  if(input.kind!=="subscription" && input.frequency!=="monthly")
    throw new Error("Parcelamentos e contas fixas são mensais.");
  if(input.kind==="installment" && (!Number.isInteger(input.count) || input.count<2 ||
    input.count>240))throw new Error("Escolha de 2 a 240 parcelas.");
  if(![0,1].includes(input.payer) || !Number.isInteger(input.shareFirst) ||
    input.shareFirst<0 || input.shareFirst>10000)throw new Error("Confira os responsáveis e a divisão.");
  const amount=input.kind==="bill" && !input.amount.trim() ? 0 : parseMoney(input.amount);
  if(input.kind==="installment" && amount<input.count)
    throw new Error("O valor total deve ser suficiente para todas as parcelas.");
  return {
    kind:"expense",title:input.title.trim(),detail:input.detail.trim(),
    assignee:input.names[input.payer],due:input.due,done:false,
    data:{
      amount,payer:input.payer,shareFirst:input.shareFirst,
      category:input.category || "Casa",recurrence:"none",
      paymentPlanType:input.kind,planStatus:"active",
      planFrequency:input.kind==="subscription" ? input.frequency : "monthly",
      planCount:input.kind==="installment" ? input.count : undefined,
      planReminderDays:input.remind,paymentMethod:input.method,
    },
  };
}
export function paymentDraftForCharge(charge:PlanCharge,input:{
  amount:string; method:PayMethod; paid:boolean; names:[string,string]; paidOn?:string;
}):Draft {
  if(charge.payment)throw new Error("Este vencimento já tem um registro de pagamento.");
  const amount=parseMoney(input.amount);
  const plan=charge.plan;
  return {
    kind:"expense",title:plan.title +
      (plan.data?.paymentPlanType==="installment" ?
        " · "+(charge.cycle+1)+"/"+plan.data.planCount : ""),
    detail:plan.detail,assignee:input.names[plan.data?.payer??0],
    due:charge.due,done:input.paid,
    data:{
      amount, payer:plan.data?.payer??0,shareFirst:plan.data?.shareFirst??5000,
      category:plan.data?.category||"Casa",recurrence:"none",
      paymentPlanId:plan.id,paymentCycle:charge.cycle,
      paymentMethod:input.method,
      paymentPaidAt:input.paid ? input.paidOn || charge.due : undefined,
    },
  };
}
export function monthForecast(entries:Entry[],month:string) {
  if(!/^\d{4}-\d{2}$/.test(month)) return {expected:0,paid:0,remaining:0,charges:[] as PlanCharge[]};
  const from=month+"-01";
  const [year,m]=month.split("-").map(Number);
  const to=month+"-"+String(new Date(Date.UTC(year,m,0)).getUTCDate()).padStart(2,"0");
  const charges=planCharges(entries,from,to);
  const represented=new Set(charges.map(c=>c.plan.id+"::"+c.cycle));
  const standalone=entries.filter(e=>e.kind==="expense" && !isPlan(e) &&
    (!e.data?.paymentPlanId ||
      !represented.has(e.data.paymentPlanId+"::"+e.data.paymentCycle)) &&
    e.due>=from && e.due<=to);
  const planExpected=charges.reduce((s,c)=>s+(c.payment?.data?.amount??c.amount),0);
  const planPaid=charges.reduce((s,c)=>s+(c.payment?.done?(c.payment.data?.amount||0):0),0);
  const planRemaining=charges.reduce((s,c)=>s+(!c.payment?.done?
    (c.payment?.data?.amount??c.amount):0),0);
  const otherExpected=standalone.reduce((s,e)=>s+(e.data?.amount||0),0);
  const otherPaid=standalone.reduce((s,e)=>s+(e.done?(e.data?.amount||0):0),0);
  const otherRemaining=standalone.reduce((s,e)=>s+(!e.done?(e.data?.amount||0):0),0);
  return {
    expected:planExpected+otherExpected,
    paid:planPaid+otherPaid,
    remaining:planRemaining+otherRemaining,
    charges,
  };
}
export type PaymentAlert = {
  due:string;title:string;amount:number;charge?:PlanCharge;expense?:Entry;
  overdue:boolean;daysAway:number;
};
function dayDiff(a:string,b:string):number {
  return Math.round((Date.parse(b+"T12:00:00Z")-Date.parse(a+"T12:00:00Z"))/86400000);
}
export function paymentAlerts(entries:Entry[],today:string,lookAhead=40):PaymentAlert[] {
  if(!isDate(today))return [];
  const startDate=new Date(today+"T12:00:00Z");startDate.setUTCDate(startDate.getUTCDate()-60);
  const from=startDate.toISOString().slice(0,10);
  const endDate=new Date(today+"T12:00:00Z");endDate.setUTCDate(endDate.getUTCDate()+lookAhead);
  const to=endDate.toISOString().slice(0,10);
  const allCharges=planCharges(entries,from,to);
  const represented=new Set(allCharges.map(c=>c.plan.id+"::"+c.cycle));
  const charges=allCharges.filter(c=>!c.payment?.done);
  const dueAlerts:PaymentAlert[]=charges.map(c=>({
    due:c.due,title:c.plan.title,amount:c.payment?.data?.amount??c.amount,
    charge:c,daysAway:dayDiff(today,c.due),overdue:c.due<today,
  }));
  for(const expense of entries) {
    if(expense.kind!=="expense" || isPlan(expense) ||
       (expense.data?.paymentPlanId &&
        represented.has(expense.data.paymentPlanId+"::"+expense.data.paymentCycle)) ||
       expense.done || expense.due<from || expense.due>to)continue;
    dueAlerts.push({
      due:expense.due,title:expense.title,amount:expense.data?.amount||0,
      expense,daysAway:dayDiff(today,expense.due),overdue:expense.due<today,
    });
  }
  return dueAlerts.sort((a,b)=>a.due.localeCompare(b.due) ||
    a.title.localeCompare(b.title,"pt-BR"));
}
export function activeReminders(entries:Entry[],today:string):PaymentAlert[] {
  return paymentAlerts(entries,today,7).filter(alert=>
    alert.overdue ||
    alert.daysAway <= (alert.charge?.plan.data?.planReminderDays ?? 3));
}
export function moneyOrEstimate(value:number) {
  return value > 0 ? money(value) : "Valor a definir";
}
