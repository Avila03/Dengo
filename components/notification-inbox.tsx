"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {Bell,CheckCheck,Check,ArrowUpRight,RefreshCw} from "lucide-react";
import {supabase} from "@/lib/supabase";
import {parseInboxRows,NOTIFICATION_LABELS,type InboxNotification} from "@/lib/notification-inbox";
import {useDengo} from "./provider";

export function NotificationInbox({onUnreadCount}:{onUnreadCount:(count:number)=>void}) {
  const {user,demo}=useDengo();
  const [items,setItems]=useState<InboxNotification[]>([]),[unread,setUnread]=useState(0),[total,setTotal]=useState(0),
    [filter,setFilter]=useState<"all"|"unread">("all"),[limit,setLimit]=useState(25),[loading,setLoading]=useState(true),
    [error,setError]=useState(""),[busy,setBusy]=useState(false),[reload,setReload]=useState(0);
  const request=useRef(0);
  useEffect(()=>{
    const client=supabase;
    if(demo||!user||!client){setLoading(false);onUnreadCount(0);return;}
    let alive=true;
    async function load() {
      const sequence=++request.current;setLoading(true);
      let query=client!.from("notification_inbox").select("id,type,title,body,url,created_at,read_at",{count:"exact"})
        .eq("user_id",user!.id).order("created_at",{ascending:false}).order("id",{ascending:false}).range(0,limit-1);
      if(filter==="unread")query=query.is("read_at",null);
      const [history,count]=await Promise.all([query,client!.from("notification_inbox").select("id",{count:"exact",head:true}).eq("user_id",user!.id).is("read_at",null)]);
      if(!alive||sequence!==request.current)return;
      if(history.error||count.error)setError("Não foi possível carregar os avisos. Tente novamente.");
      else {setItems(parseInboxRows(history.data||[]));setTotal(history.count||0);setUnread(count.count||0);onUnreadCount(count.count||0);setError("");}
      setLoading(false);
    }
    void load();
    const channel=client.channel("notification-inbox:"+user.id).on("postgres_changes",{
      event:"*",schema:"public",table:"notification_inbox",filter:"user_id=eq."+user.id,
    },()=>void load()).subscribe();
    const refresh=()=>{if(document.visibilityState==="visible")void load();};
    document.addEventListener("visibilitychange",refresh);
    return()=>{alive=false;document.removeEventListener("visibilitychange",refresh);void client.removeChannel(channel);};
  },[user?.id,demo,filter,limit,reload,onUnreadCount]);
  async function markRead(item?:InboxNotification) {
    if(!supabase||!user||busy)return;
    setBusy(true);setError("");
    let query=supabase.from("notification_inbox").update({read_at:new Date().toISOString()}).eq("user_id",user.id).is("read_at",null);
    if(item)query=query.eq("id",item.id);
    const result=await query;
    if(result.error)setError("Não foi possível marcar como lido.");
    else setReload(value=>value+1);
    setBusy(false);
  }
  return <section className="notification-inbox" aria-label="Histórico de avisos">
    <div className="inbox-toolbar"><div className="filters" role="group" aria-label="Filtrar avisos">
      <button type="button" className={filter==="all"?"selected":""} aria-pressed={filter==="all"} onClick={()=>{setFilter("all");setLimit(25);}}>Todos</button>
      <button type="button" className={filter==="unread"?"selected":""} aria-pressed={filter==="unread"} onClick={()=>{setFilter("unread");setLimit(25);}}>Não lidos{unread?` (${unread})`:""}</button>
    </div><button type="button" className="secondary" disabled={busy||!unread} onClick={()=>void markRead()}><CheckCheck size={16}/>Marcar todos como lidos</button></div>
    {error?<p className="error" role="alert">{error}<button type="button" className="text-link" onClick={()=>setReload(n=>n+1)}><RefreshCw size={15}/>Tentar novamente</button></p>:null}
    {loading&&!items.length?<p role="status" className="helper">Carregando avisos…</p>:null}
    {!loading&&!items.length&&!error?<div className="clean-simple-empty"><Bell size={22}/><div><strong>{filter==="unread"?"Todos os avisos foram lidos":"Seus avisos ficam aqui"}</strong>
      <p>{demo?"O histórico compartilhado fica disponível ao entrar com sua conta.":filter==="unread"?"Você está em dia com os avisos do Dengo.":"Os próximos avisos serão salvos aqui, mesmo que o celular não receba o push."}</p></div></div>:null}
    <div className="inbox-list">{items.map(item=><article className={"inbox-item panel"+(!item.read_at?" is-unread":"")} key={item.id}>
      <div className="inbox-item-meta"><span className="tag">{NOTIFICATION_LABELS[item.type]}</span>{!item.read_at?<span className="unread-label">Não lido</span>:null}
        <time dateTime={item.created_at}>{new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short",timeZone:"America/Sao_Paulo"}).format(new Date(item.created_at))}</time></div>
      <Link href={item.url} className="inbox-title" onClick={()=>{if(!item.read_at)void markRead(item);}}>{item.title}<ArrowUpRight size={16}/></Link>
      <p>{item.body}</p>
      {!item.read_at?<button type="button" className="text-link" disabled={busy} onClick={()=>void markRead(item)}><Check size={15}/>Marcar como lido</button>:<small className="helper">Lido</small>}
    </article>)}</div>
    {items.length<total?<button type="button" className="secondary inbox-load-more" disabled={loading} onClick={()=>setLimit(n=>n+25)}>{loading?"Carregando…":"Carregar mais avisos"}</button>:null}
  </section>;
}
