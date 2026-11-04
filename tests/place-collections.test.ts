import { test } from "node:test";
import assert from "node:assert/strict";
import type { Entry } from "../lib/model.ts";
import {
  DEFAULT_PLACE_COLLECTIONS, placeCollection, placeCollections, filterPlaces,
} from "../lib/place-collections.ts";

const entries: Entry[] = [
  {
    id:"a", kind:"place", title:"Café A", detail:"", assignee:"Nós dois",
    due:"", done:false, created_at:"2026-11-03T10:00:00Z",
    data:{category:"Café",placeCollection:"Cafés",favorite:true},
  },
  {
    id:"b",kind:"place", title:"Restaurante B",detail:"",assignee:"Nós dois",
    due:"",done:true,created_at:"2026-11-03T10:00:00Z",
    data:{category:"Restaurante",placeCollection:"Encontros",favorite:false,visitedAt:"2026-11-01"},
  },
  {
    id:"c",kind:"place", title:"Parque C",detail:"",assignee:"Nós dois",
    due:"",done:false,created_at:"2026-11-03T10:00:00Z",
    data:{placeCollection:"Férias na serra",favorite:true},
  },
];
test("couple can create named collections while keeping defaults",()=>{
  const names=placeCollections(entries);
  for(const name of DEFAULT_PLACE_COLLECTIONS)assert.ok(names.includes(name));
  assert.ok(names.includes("Férias na serra"));
  assert.equal(placeCollection("  Férias  na  serra "),"Férias na serra");
  assert.equal(placeCollection(null),"Encontros");
});
test("places filter composes collection, favorites, and visited state",()=>{
  assert.deepEqual(filterPlaces(entries,"want","",false).map(x=>x.id),["a","c"]);
  assert.deepEqual(filterPlaces(entries,"visited","",false).map(x=>x.id),["b"]);
  assert.deepEqual(filterPlaces(entries,"all","Cafés",true).map(x=>x.id),["a"]);
  assert.deepEqual(filterPlaces(entries,"all","Encontros",true),[]);
  assert.deepEqual(filterPlaces(entries,"all","",true).map(x=>x.id),["a","c"]);
  assert.equal(entries[1].data?.visitedAt,"2026-11-01");
});
test("custom collections are scoped to saved places, not tasks",()=>{
  const task:Entry={...entries[0],kind:"task",id:"task",data:{placeCollection:"Não é lugar"}};
  assert.ok(!placeCollections([...entries,task]).includes("Não é lugar"));
  assert.deepEqual(filterPlaces([task],"all","",false),[]);
});
