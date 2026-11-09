/* Push e aviso offline. Nada é guardado em cache: nem páginas, nem sessões, nem registros do casal. */
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));
self.addEventListener("push",event=>{
 event.waitUntil((async()=>{
  let data={};try{data=event.data?.json()||{};}catch{}
  const url=typeof data.url==="string" && data.url.startsWith("/") && !data.url.startsWith("//")?data.url:"/";
  await self.registration.showNotification(data.title||"Dengo",{
   body:data.body||"Abra o Dengo para consultar os detalhes.",icon:"/brand/dengo-icon-192-v2.png",
   badge:"/brand/dengo-icon-192-v2.png",tag:data.tag||"dengo",data:{url,userId:data.userId},
  });
 })());
});
self.addEventListener("notificationclick",event=>{
 event.notification.close();
 event.waitUntil((async()=>{
  const target=new URL(event.notification.data?.url||"/",self.location.origin);
  if(target.origin!==self.location.origin)return;
  const tabs=await self.clients.matchAll({type:"window",includeUncontrolled:true});
  for(const tab of tabs)if(new URL(tab.url).origin===target.origin){await tab.navigate(target.href);await tab.focus();return;}
  await self.clients.openWindow(target.href);
 })());
});

/* Sem internet, a navegação mostra um aviso estático gerado aqui (sem dados do casal)
   em vez da página de erro do Safari. Com internet, a requisição segue normalmente. */
const OFFLINE_PAGE=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#F9F7F4"><title>Dengo · sem internet</title>
<style>
 html,body{height:100%;margin:0}
 body{display:grid;place-items:center;padding:24px;box-sizing:border-box;background:#F9F7F4;color:#353B37;
  font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:center}
 main{max-width:340px}
 img{width:72px;height:72px;border-radius:18px}
 h1{font:600 24px/1.25 Georgia,"Times New Roman",serif;margin:20px 0 8px}
 p{margin:0 0 24px;color:#5d625f}
 button{min-height:48px;padding:0 24px;border:0;border-radius:999px;background:#A65364;color:#fff;font-family:inherit;font-size:16px;font-weight:600}
 @media (prefers-color-scheme:dark){body{background:#0C0E15;color:#F7EDF4}p{color:#c9bfc6}}
</style></head><body><main>
<img src="/brand/dengo-icon-192-v2.png" alt="" onerror="this.remove()">
<h1>Sem internet no momento</h1>
<p>O Dengo precisa de conexão para mostrar os registros de vocês. Nada fica guardado neste aparelho.</p>
<button onclick="location.reload()">Tentar de novo</button>
</main><script>addEventListener("online",()=>location.reload())</script></body></html>`;
self.addEventListener("fetch",event=>{
 if(event.request.mode!=="navigate")return;
 event.respondWith(fetch(event.request).catch(()=>new Response(OFFLINE_PAGE,{
  status:503,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"},
 })));
});
