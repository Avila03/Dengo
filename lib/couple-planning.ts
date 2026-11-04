import type { Entry } from "./model.ts";

export function taskSubtasks(entries: Entry[], parentId: string): Entry[] {
  return entries.filter(e=>e.kind==="subtask" && e.data?.parentId===parentId)
    .sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id));
}
export function subtaskProgress(entries: Entry[], parentId: string) {
  const tasks=taskSubtasks(entries,parentId);
  return { total:tasks.length, done:tasks.filter(e=>e.done).length };
}
export function goalProgress(entries: Entry[], goal: Entry) {
  const movements=entries.filter(e=>e.kind==="saving" && e.data?.goalId===goal.id)
    .sort((a,b)=>b.due.localeCompare(a.due)||b.created_at.localeCompare(a.created_at));
  const saved=movements.reduce((sum,e)=>sum+(e.data?.amount||0),0), target=goal.data?.goalTarget||0;
  return {saved,target,remaining:Math.max(0,target-saved),percent:target?Math.min(100,Math.floor(saved*100/target)):0,movements};
}
/** Mirror server cascades for the isolated demo storage. */
export function completeTaskChildren(entries: Entry[], parent: Entry): Entry[] {
  return parent.kind==="task" && parent.done ? entries.map(e=>e.kind==="subtask" && e.data?.parentId===parent.id ? {...e,done:true}:e):entries;
}
export function cloneSubtasks(entries:Entry[], parent:Entry, next:Entry):Entry[] {
  if(parent.kind!=="task")return [];
  return taskSubtasks(entries,parent.id).map(e=>({...e,id:crypto.randomUUID(),created_at:next.created_at,updated_at:next.created_at,
    assignee:next.assignee,due:"",done:false,occurrence_from:null,data:{parentId:next.id}}));
}
export function withoutEntryAndChildren(entries:Entry[], id:string):Entry[] {
  return entries.filter(e=>e.id!==id && e.data?.parentId!==id && e.data?.goalId!==id);
}
