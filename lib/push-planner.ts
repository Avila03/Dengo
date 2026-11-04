import type { Entry } from "./model.ts";
import { calendarEntries } from "./calendar.ts";
import { addCalendarDays } from "./calendar-schedule.ts";
import { paymentAlerts, isPlan } from "./payment-plans.ts";
import { parseNotificationPreferences, type NotificationType } from "./notification-preferences.ts";

export type PushChange = { id: number; actor_id: string | null; action: string; entry: Entry; previous: Entry | null; created_at: string };
export type PushMessage = { key: string; type: NotificationType; title: string; body: string; url: string };
export function brazilClock(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(now);
  const get=(key:string)=>parts.find(p=>p.type===key)!.value;
  return { day:`${get("year")}-${get("month")}-${get("day")}`, time:`${get("hour")}:${get("minute")}` };
}
export function inQuietHours(time:string,start:string,end:string) {
  return start<end ? time>=start && time<end : time>=start || time<end;
}
const at=(day:string,time="09:00")=>Date.parse(`${day}T${time}:00-03:00`);
function eventSignature(e:Entry) {
  return JSON.stringify([e.title,e.due,e.assignee,e.data?.time,e.data?.endDate,e.data?.location,
    Object.entries(e.data?.eventOverrides||{}).map(([day,{done,...change}])=>[day,change]).filter(([,change])=>Object.keys(change as object).length)]);
}
export function planPushMessages(input:{ now:Date; userId:string; slot:number; names:string[]; preferences:unknown; entries:Entry[]; changes:PushChange[]; deviceSince:string }):PushMessage[] {
  const {now,userId,slot,names,entries,changes}=input;
  const prefs=parseNotificationPreferences(input.preferences), clock=brazilClock(now), ms=now.getTime();
  if(prefs.quietHours.enabled && inQuietHours(clock.time,prefs.quietHours.start,prefs.quietHours.end)) return [];
  const result:PushMessage[]=[];
  const mine=(entry:Entry)=>entry.assignee==="Nós dois" || entry.assignee===names[slot];
  const myPayment=(entry:Entry)=>prefs.paymentAudience==="couple" || (entry.data?.payer??0)===slot;
  function add(type:NotificationType,key:string,title:string,body:string,url:string,due:number,expires:number) {
    if(!prefs.enabled[type] || due>ms || expires<=ms || ms-due>48*3600000) return;
    result.push({type,key,title:prefs.hidePreview?"Dengo":title,
      body:prefs.hidePreview?"Você tem um novo aviso no Dengo.":body,url});
  }
  const end=at(addCalendarDays(clock.day,1),"00:00");
  const agenda=calendarEntries(entries,{from:clock.day,to:addCalendarDays(clock.day,2)});
  for(const event of agenda.filter(e=>e.kind==="event" && !e.done && mine(e))) {
    const start=at(event.due,event.data?.time||"09:00");
    add("upcomingEvent",`event:${event.id}:${event.due}:${event.data?.time||"09:00"}:${prefs.eventMinutesBefore}`,
      "Compromisso chegando",`${event.title} · ${event.data?.time||"09:00"}`,`/calendario?data=${event.due}&evento=${encodeURIComponent(event.id)}`,
      start-prefs.eventMinutesBefore*60000,start);
  }
  const payments=paymentAlerts(entries,clock.day,7);
  for(const payment of payments) {
    const entry=payment.expense || payment.charge?.plan;
    if(!entry || !myPayment(entry)) continue;
    const key=payment.charge?`${entry.id}:${payment.charge.cycle}`:entry.id;
    add("paymentDue",`pay-before:${key}:${payment.due}:${prefs.paymentDaysBefore}`,"Pagamento próximo",`${payment.title} vence em ${payment.due.split("-").reverse().join("/")}.`,"/compras?aba=pagamentos",
      at(addCalendarDays(payment.due,-prefs.paymentDaysBefore)),at(payment.due,"00:00"));
    if(prefs.paymentOnDueDay) add("paymentDue",`pay-day:${key}:${payment.due}`,"Pagamento vence hoje",payment.title,"/compras?aba=pagamentos",at(payment.due),at(addCalendarDays(payment.due,1),"00:00"));
    add("overdue",`pay-late:${key}:${payment.due}`,"Pagamento atrasado",payment.title,"/compras?aba=pagamentos",at(addCalendarDays(payment.due,1)),at(addCalendarDays(payment.due,2),"00:00"));
  }
  for(const task of entries.filter(e=>e.kind==="task" && !e.done && e.due && mine(e)))
    add("overdue",`task-late:${task.id}:${task.due}`,"Responsabilidade atrasada",task.title,`/compromissos?registro=${task.id}`,
      at(addCalendarDays(task.due,1)),at(addCalendarDays(task.due,2),"00:00"));
  for(const change of changes) {
    if(!change.actor_id || change.actor_id===userId || change.created_at<input.deviceSince) continue;
    const e=change.entry, before=change.previous, current=entries.find(x=>x.id===e.id), due=Date.parse(change.created_at);
    const emit=(type:NotificationType,title:string,url:string)=>add(type,`change:${change.id}:${type}`,title,e.title,url,due,due+24*3600000);
    if(e.kind==="event" && mine(e) && before && (change.action==="DELETE" || (current && current.updated_at===e.updated_at && eventSignature(before)!==eventSignature(e))))
      emit("eventChanges",change.action==="DELETE"?"Compromisso cancelado":"Compromisso alterado",`/calendario?data=${e.due}`);
    if(e.kind==="task" && current && !current.done && mine(current) && (change.action==="INSERT" || before?.assignee!==e.assignee))
      emit("newResponsibility","Nova responsabilidade",`/compromissos?registro=${e.id}`);
    if(current?.done && e.done && !before?.done && ((e.kind==="task" && e.assignee==="Nós dois") || (e.kind==="expense" && !isPlan(e))))
      emit("partnerCompletion",e.kind==="task"?"Seu par concluiu uma responsabilidade":"Seu par registrou um pagamento",e.kind==="task"?"/compromissos":"/compras?aba=gastos");
    if(current && change.action==="INSERT" && (e.kind==="movie" || e.kind==="place"))
      emit("newPlan","Novo plano salvo",e.kind==="movie"?"/filmes":"/lugares");
  }
  const eventCount=agenda.filter(e=>e.due===clock.day && e.kind==="event" && !e.done && mine(e)).length;
  const taskCount=entries.filter(e=>e.kind==="task" && !e.done && e.due===clock.day && mine(e)).length;
  const paymentCount=payments.filter(p=>p.due===clock.day && myPayment((p.expense||p.charge?.plan)!)).length;
  if(eventCount+taskCount+paymentCount) add("dailyDigest",`digest:${clock.day}`,"Seu resumo do dia",`${eventCount} compromisso(s), ${taskCount} responsabilidade(s) e ${paymentCount} pagamento(s).`,"/",at(clock.day,prefs.dailyTime),end);
  return result;
}
