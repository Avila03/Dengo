"use client";
import {useState,type FormEvent} from "react";
import {Check,Plus,Pencil,X} from "lucide-react";
import type {Entry} from "@/lib/model";
import {taskSubtasks} from "@/lib/couple-planning";
import {useDengo} from "./provider";
import {DeleteButton} from "./ui";

export function Subtasks({parent}:{parent:Entry}) {
  const {entries,busy,add,update,remove}=useDengo();
  const items=taskSubtasks(entries,parent.id);
  const [title,setTitle]=useState(""),[editing,setEditing]=useState<Entry|null>(null),[error,setError]=useState("");
  async function save(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setError("");
    const draft={kind:"subtask" as const,title:title.trim(),detail:"",due:"",done:editing?.done||false,
      assignee:parent.assignee,data:{parentId:parent.id}};
    if(await(editing?update(editing,draft):add(draft))){setTitle("");setEditing(null);}
    else setError("Não foi possível salvar a subtarefa. Tente novamente.");
  }
  async function check(item:Entry) {
    setError("");
    if(!await update(item,{kind:item.kind,title:item.title,detail:item.detail,due:item.due,assignee:item.assignee,data:item.data,done:!item.done}))
      setError("Não foi possível atualizar esta subtarefa.");
  }
  return <section className="subtasks" aria-label="Subtarefas desta responsabilidade">
    <div className="subtask-heading"><h3>Subtarefas</h3><span>{items.filter(e=>e.done).length}/{items.length} concluídas</span></div>
    {items.length?<p className="helper">Concluir a responsabilidade também conclui os passos pendentes.</p>:null}
    {items.length?<progress value={items.filter(e=>e.done).length} max={items.length} aria-label="Progresso das subtarefas"/>:null}
    <ul>{items.map(item=><li key={item.id}>
      <button type="button" className={"check"+(item.done?" checked":"")} disabled={busy||parent.done}
        aria-pressed={item.done} aria-label={(item.done?"Reabrir ":"Concluir ")+item.title} onClick={()=>void check(item)}><Check size={15}/></button>
      <span className={item.done?"subtask-done":""}>{item.title}</span>
      <button type="button" className="icon-btn" disabled={busy||parent.done} aria-label={"Editar "+item.title}
        onClick={()=>{setEditing(item);setTitle(item.title);setError("");}}><Pencil size={15}/></button>
      <DeleteButton label={item.title} disabled={busy||parent.done} onDelete={()=>void (async()=>{
        if(!await remove(item))setError("Não foi possível excluir a subtarefa.");
      })()}/>
    </li>)}</ul>
    {!items.length?<p className="helper">Divida esta responsabilidade em pequenos passos.</p>:null}
    {!parent.done?<form onSubmit={event=>void save(event)} className="subtask-form">
      <label>{editing?"Editar subtarefa":"Nova subtarefa"}<input value={title} required maxLength={120} placeholder="Ex.: Reservar o hotel"
        onChange={event=>setTitle(event.target.value)} /></label>
      <button type="submit" className="secondary" disabled={busy}><Plus size={16}/>{editing?"Salvar":"Adicionar"}</button>
      {editing?<button type="button" className="icon-btn" aria-label="Cancelar edição" onClick={()=>{setEditing(null);setTitle("");}}><X size={16}/></button>:null}
    </form>:<p className="helper">Reabra a responsabilidade para ajustar os passos.</p>}
    {error?<p className="error" role="alert">{error}</p>:null}
  </section>;
}
