import {NOTIFICATION_TYPES,type NotificationType} from "./notification-preferences.ts";
export type InboxNotification = {
  id:string; type:NotificationType; title:string; body:string; url:string; created_at:string; read_at:string|null;
};
export function notificationUrl(value:string):string {
  return value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/";
}
export const NOTIFICATION_LABELS:Record<NotificationType,string>={
  upcomingEvent:"Compromisso",eventChanges:"Calendário",newResponsibility:"Responsabilidade",
  paymentDue:"Pagamento",overdue:"Pendência",partnerCompletion:"Conclusão pelo par",newPlan:"Novo plano",dailyDigest:"Resumo do dia",
};
export function parseInboxRows(rows:unknown[]):InboxNotification[] {
  return rows.filter((row):row is InboxNotification=>{
    if(!row||typeof row!=="object")return false;
    const r=row as InboxNotification;
    return typeof r.id==="string"&&NOTIFICATION_TYPES.includes(r.type)&&typeof r.title==="string"&&typeof r.body==="string"&&typeof r.url==="string"&&typeof r.created_at==="string";
  }).map(row=>({...row,url:notificationUrl(row.url)}));
}
