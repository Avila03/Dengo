import {test} from "node:test";
import assert from "node:assert/strict";
import {planPushMessages,pushPresentation,brazilClock,inQuietHours,type PushChange} from "../lib/push-planner.ts";
import {parseNotificationPreferences} from "../lib/notification-preferences.ts";
import type {Entry} from "../lib/model.ts";

const base:Entry={id:"event",kind:"event",title:"Jantar",detail:"",assignee:"Nós dois",due:"2026-11-04",done:false,created_at:"2026-11-01T12:00:00Z",updated_at:"2026-11-04T11:59:00Z",data:{time:"09:30"}};
const preferences=parseNotificationPreferences({hidePreview:false});
const input={now:new Date("2026-11-04T12:00:00Z"),userId:"me",slot:0,names:["Bruno","Par"],preferences,entries:[base],changes:[] as PushChange[],deviceSince:"2026-11-04T10:00:00Z"};
const type=(kind:string,list=planPushMessages(input))=>list.filter(m=>m.type===kind);
test("push uses Brazil time and honors overnight and daytime quiet hours",()=>{
 assert.deepEqual(brazilClock(new Date("2026-11-04T02:30:00Z")),{day:"2026-11-03",time:"23:30"});
 assert.ok(inQuietHours("23:00","22:00","08:00"));assert.ok(inQuietHours("07:59","22:00","08:00"));
 assert.equal(inQuietHours("08:00","22:00","08:00"),false);
 assert.equal(inQuietHours("13:00","12:00","14:00"),true);
 assert.equal(planPushMessages({...input,now:new Date("2026-11-04T10:00:00Z")}).length,0);
});
test("event reminders respect time, participation, completion and rescheduling",()=>{
 assert.equal(type("upcomingEvent").length,1);
 assert.equal(type("upcomingEvent",planPushMessages({...input,entries:[{...base,assignee:"Par"}]})).length,0);
 assert.equal(type("upcomingEvent",planPushMessages({...input,entries:[{...base,done:true}]})).length,0);
 assert.equal(type("upcomingEvent",planPushMessages({...input,entries:[{...base,data:{time:"10:30"}}]})).length,0);
 assert.equal(type("upcomingEvent",planPushMessages({...input,now:new Date("2026-11-04T12:30:00Z")})).length,0);
 assert.equal(type("upcomingEvent",planPushMessages({...input,entries:[]})).length,0);
});
test("a recurring completion suppresses only that occurrence",()=>{
 const recurring={...base,data:{...base.data,eventRepeat:"weekly" as const,eventOverrides:{"2026-11-04":{done:true}}}};
 assert.equal(type("upcomingEvent",planPushMessages({...input,entries:[recurring]})).length,0);
 assert.equal(type("upcomingEvent",planPushMessages({...input,entries:[recurring],now:new Date("2026-11-11T12:00:00Z")})).length,1);
});
test("payments include planned installments, exclude paid bills and respect payer preferences",()=>{
 const bill:Entry={...base,id:"bill",kind:"expense",due:"2026-11-05",data:{amount:10000,payer:0,shareFirst:5000}};
 assert.equal(type("paymentDue",planPushMessages({...input,entries:[bill]})).length,1);
 assert.equal(type("paymentDue",planPushMessages({...input,entries:[{...bill,done:true}]})).length,0);
 assert.equal(type("paymentDue",planPushMessages({...input,entries:[bill],slot:1})).length,0);
 assert.equal(type("paymentDue",planPushMessages({...input,entries:[bill],slot:1,preferences:{...preferences,paymentAudience:"couple"}})).length,1);
 const plan:Entry={...bill,data:{...bill.data,paymentPlanType:"installment",planCount:2,planStatus:"active"}};
 assert.equal(type("paymentDue",planPushMessages({...input,entries:[plan]})).length,1);
});
test("overdue reminder is eligible once on the next morning, not on subsequent days",()=>{
 const task:Entry={...base,id:"task",kind:"task",due:"2026-11-03",assignee:"Bruno",data:{}};
 assert.equal(type("overdue",planPushMessages({...input,entries:[task]})).length,1);
 assert.equal(type("overdue",planPushMessages({...input,entries:[task],now:new Date("2026-11-05T12:00:00Z")})).length,0);
 assert.equal(type("overdue",planPushMessages({...input,entries:[{...task,done:true}]})).length,0);
});
test("the four change-based types target the partner and skip actions made before device activation",()=>{
 const task:Entry={...base,id:"task",kind:"task",done:true};
 const assigned:Entry={...base,id:"assigned",kind:"task",assignee:"Bruno"};
 const place:Entry={...base,id:"place",kind:"place"};
 const entries=[base,task,assigned,place];
 const change=(id:number,entry:Entry,previous:Entry|null=null):PushChange=>({id,entry,previous,actor_id:"partner",action:previous?"UPDATE":"INSERT",created_at:"2026-11-04T11:59:00Z"});
 const changes=[change(1,base,{...base,data:{time:"11:00"}}),change(2,assigned),change(3,task,{...task,done:false}),change(4,place)];
 const messages=planPushMessages({...input,entries,changes});
 for(const kind of ["eventChanges","newResponsibility","partnerCompletion","newPlan"])assert.equal(type(kind,messages).length,1,kind);
 assert.equal(planPushMessages({...input,entries:[],changes:changes.map(c=>({...c,actor_id:"me"}))}).length,0);
 assert.equal(type("newPlan",planPushMessages({...input,entries,changes,deviceSince:"2026-11-04T12:00:00Z"})).length,0);
});
test("deleted events notify affected participants, and completion-only edits do not count as rescheduling",()=>{
 const deleted:PushChange={id:1,entry:base,previous:base,action:"DELETE",actor_id:"partner",created_at:"2026-11-04T11:59:00Z"};
 assert.equal(type("eventChanges",planPushMessages({...input,entries:[],changes:[deleted]})).length,1);
 const completed={...base,data:{...base.data,eventOverrides:{"2026-11-04":{done:true}}}};
 assert.equal(type("eventChanges",planPushMessages({...input,entries:[completed],changes:[{...deleted,entry:completed,action:"UPDATE"}]})).length,0);
});
test("privacy removes record titles and all disabled types remain silent",()=>{
 const messages=planPushMessages({...input,preferences:{...preferences,hidePreview:true}});
 assert.ok(messages.length);assert.ok(messages.every(m=>m.title!=="Dengo" && !m.body.includes("Jantar")));
 const off={...preferences,enabled:Object.fromEntries(Object.keys(preferences.enabled).map(k=>[k,false]))};
 assert.equal(planPushMessages({...input,preferences:off}).length,0);
});
test("daily digest respects chosen time, counts only own/shared pending records and has a stable daily key",()=>{
 const result=type("dailyDigest");assert.equal(result.length,1);assert.equal(result[0].key,"digest:2026-11-04");
 assert.equal(type("dailyDigest",planPushMessages({...input,preferences:{...preferences,dailyTime:"10:00"}})).length,0);
 assert.equal(type("dailyDigest",planPushMessages({...input,entries:[]})).length,0);
});

test("new plan notifications name the action and distinguish movies, series and places",()=>{
 for(const [kind,mediaType,title] of [["movie","movie","Filme adicionado à lista"],["movie","tv","Série adicionada à lista"],["place",undefined,"Lugar adicionado à lista"]] as const) {
  const entry:Entry={...base,id:"new-plan",kind,title:"Nome privado",data:{mediaType}};
  const change:PushChange={id:42,entry,previous:null,actor_id:"partner",action:"INSERT",created_at:"2026-11-04T11:59:00Z"};
  for(const hidePreview of [true,false]) {
   const notice=type("newPlan",planPushMessages({...input,entries:[entry],changes:[change],preferences:{...preferences,hidePreview}}))[0];
   assert.equal(notice.title,title);
   assert.equal(notice.body.includes(entry.title),!hidePreview);
   assert.equal(notice.url,kind==="movie"?"/filmes":"/lugares");
   assert.equal(pushPresentation(notice,hidePreview).title,title);
  }
 }
});
test("delivery privacy keeps action and routing but removes personal content",()=>{
 const message={title:"Pagamento registrado",body:"Consulta particular R$ 500",url:"/compras",key:"stable"};
 assert.deepEqual(pushPresentation(message,false),message);
 assert.deepEqual(pushPresentation(message,true),{...message,body:"Toque para ver os detalhes no Dengo."});
 assert.equal(message.body,"Consulta particular R$ 500");
});
