import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {APPEARANCE_THEMES,DEFAULT_APPEARANCE,parseAppearance,appearanceStorageKey,themeById} from "../lib/appearance.ts";

function read(path:string) {
  return readFileSync(new URL("../"+path,import.meta.url),"utf8");
}
function luminance(hex:string) {
  const values=(hex.slice(1).match(/.{2}/g)||[]).map(s=>parseInt(s,16)/255)
    .map(n=>n<=0.04045?n/12.92:Math.pow((n+.055)/1.055,2.4));
  return .2126*values[0]+.7152*values[1]+.0722*values[2];
}
function contrast(a:string,b:string) {
  const [light,dark]=[luminance(a),luminance(b)].sort((x,y)=>y-x);
  return (light+.05)/(dark+.05);
}
function tokens(id:string) {
  const line=read("app/themes.css").split("\n").find(l=>l.startsWith(':root[data-dengo-theme="'+id+'"]{'));
  assert.ok(line,id+" CSS selector not found");
  return Object.fromEntries([...line!.matchAll(/--([\w-]+):(#[0-9A-Fa-f]{6})/g)].map(m=>[m[1],m[2]]));
}

test("só existem o Caderno de dia e o Caderno à noite",()=>{
  assert.deepEqual(APPEARANCE_THEMES.map(t=>t.id),["caderno","caderno-noite"]);
  assert.equal(DEFAULT_APPEARANCE.theme,"caderno");
  assert.deepEqual(APPEARANCE_THEMES.map(t=>t.dark),[false,true]);
  assert.equal(themeById("caderno-noite").name,"Caderno à noite");
});

test("os dois cadernos têm contraste AA em texto, canetas e botões",()=>{
  for(const t of APPEARANCE_THEMES) {
    const c=tokens(t.id);
    assert.equal(c.rose,t.accent,t.name+": cor de ação dessincronizada");
    assert.equal(c.bg,t.background,t.name+": fundo dessincronizado");
    for(const [fg,bg] of [["ink","bg"],["ink","paper"],["muted","bg"],["muted","paper"],
      ["pen-a","paper"],["pen-b","paper"],["pen-both","paper"],["rose","paper"],["green","paper"],["ink","sticky"],["ink","hl"]]) {
      assert.ok(contrast(c[fg],c[bg])>=4.5,`${t.name}: ${fg} sobre ${bg} = ${contrast(c[fg],c[bg]).toFixed(2)}`);
    }
    assert.ok(contrast(c.rose,c["accent-ink"])>=4.5,t.name+": texto dos botões");
  }
});

test("temas antigos do Dengo Studio viram o caderno equivalente",()=>{
  assert.deepEqual(parseAppearance(null),DEFAULT_APPEARANCE);
  assert.deepEqual(parseAppearance({theme:"original",cards:"glass"}),{theme:"caderno"});
  assert.deepEqual(parseAppearance({theme:"fucsia"}),{theme:"caderno"});
  for(const dark of ["noite","salvia","iris","grafite","floresta","ametista","neon"])
    assert.deepEqual(parseAppearance({theme:dark}),{theme:"caderno-noite"},dark);
  assert.deepEqual(parseAppearance({theme:"caderno-noite"}),{theme:"caderno-noite"});
  assert.notEqual(appearanceStorageKey("person-one"),appearanceStorageKey("person-two"));
});

test("a aparência é individual: metadados do login, não preferências do casal",()=>{
  const appearance=read("components/appearance-provider.tsx");
  const provider=read("components/provider.tsx");
  const settings=read("components/settings.tsx");
  assert.match(appearance,/user\?\.user_metadata\?\.dengo_appearance/);
  assert.match(appearance,/client\.auth\.updateUser\(\{data:\{dengo_appearance:appearance\}\}\)/);
  assert.match(appearance,/root\.dataset\.dengoTheme/);
  assert.match(provider,/<AppearanceProvider user=\{user\} demo=\{demoMode\}>/);
  assert.match(settings,/<AppearanceStudio \/>/);
  assert.doesNotMatch(provider,/savePreferences.*dengo_appearance/);
  const picker=read("components/appearance-studio.tsx");
  assert.match(picker,/APPEARANCE_THEMES\.map/);
  assert.match(picker,/aria-pressed=\{selected\}/);
});
