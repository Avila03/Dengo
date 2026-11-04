"use client";
import {useId,useState} from "react";
import {money,parseMoney,parseSharePercent,splitAmount} from "@/lib/finance";

export function ExpenseSplit({amount,names,initial=5000,basis=false,note}: {
  amount:string; names:string[]; initial?:number; basis?:boolean; note?:string;
}) {
  const id=useId();
  const [percent,setPercent]=useState(String(initial/100).replace(".",","));
  let share:number|null=null, cents=0;
  try{share=parseSharePercent(percent);}catch{}
  try{cents=parseMoney(amount);}catch{}
  const portions=share===null?[0,0]:splitAmount(cents,share);
  return <section className="expense-split full" aria-label="Divisão da despesa">
    <div className="split-title"><strong>Como dividir?</strong>
      <div className="split-presets" role="group" aria-label="Divisões rápidas">
        {[5000,6000,4000].map(value=><button key={value} type="button" aria-pressed={share===value}
          className={share===value?"selected":""} onClick={()=>setPercent(String(value/100))}>{value/100}/{100-value/100}</button>)}
      </div>
    </div>
    <label htmlFor={id}>Parte de {names[0]} (%)
      <input id={id} name="sharePercent" required inputMode="decimal" value={percent}
        pattern="[0-9]{1,3}([.,][0-9]{1,2})?" aria-invalid={share===null}
        onChange={event=>setPercent(event.target.value)} />
    </label>
    <input type="hidden" name="share" value={share===null?"":basis?share:share/100} />
    {share===null?<p className="error" role="alert">Informe uma porcentagem entre 0 e 100.</p>:null}
    <div className="split-preview" aria-live="polite">
      {names.map((name,index)=><div key={index}><span>{name} · {share===null?"—":(index?10000-share:share)/100+"%"}</span>
        <strong>{cents && share!==null?money(portions[index]):"—"}</strong></div>)}
    </div>
    <p className="helper">{note||"O restante fica para a outra pessoa. A prévia mantém o valor total, incluindo os centavos."}</p>
  </section>;
}
