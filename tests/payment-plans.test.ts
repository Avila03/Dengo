import {test} from "node:test";
import assert from "node:assert/strict";
import type {Entry} from "../lib/model.ts";
import {validateDraft} from "../lib/model.ts";
import {balance,monthlySummary} from "../lib/finance.ts";
import {calendarEntries} from "../lib/calendar.ts";
import {todayEntries} from "../lib/today.ts";
import {
  preparePlanDraft,planCharges,planCycleDue,planInstallmentAmount,
  planList,paymentDraftForCharge,monthForecast,activeReminders,paymentAlerts,
  duePlanCalendarEntries,paymentMethodLabel,
} from "../lib/payment-plans.ts";

const base:Entry={
  id:"monthly-sub",kind:"expense",title:"Streaming",detail:"",
  assignee:"Bruno",due:"2026-01-31",done:false,created_at:"2026-01-02T12:00:00Z",
  data:{amount:4490,payer:0,shareFirst:5000,category:"Lazer",recurrence:"none",
    paymentPlanType:"subscription",planStatus:"active",planFrequency:"monthly",planReminderDays:3,
    paymentMethod:"credit"},
};
function expenseFrom(draft:ReturnType<typeof paymentDraftForCharge>,id="payment1"):Entry{
  return {...draft,id,created_at:"2026-11-01T00:00:00Z"};
}
test("monthly subscriptions use the original due day including shorter months",()=>{
  assert.equal(planList([base]).length,1);
  assert.equal(planCycleDue(base,0),"2026-01-31");
  assert.equal(planCycleDue(base,1),"2026-02-28");
  assert.equal(planCycleDue(base,2),"2026-03-31");
  assert.equal(planCycleDue(base,12),"2027-01-31");
  assert.deepEqual(planCharges([base],"2026-02-01","2026-04-30").map(c=>c.due),
    ["2026-02-28","2026-03-31","2026-04-30"]);
  assert.equal(paymentMethodLabel("credit"),"Cartão de crédito");
});
test("annual subscriptions preserve leap-day dates",()=>{
  const annual:Entry={...base,id:"annual",due:"2024-02-29",
    data:{...base.data,planFrequency:"yearly"}};
  assert.deepEqual(planCharges([annual],"2025-01-01","2028-12-31").map(c=>c.due),
    ["2025-02-28","2026-02-28","2027-02-28","2028-02-29"]);
});
test("installment totals distribute every cent with no rounding loss",()=>{
  const installment:Entry={...base,id:"installment",due:"2026-11-15",
    data:{...base.data,amount:10000,paymentPlanType:"installment",planCount:3}};
  const charges=planCharges([installment],"2026-11-01","2027-03-31");
  assert.deepEqual(charges.map(c=>c.amount),[3334,3333,3333]);
  assert.equal(charges.reduce((sum,c)=>sum+c.amount,0),10000);
  assert.deepEqual(charges.map(c=>c.due),["2026-11-15","2026-12-15","2027-01-15"]);
  assert.equal(planInstallmentAmount(101,3,0),34);
  assert.equal(planInstallmentAmount(101,3,1),34);
  assert.equal(planInstallmentAmount(101,3,2),33);
});
test("paid installment is one real expense, not double-counted as a forecast",()=>{
  const plan:Entry={...base,id:"plan2",due:"2026-11-15",
    data:{...base.data,amount:240000,paymentPlanType:"installment",planCount:10}};
  const first=planCharges([plan],"2026-11-01","2026-11-30")[0];
  const draft=paymentDraftForCharge(first,{
    amount:"240",method:"credit",paid:true,names:["Bruno","Par"],paidOn:"2026-11-16",
  });
  assert.equal(draft.data?.amount,24000);
  assert.equal(draft.data?.paymentPlanId,"plan2");
  assert.equal(draft.data?.paymentCycle,0);
  assert.equal(draft.done,true);
  const paid=expenseFrom(draft);
  const projected=planCharges([plan,paid],"2026-11-01","2026-11-30");
  assert.equal(projected.length,1);
  assert.equal(projected[0].payment?.id,paid.id);
  assert.equal(duePlanCalendarEntries([plan,paid],"2026-11-01","2026-11-30").length,0);
  assert.equal(calendarEntries([plan,paid],{from:"2026-11-15",to:"2026-11-15"}).length,1);
  assert.equal(monthForecast([plan,paid],"2026-11").expected,24000);
  assert.equal(monthForecast([plan,paid],"2026-11").paid,24000);
  assert.equal(monthForecast([plan,paid],"2026-11").remaining,0);
  assert.equal(balance([plan,paid]),12000);
  assert.equal(monthlySummary([plan,paid],"2026-11").total,24000);
  assert.equal(monthForecast([plan,paid],"2026-12").remaining,24000);
});
test("future or unpaid charges do not change the couple's financial balance",()=>{
  const first=planCharges([base],"2026-11-01","2026-11-30")[0];
  const pending=expenseFrom(paymentDraftForCharge(first,{
    amount:"48,90",method:"pix",paid:false,names:["Bruno","Par"],
  }));
  assert.equal(balance([base,pending]),0);
  assert.equal(monthForecast([base,pending],"2026-11").expected,4890);
  assert.equal(monthForecast([base,pending],"2026-11").remaining,4890);
  assert.equal(monthlySummary([base,pending],"2026-11").total,0);
  assert.equal(calendarEntries([base,pending],{from:first.due,to:first.due}).length,1);
  assert.equal(todayEntries([base],first.due).length,1);
  assert.equal(todayEntries([base],first.due)[0].data?.paymentPlanVirtual,true);
});
test("fixed bills allow a missing estimate and accept actual monthly amounts",()=>{
  const bill=preparePlanDraft({
    kind:"bill",title:"Luz",detail:"valor variável",
    due:"2026-11-12",amount:"",frequency:"monthly",count:2,
    payer:0,shareFirst:5000,category:"Casa",method:"boleto",remind:7,
    names:["Bruno","Par"],
  });
  assert.equal(bill.data?.amount,0);
  assert.doesNotThrow(()=>validateDraft(bill));
  const instance:Entry={...bill,id:"bill1",created_at:"2026-11-01T00:00:00Z"};
  const cycle=planCharges([instance],"2026-11-01","2026-11-30")[0];
  assert.equal(cycle.amount,0);
  const invoice=paymentDraftForCharge(cycle,{
    amount:"196,32",paid:true,method:"pix",names:["Bruno","Par"],paidOn:"2026-11-12",
  });
  assert.equal(invoice.data?.amount,19632);
  assert.equal(monthForecast([instance,expenseFrom(invoice)],"2026-11").expected,19632);
});
test("pausing or canceling stops projections but retains paid history in reports",()=>{
  const cycle=planCharges([base],"2026-11-01","2026-11-30")[0];
  const paid=expenseFrom(paymentDraftForCharge(cycle,{
    amount:"44,90",paid:true,method:"credit",names:["Bruno","Par"],
  }));
  const paused:Entry={...base,data:{...base.data,planStatus:"paused"}};
  const canceled:Entry={...base,data:{...base.data,planStatus:"canceled"}};
  assert.equal(planCharges([paused],"2026-11-01","2027-11-30").length,0);
  assert.equal(planCharges([canceled],"2026-11-01","2027-11-30").length,0);
  assert.equal(monthForecast([canceled,paid],"2026-11").paid,4490);
  assert.equal(monthForecast([canceled,paid],"2026-11").expected,4490);
  assert.equal(monthlySummary([canceled,paid],"2026-11").total,4490);
});
test("internal reminders respect 0/1/3/7 day settings and overdue obligations",()=>{
  const soon:Entry={...base,due:"2026-11-10",data:{...base.data,planReminderDays:3}};
  assert.equal(activeReminders([soon],"2026-11-06").length,0);
  assert.equal(activeReminders([soon],"2026-11-07").length,1);
  assert.equal(activeReminders([soon],"2026-11-10").length,1);
  assert.equal(activeReminders([soon],"2026-11-12").length>=1,true);
  const farFuture=paymentAlerts([soon],"2026-11-03");
  assert.ok(farFuture.some(a=>a.due==="2026-11-10"));
  const overdue=paymentAlerts([soon],"2026-11-12");
  assert.ok(overdue.some(a=>a.overdue));
});
test("validate plan drafts, methods, and installment limits",()=>{
  const defaultOptions={
    kind:"installment" as const,title:"Mesa",detail:"",
    due:"2026-11-20",amount:"2500",frequency:"monthly" as const,
    count:10,payer:0 as const,shareFirst:5000,category:"Casa",
    method:"credit" as const,remind:3 as const,names:["Bruno","Par"] as [string,string],
  };
  const entry=preparePlanDraft(defaultOptions);
  assert.doesNotThrow(()=>validateDraft(entry));
  assert.throws(()=>preparePlanDraft({...defaultOptions,count:241}),/240/);
  assert.throws(()=>preparePlanDraft({...defaultOptions,count:1}),/240/);
  assert.throws(()=>preparePlanDraft({...defaultOptions,amount:"0,01",count:10}),/valor total/i);
  assert.throws(()=>validateDraft({...entry,data:{...entry.data,paymentMethod:"bitcoin" as "pix"}}),/pagamento inválida/);
  assert.throws(()=>validateDraft({...entry,data:{...entry.data,planReminderDays:5 as 3}}),/lembrete/);
});
