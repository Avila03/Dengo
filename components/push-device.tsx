"use client";
import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Send, Smartphone } from "lucide-react";
import { useDengo } from "./provider";
import { pushAction, currentPushSubscription, disconnectPush, PUSH_OWNER_KEY } from "@/lib/push-client";

export function PushDevice() {
 const {user,demo}=useDengo();
 const [state,setState]=useState<"loading"|"install"|"unsupported"|"inactive"|"active">("loading");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const registration=useRef<Promise<ServiceWorkerRegistration>|null>(null);
 const lock=useRef(false);
 const publicConfig=useRef<{publicKey:string}|null>(null);
 useEffect(()=>{
  let alive=true;
  if(demo){setState("unsupported");return;}
  const installed=window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & {standalone?:boolean}).standalone);
  if(/iPhone|iPad|iPod/.test(navigator.userAgent) && !installed){setState("install");return;}
  if(!window.isSecureContext || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)){setState("unsupported");return;}
  registration.current=navigator.serviceWorker.register("/sw.js",{scope:"/",updateViaCache:"none"}).then(async r=>{
   await navigator.serviceWorker.ready;return r;
  });
  void Promise.all([registration.current,pushAction({action:"config"})]).then(async([,config])=>{
   publicConfig.current=config;
   const subscription=await currentPushSubscription();
   const status=subscription?await pushAction({action:"status",endpoint:subscription.endpoint}):{active:false};
   if(alive)setState(status.active && Notification.permission==="granted"?"active":"inactive");
  }).catch(()=>{if(alive){setState("inactive");setError("Não foi possível verificar este aparelho. Tente ativá-lo novamente.");}});
  return()=>{alive=false;};
 },[demo,user?.id]);
 async function activate() {
  if(lock.current)return;lock.current=true;setBusy(true);setError("");setNotice("");
  // Permission must be requested directly from the tap, before any network awaits.
  const permission=Notification.requestPermission();
  try {
   if(await permission!=="granted")throw new Error("Permita as notificações nos ajustes do aparelho para ativar o Dengo.");
   const reg=await registration.current;if(!reg)throw new Error("Atualize a página e tente novamente.");
   const config=publicConfig.current;if(!config)throw new Error("Atualize a página para preparar a ativação deste aparelho.");
   const binary=atob(config.publicKey.replaceAll("-","+").replaceAll("_","/"));
   const key=Uint8Array.from(binary,(char:string)=>char.charCodeAt(0));
   let subscription=await reg.pushManager.getSubscription();
   if(subscription){
    const prior=subscription.endpoint;
    await subscription.unsubscribe();subscription=null;
    void pushAction({action:"unregister",endpoint:prior}).catch(()=>{});
   }
   subscription=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
   try{await pushAction({action:"register",subscription:subscription.toJSON()});}
   catch(cause){await subscription.unsubscribe();throw cause;}
   try{localStorage.setItem(PUSH_OWNER_KEY,user!.id);}catch{}
   setState("active");setNotice("Este aparelho está ativado. Use “Enviar teste” para conferir o recebimento.");
  }catch(cause){setState("inactive");setError(cause instanceof Error?cause.message:"Não foi possível ativar.");}
  finally{lock.current=false;setBusy(false);}
 }
 async function action(kind:"test"|"disable") {
  if(lock.current)return;lock.current=true;setBusy(true);setError("");setNotice("");
  try {
   if(kind==="disable"){await disconnectPush();setState("inactive");setNotice("Notificações desativadas neste aparelho.");}
   else {const sub=await currentPushSubscription();if(!sub)throw new Error("Ative este aparelho novamente.");
    await pushAction({action:"test",endpoint:sub.endpoint});setNotice("Teste enviado. Confira as notificações do celular.");}
  }catch(cause){setError(cause instanceof Error?cause.message:"Não foi possível concluir.");if(kind==="disable")setState("inactive");}
  finally{lock.current=false;setBusy(false);}
 }
 return <section className="notification-device-state push-device" aria-label="Notificações neste aparelho">
  <Smartphone size={20} aria-hidden="true"/>
  <div><strong>{state==="loading"?"Verificando este aparelho…":state==="active"?"Notificações ativadas neste aparelho":state==="install"?"Adicione o Dengo à tela inicial":state==="unsupported"?"Notificações indisponíveis neste navegador":"Ative as notificações neste aparelho"}</strong>
   <p>{state==="install"?"No Safari, toque em Compartilhar → Adicionar à Tela de Início. Abra pelo ícone do Dengo e volte ao sininho para ativar. Requer iOS 16.4 ou superior.":demo?"Entre na sua conta para receber os avisos do casal.":state==="unsupported"?"Use um navegador com suporte a notificações push. No iPhone, abra o Dengo pela tela inicial.":state==="active"?"Você pode receber os avisos selecionados mesmo com o Dengo fechado.":"A permissão vale para este aparelho. Suas escolhas de avisos ficam salvas na sua conta."}</p>
   <div className="push-device-actions">
    {state==="inactive"?<button type="button" className="primary" disabled={busy} onClick={()=>void activate()}><Bell size={16}/>{busy?"Ativando…":"Ativar neste aparelho"}</button>:null}
    {state==="active"?<><button type="button" className="secondary" disabled={busy} onClick={()=>void action("test")}><Send size={16}/>Enviar teste</button>
     <button type="button" className="secondary" disabled={busy} onClick={()=>void action("disable")}><BellOff size={16}/>Desativar neste aparelho</button></>:null}
   </div>
   {error?<p className="error" role="alert">{error}</p>:null}
   {notice?<p className="notice" role="status">{notice}</p>:null}
  </div>
 </section>;
}
