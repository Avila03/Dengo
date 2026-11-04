import { supabase } from "./supabase";

export const PUSH_OWNER_KEY="dengo.push.owner.v1";
export async function pushAction(body:Record<string,unknown>) {
 if(!supabase)throw new Error("Entre na sua conta para ativar notificações.");
 const {data,error}=await supabase.functions.invoke("dengo-push",{body});
 if(error || data?.error) {
  let message=data?.error;
  if(!message && error?.context instanceof Response)try{message=(await error.context.json()).error;}catch{}
  throw new Error(message||"Não foi possível conectar o envio. Tente novamente.");
 }
 return data;
}
export async function currentPushSubscription() {
 if(!("serviceWorker" in navigator))return null;
 const registration=await navigator.serviceWorker.getRegistration("/");
 return registration?registration.pushManager.getSubscription():null;
}
export async function disconnectPush() {
 const subscription=await currentPushSubscription();
 if(!subscription)return;
 try {await pushAction({action:"unregister",endpoint:subscription.endpoint});}
 finally {await subscription.unsubscribe();try{localStorage.removeItem(PUSH_OWNER_KEY);}catch{}}
}
