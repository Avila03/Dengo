import {test} from "node:test";
import assert from "node:assert/strict";
import {parseQuantity,shoppingItemTotal,plannedShoppingTotal,makePurchaseExpense} from "../lib/shopping.ts";
import {parseSharePercent,splitAmount,balance,monthlySummary} from "../lib/finance.ts";
import {goalProgress,taskSubtasks,completeTaskChildren,cloneSubtasks,withoutEntryAndChildren} from "../lib/couple-planning.ts";
import {parseInboxRows,notificationUrl} from "../lib/notification-inbox.ts";
import {validateDraft,readEntries,type Entry} from "../lib/model.ts";
const base:Entry={id:"parent",kind:"task",title:"Viagem",detail:"",due:"2026-11-04",assignee:"Nós dois",done:false,created_at:"2026-11-04T12:00:00Z",data:{}};
test("shopping quantity accepts fractional units and rounds each item's extended price exactly once",()=>{
 assert.equal(parseQuantity("2"),2000);assert.equal(parseQuantity("1,525"),1525);assert.equal(parseQuantity("0.001"),1);
 assert.equal(shoppingItemTotal(2000,499),998);assert.equal(shoppingItemTotal(1500,499),749);
 assert.equal(shoppingItemTotal(1001,500),501);assert.equal(shoppingItemTotal(3,100),0);
 for(const value of ["0","-1","1,0000","1e3","1.234,5",""])assert.throws(()=>parseQuantity(value));
 assert.throws(()=>shoppingItemTotal(1000000000,100000000));
});
test("item estimates include extended prices, retain legacy budgets, and do not change paid balance",()=>{
 const item:Entry={...base,kind:"shopping",data:{quantityMilli:2000,unit:"l",unitPrice:499,budget:998}};
 const legacy:Entry={...base,id:"old",kind:"shopping",data:{budget:1200}};
 assert.equal(plannedShoppingTotal([item,legacy]),2198);
 assert.equal(plannedShoppingTotal([{...item,done:true},legacy]),1200);
 assert.equal(balance([item,legacy]),0);
 assert.doesNotThrow(()=>validateDraft(item));
 assert.throws(()=>validateDraft({...item,data:{...item.data,budget:499}}),/corresponder/);
 assert.throws(()=>validateDraft({...item,data:{...item.data,quantityMilli:0}}));
 assert.throws(()=>validateDraft({...item,data:{...item.data,unit:"invalid"}}));
});
test("custom splits accept comma decimals, individual purchases and preserve every cent",()=>{
 assert.equal(parseSharePercent("60"),6000);assert.equal(parseSharePercent("33,33"),3333);
 assert.equal(parseSharePercent("0"),0);assert.equal(parseSharePercent("100.00"),10000);
 for(const value of ["101","-1","33.333","", "NaN"])assert.throws(()=>parseSharePercent(value));
 for(const amount of [1,3,999,10001])for(const share of [0,1,3333,5000,6000,9999,10000]) {
  const portions=splitAmount(amount,share);assert.equal(portions[0]+portions[1],amount);
 }
 const item:Entry={...base,kind:"shopping"};
 const draft=makePurchaseExpense(item,{amount:"10,01",payer:0,shareFirst:6000,paid:true,date:base.due,category:"Mercado",names:["A","B"]});
 assert.equal(draft.data?.shareFirst,6000);assert.equal(balance([{...base,...draft}]),400);
 assert.deepEqual(splitAmount(1001,6000),[601,400]);
 assert.throws(()=>makePurchaseExpense(item,{amount:"10",payer:0,shareFirst:10001,paid:true,date:base.due,category:"Mercado",names:["A","B"]}));
});
test("goal progress combines independent contributions without mixing goals or affecting expenses and settlements",()=>{
 const goal:Entry={...base,kind:"goal",data:{goalTarget:10000}};
 const saving:Entry={...base,id:"s1",kind:"saving",done:true,data:{goalId:goal.id,amount:3000,payer:0}};
 const second:Entry={...saving,id:"s2",data:{...saving.data,amount:2500,payer:1}};
 const other:Entry={...saving,id:"other",data:{...saving.data,goalId:"other",amount:90000}};
 const entries=[goal,saving,second,other];const progress=goalProgress(entries,goal);
 assert.equal(progress.saved,5500);assert.equal(progress.remaining,4500);assert.equal(progress.percent,55);
 assert.equal(progress.movements.length,2);assert.equal(balance(entries),0);assert.equal(monthlySummary(entries,"2026-11").total,0);
 const reached=goalProgress([...entries,{...saving,id:"s3",data:{...saving.data,amount:6000}}],goal);
 assert.equal(reached.percent,100);assert.equal(reached.remaining,0);assert.equal(reached.saved,11500);
 assert.doesNotThrow(()=>validateDraft(goal));assert.doesNotThrow(()=>validateDraft(saving));
 assert.throws(()=>validateDraft({...goal,data:{goalTarget:0}}));
 assert.throws(()=>validateDraft({...saving,data:{amount:3000,payer:0}}));
 assert.equal(readEntries(JSON.stringify(entries)).length,4);
});
test("subtasks are scoped to their parent, completed with it, reset for a recurring successor and removed with it",()=>{
 const first:Entry={...base,id:"step1",kind:"subtask",data:{parentId:base.id}};
 const second:Entry={...first,id:"step2",done:true};
 const unrelated:Entry={...first,id:"unrelated",data:{parentId:"other"}};
 const entries=[base,first,second,unrelated];
 assert.equal(taskSubtasks(entries,base.id).length,2);
 const completed=completeTaskChildren(entries,{...base,done:true});
 assert.equal(taskSubtasks(completed,base.id).filter(e=>e.done).length,2);
 assert.equal(completed.find(e=>e.id==="unrelated")?.done,false);
 const next={...base,id:"next",assignee:"B",created_at:"2026-11-11T12:00:00Z"};
 const clones=cloneSubtasks(completed,base,next);
 assert.equal(clones.length,2);assert.ok(clones.every(e=>!e.done&&e.data?.parentId==="next"&&e.assignee==="B"));
 assert.equal(new Set(clones.map(e=>e.id)).size,2);
 assert.deepEqual(withoutEntryAndChildren(entries,base.id).map(e=>e.id),["unrelated"]);
 assert.doesNotThrow(()=>validateDraft(first));assert.throws(()=>validateDraft({...first,data:{}}));
});
test("inbox navigation stays inside the app and unknown notification types are ignored",()=>{
 assert.equal(notificationUrl("//outside.example"),"/");assert.equal(notificationUrl("https://outside.example"),"/");
 assert.equal(notificationUrl("/\\outside.example"),"/");assert.equal(notificationUrl("/calendario?data=2026-11-04"),"/calendario?data=2026-11-04");
 const row={id:"n1",type:"dailyDigest",title:"Resumo",body:"Seu dia",url:"/",created_at:base.created_at,read_at:null};
 assert.equal(parseInboxRows([row,{...row,type:"unknown"},null]).length,1);
 assert.equal(parseInboxRows([{...row,url:"//outside.example"}])[0].url,"/");
});
