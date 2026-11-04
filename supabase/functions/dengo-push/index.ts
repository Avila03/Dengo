import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import webpush from "npm:web-push@3.6.7";
import { loadAllEntries } from "../../../lib/records.ts";
import { planPushMessages } from "../../../lib/push-planner.ts";

const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const origins=new Set(["https://dengo-steel.vercel.app","https://dengo-mesamarcada.vercel.app","https://dengo-git-main-mesamarcada.vercel.app"]);
const cors=(req:Request)=>({"Access-Control-Allow-Origin":origins.has(req.headers.get("origin")||"")?req.headers.get("origin")!:"https://dengo-steel.vercel.app","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin"});
function endpointAllowed(endpoint:string) {
 try {const u=new URL(endpoint);return endpoint.length<4096 && u.protocol==="https:" && !u.port && !u.username && !u.password &&
 (u.hostname.endsWith(".push.apple.com") || u.hostname==="fcm.googleapis.com" || u.hostname.endsWith(".push.services.mozilla.com") || u.hostname.endsWith(".notify.windows.com"));}catch{return false;}
}
function subscriptionValid(s:any) {
 if(!s || !endpointAllowed(s.endpoint||"") || typeof s.keys?.p256dh!=="string" || typeof s.keys?.auth!=="string")return false;
 try {const decode=(x:string)=>atob(x.replaceAll("-","+").replaceAll("_","/"));return decode(s.keys.p256dh).length===65 && decode(s.keys.auth).length===16;}catch{return false;}
}
async function rows(table:string,configure:(query:any)=>any) {
 const {data,error}=await configure(db.from(table).select("*"));if(error)throw new Error("Database read failed");return data;
}
async function send(device:any,message:any,config:any):Promise<string> {
 const claim=await db.rpc("claim_push_delivery",{p_device:device.id,p_key:message.key});
 if(claim.error)throw new Error("Delivery claim failed");
 if(!claim.data)return "skipped";
 let status="failed";
 try {
   const details=webpush.generateRequestDetails(device.subscription,JSON.stringify({title:message.title,body:message.body,url:message.url,tag:message.key,userId:device.user_id}),
     {TTL:3600,urgency:"normal",contentEncoding:"aes128gcm",vapidDetails:{subject:"https://dengo-steel.vercel.app",publicKey:config.publicKey,privateKey:config.privateKey}});
   const response=await fetch(details.endpoint,{method:"POST",headers:details.headers,body:new Uint8Array(details.body),redirect:"error",signal:AbortSignal.timeout(10000)});
   if(response.status===404 || response.status===410) {
     await db.from("push_devices").delete().eq("id",device.id);return "expired";
   }
   status=response.ok?"sent":"failed";
 }catch{/* Retried by the next scheduled pass. Never log endpoints, keys or personal payloads. */}
 await db.from("push_deliveries").update({state:status,retry_at:new Date(Date.now()+120000).toISOString()})
   .eq("device_id",device.id).eq("message_key",message.key).eq("lease",claim.data);
 return status;
}
async function dispatch(config:any) {
 const now=new Date(), devices=await rows("push_devices",q=>q.limit(100));
 let sent=0,failed=0;
 const spaces=new Map();
 for(const device of devices) {
  const memberships=await rows("memberships",q=>q.eq("user_id",device.user_id));
  const member=memberships[0];if(!member)continue;
  let context=spaces.get(member.space_id);
  if(!context) {
   const [spaceRows,entries,changes]=await Promise.all([
    rows("spaces",q=>q.eq("id",member.space_id)),
    loadAllEntries(db,member.space_id),
    rows("push_changes",q=>q.eq("space_id",member.space_id).gte("created_at",new Date(now.getTime()-86400000).toISOString()).order("id",{ascending:false}).limit(1000)),
   ]);
   context={space:spaceRows[0],entries,changes};spaces.set(member.space_id,context);
  }
  const user=await db.auth.admin.getUserById(device.user_id);if(user.error || !user.data.user)continue;
  const candidates=planPushMessages({now,userId:device.user_id,slot:member.slot,names:context.space.names,
    preferences:user.data.user.user_metadata?.dengo_notifications_v1,entries:context.entries,changes:context.changes,deviceSince:device.created_at});
  for(const candidate of candidates.slice(0,30)) {
   const result=await send(device,candidate,config);if(result==="sent")sent++;if(result==="failed")failed++;
  }
 }
 return {sent,failed,devices:devices.length};
}
Deno.serve(async(req:Request)=>{
 const headers={...cors(req),"Content-Type":"application/json","Cache-Control":"no-store"};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(req.headers.has("origin") && !origins.has(req.headers.get("origin")!))return reply({error:"Origin not allowed"},403);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return reply({error:"Method not allowed"},405);
 try {
  if(Number(req.headers.get("content-length")||0)>16384)return reply({error:"Request too large"},413);
  const text=await req.text();if(text.length>16384)return reply({error:"Request too large"},413);
  const body=JSON.parse(text);
  const {data:config,error:configError}=await db.rpc("dengo_push_runtime_config");
  if(configError || !config)return reply({error:"Envio temporariamente indisponível."},503);
  if(body.action==="config")return reply({publicKey:config.publicKey});
  if(body.action==="dispatch") {
   const stamp=req.headers.get("x-dengo-timestamp")||"", nonce=req.headers.get("x-dengo-nonce")||"", signature=req.headers.get("x-dengo-signature")||"";
   if(!/^\d{10}$/.test(stamp) || !/^[0-9a-f-]{36}$/.test(nonce) || !/^[0-9a-f]{64}$/.test(signature) || Math.abs(Date.now()/1000-Number(stamp))>300)
     return reply({error:"Unauthorized"},401);
   const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(config.cronSecret),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
   const bytes=Uint8Array.from(signature.match(/.{2}/g)!,x=>parseInt(x,16));
   const valid=await crypto.subtle.verify("HMAC",key,bytes,new TextEncoder().encode(`${stamp}:${nonce}:dispatch`));
   if(!valid)return reply({error:"Unauthorized"},401);
   const claimed=await db.from("push_dispatch_nonces").insert({id:nonce});
   if(claimed.error)return reply({error:"Request already processed"},401);
   return reply(await dispatch(config));
  }
  const jwt=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
  const auth=await db.auth.getUser(jwt);const user=auth.data.user;
  if(auth.error || !user)return reply({error:"Entre novamente na sua conta."},401);
  const memberships=await rows("memberships",q=>q.eq("user_id",user.id));
  if(!memberships.length)return reply({error:"Entre no lobby do casal primeiro."},403);
  if(body.action==="register") {
   if(!subscriptionValid(body.subscription))return reply({error:"Inscrição do aparelho inválida."},400);
   const own=await rows("push_devices",q=>q.eq("user_id",user.id));
   if(own.length>=8 && !own.some((x:any)=>x.endpoint===body.subscription.endpoint))return reply({error:"Limite de oito aparelhos por conta."},400);
   const saved=await db.from("push_devices").upsert({user_id:user.id,endpoint:body.subscription.endpoint,
     subscription:{endpoint:body.subscription.endpoint,keys:body.subscription.keys},created_at:new Date().toISOString()}, {onConflict:"endpoint"}).select("id").single();
   if(saved.error)throw new Error("Registration failed");return reply({active:true});
  }
  const devices=await rows("push_devices",q=>q.eq("user_id",user.id).eq("endpoint",String(body.endpoint||"")));
  const device=devices[0];
  if(body.action==="status")return reply({active:!!device});
  if(body.action==="unregister") {
   if(device){const result=await db.from("push_devices").delete().eq("id",device.id).eq("user_id",user.id);if(result.error)throw new Error("Removal failed");}
   return reply({active:false});
  }
  if(body.action==="test") {
   if(!device)return reply({error:"Ative este aparelho primeiro."},400);
   const key=`test:${Math.floor(Date.now()/30000)}`;
   const state=await send(device,{key,title:"Dengo",body:"Pronto! Este aparelho já recebe notificações do Dengo.",url:"/notificacoes"},config);
   if(state==="sent")return reply({sent:true});
   return reply({error:state==="skipped"?"Aguarde 30 segundos antes de testar novamente.":"Não foi possível enviar. Reative este aparelho e tente novamente."},400);
  }
  return reply({error:"Ação inválida."},400);
 }catch {return reply({error:"Não foi possível concluir. Tente novamente."},500);}
});
