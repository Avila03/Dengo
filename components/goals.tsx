"use client";
import {useState,type FormEvent} from "react";
import {Plus,Target,Pencil,PiggyBank} from "lucide-react";
import {useDengo} from "./provider";
import {CleanSheet} from "./clean-sheet";
import {DeleteButton} from "./ui";
import {EntryAudit} from "./entry-audit";
import {goalProgress} from "@/lib/couple-planning";
import {money,parseMoney} from "@/lib/finance";
import {dayLabel,localToday,type Entry,type Draft} from "@/lib/model";

export function Goals() {
  const {entries,names,busy,add,update,remove}=useDengo();
  const [form,setForm]=useState<"goal"|"saving"|null>(null),[editing,setEditing]=useState<Entry|null>(null),
    [target,setTarget]=useState<Entry|null>(null),[error,setError]=useState(""),[filter,setFilter]=useState("active");
  const goals=entries.filter(e=>e.kind==="goal");
  const list=goals.filter(goal=>filter==="all"||(goalProgress(entries,goal).remaining===0?filter==="reached":filter==="active"));
  function openGoal(goal:Entry|null) {setEditing(goal);setForm("goal");setError("");}
  async function save(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setError("");
    const fields=new FormData(event.currentTarget);
    try {
      let draft:Draft;
      if(form==="goal") draft={kind:"goal",title:String(fields.get("title")||"").trim(),detail:String(fields.get("detail")||""),
        assignee:"Nós dois",due:String(fields.get("due")||""),done:false,data:{...editing?.data,goalTarget:parseMoney(String(fields.get("target")||""))}};
      else {
        if(!target || !entries.some(e=>e.id===target.id&&e.kind==="goal"))throw new Error("Esta meta não está mais disponível.");
        const payer=Number(fields.get("payer")) as 0|1;
        draft={kind:"saving",title:("Aporte · "+target.title).slice(0,120),detail:String(fields.get("detail")||""),
          assignee:names[payer],due:String(fields.get("due")||localToday()),done:true,
          data:{amount:parseMoney(String(fields.get("amount")||"")),payer,goalId:target.id}};
      }
      if(await(form==="goal"&&editing?update(editing,draft):add(draft))){setForm(null);setEditing(null);}
      else setError("Não foi possível salvar. Confira os dados e tente novamente.");
    }catch(cause){setError(cause instanceof Error?cause.message:"Confira os dados.");}
  }
  return <section className="goals">
    <header className="goal-heading"><div><h2>Metas do casal</h2><p>Guardem aos poucos para o próximo sonho de vocês.</p></div>
      <button type="button" className="primary" onClick={()=>openGoal(null)}><Plus size={17}/>Nova meta</button></header>
    {goals.length?<div className="filters" role="group" aria-label="Filtrar metas">
      {[["active","Em andamento"],["reached","Atingidas"],["all","Todas"]].map(([key,label])=><button type="button" key={key}
        className={filter===key?"selected":""} aria-pressed={filter===key} onClick={()=>setFilter(key)}>{label}</button>)}
    </div>:null}
    <div className="goal-grid">{list.map(goal=>{
      const progress=goalProgress(entries,goal);
      return <article className="panel goal-card" key={goal.id}>
        <div className="goal-card-top"><Target size={21}/><span>{progress.remaining===0?"Meta atingida":`${progress.percent}% reservado`}</span>
          <button type="button" className="icon-btn" aria-label={"Editar meta "+goal.title} onClick={()=>openGoal(goal)}><Pencil size={17}/></button></div>
        <h3>{goal.title}</h3>{goal.detail?<p>{goal.detail}</p>:null}
        <div className="goal-values"><strong>{money(progress.saved)}</strong><span>de {money(progress.target)}</span></div>
        <progress max={Math.max(1,progress.target)} value={Math.min(progress.target,progress.saved)} aria-label={"Progresso de "+goal.title}/>
        <p className="goal-remaining">{progress.remaining?`Faltam ${money(progress.remaining)}`:"Vocês chegaram lá!"}{goal.due?` · Prazo: ${dayLabel(goal.due)}`:""}</p>
        <button type="button" className="secondary" onClick={()=>{setTarget(goal);setForm("saving");setEditing(null);setError("");}}><PiggyBank size={16}/>Registrar aporte</button>
        <details className="goal-history"><summary>Aportes e opções <span>{progress.movements.length}</span></summary>
          <p className="helper">Registre valores já reservados para acompanhar o progresso.</p>
          {progress.movements.map(item=><div className="goal-movement" key={item.id}>
            <div><strong>{money(item.data?.amount||0)}</strong><small>{names[item.data?.payer??0]} · {dayLabel(item.due)}</small>{item.detail?<small>{item.detail}</small>:null}</div>
            <DeleteButton label={item.title} disabled={busy} onDelete={()=>void remove(item)}/>
          </div>)}
          {!progress.movements.length?<p className="helper">Nenhum aporte registrado.</p>:null}
          <EntryAudit entry={goal}/>
          <DeleteButton label={"meta "+goal.title} message="Excluir esta meta e todos os aportes registrados nela?" disabled={busy}
            onDelete={()=>void remove(goal)}/>
        </details>
      </article>;
    })}</div>
    {!list.length?<div className="clean-simple-empty"><Target size={22}/><div><strong>{goals.length?"Nenhuma meta nesta seleção":"Qual é o próximo sonho de vocês?"}</strong>
      <p>{goals.length?"Veja as outras metas pelos filtros acima.":"Crie uma meta, defina o valor e acompanhe os aportes do casal."}</p></div></div>:null}
    {form?<CleanSheet title={form==="goal"?editing?"Editar meta":"Nova meta":"Registrar aporte · "+target?.title}
      onClose={()=>{setForm(null);setEditing(null);}}>
      <form className="panel entry-form" onSubmit={event=>void save(event)} key={form+(editing?.id||target?.id||"new")}>
        <div className="form-grid">
          {form==="goal"?<><label className="full">Nome da meta<input name="title" required maxLength={120} defaultValue={editing?.title||""} placeholder="Ex.: Nossa viagem"/></label>
            <label>Valor que queremos guardar (R$)<input name="target" required inputMode="decimal" defaultValue={editing?.data?.goalTarget?(editing.data.goalTarget/100).toFixed(2).replace(".",","):""} placeholder="Ex.: 5000,00"/></label>
            <label>Prazo<input name="due" type="date" defaultValue={editing?.due||""}/></label></>
            :<><label>Valor reservado (R$)<input required name="amount" inputMode="decimal" placeholder="Ex.: 200,00"/></label>
              <label>Quem contribuiu?<select name="payer">{names.map((name,index)=><option key={index} value={index}>{name}</option>)}</select></label>
              <label>Data do aporte<input name="due" type="date" required defaultValue={localToday()}/></label></>}
          <label className="full">Observação<input name="detail" maxLength={240} defaultValue={editing?.detail||""}/></label>
        </div>
        {error?<p className="error" role="alert">{error}</p>:null}
        <button type="submit" className="primary" disabled={busy}>{busy?"Salvando…":form==="goal"?"Salvar meta":"Salvar aporte"}</button>
      </form>
    </CleanSheet>:null}
  </section>;
}
