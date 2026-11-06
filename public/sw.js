/* Push only: no page caching, offline authentication or silent notifications. */
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
