import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  APPEARANCE_THEMES,DEFAULT_APPEARANCE,parseAppearance,appearanceStorageKey,
  CARD_STYLES,BACKGROUND_STYLES,TYPOGRAPHY_STYLES,ICON_STYLES,
} from "../lib/appearance.ts";

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
test("the exact 13 selected themes are present",()=>{
  assert.deepEqual(APPEARANCE_THEMES.map(t=>t.id),[
    "original","noite","lavanda","salvia","iris","grafite","floresta",
    "ametista","cobalto","atelier","fucsia","neon","mono"
  ]);
  assert.equal(new Set(APPEARANCE_THEMES.map(t=>t.id)).size,13);
  assert.equal(DEFAULT_APPEARANCE.theme,"original");
  assert.ok(APPEARANCE_THEMES.filter(t=>t.dark).length>=6);
  assert.equal(APPEARANCE_THEMES.find(t=>t.id==="fucsia")?.background,"#F52C98");
  assert.equal(APPEARANCE_THEMES.find(t=>t.id==="cobalto")?.background,"#1643D8");
});
test("all 13 themes meet AA contrast for readable surface text and buttons",()=>{
  const css=read("app/themes.css");
  for(const t of APPEARANCE_THEMES) {
    assert.ok(contrast(t.surface,t.ink)>=4.5,
      t.name+" surface text does not meet AA");
    const selector=':root[data-dengo-theme="'+t.id+'"]{';
    const declaration=css.split("\n").find(line=>line.startsWith(selector));
    assert.ok(declaration,t.name+" CSS selector not found");
    const buttonInk=declaration!.match(/--accent-ink:(#[0-9A-Fa-f]{6})/);
    assert.ok(buttonInk,t.name+" button text token not found");
    assert.ok(contrast(t.accent,buttonInk![1])>=4.5,
      t.name+" action text does not meet AA");
    assert.ok(declaration!.includes("--rose:"+t.accent),
      t.name+" theme color not synchronized");
  }
});
test("unknown values fall back to safe defaults",()=>{
  assert.deepEqual(parseAppearance(null),DEFAULT_APPEARANCE);
  assert.deepEqual(parseAppearance({theme:"not-a-theme",cards:"bad",background:"bad",font:"bad",icons:"bad"}),DEFAULT_APPEARANCE);
  assert.deepEqual(parseAppearance({theme:"neon",cards:"glass"}),{
    ...DEFAULT_APPEARANCE,theme:"neon",cards:"glass",
  });
  assert.notEqual(appearanceStorageKey("person-one"),appearanceStorageKey("person-two"));
  assert.notEqual(appearanceStorageKey("person-one"),appearanceStorageKey("demo"));
});
test("five independently selectable customization dimensions remain available",()=>{
  assert.deepEqual([...CARD_STYLES],["classic","minimal","glass","editorial"]);
  assert.deepEqual([...BACKGROUND_STYLES],["solid","gradient","pattern","aura"]);
  assert.deepEqual([...TYPOGRAPHY_STYLES],["classic","modern","editorial"]);
  assert.deepEqual([...ICON_STYLES],["line","filled","rounded"]);
  const picker=read("components/appearance-studio.tsx");
  assert.match(picker,/APPEARANCE_THEMES\.map/);
  assert.match(picker,/setAppearance\(\{theme:theme\.id\}\)/);
  assert.match(picker,/setAppearance\(\{cards:event\.target\.value as CardStyle\}\)/);
  assert.match(picker,/setAppearance\(\{background:event\.target\.value as BackgroundStyle\}\)/);
  assert.match(picker,/setAppearance\(\{font:event\.target\.value as TypographyStyle\}\)/);
  assert.match(picker,/setAppearance\(\{icons:event\.target\.value as IconStyle\}\)/);
  assert.match(picker,/resetAppearance/);
});
test("appearance persists per login in auth metadata, not shared couple settings",()=>{
  const appearance=read("components/appearance-provider.tsx");
  const provider=read("components/provider.tsx");
  const settings=read("components/settings.tsx");
  assert.match(appearance,/user\?\.user_metadata\?\.dengo_appearance/);
  assert.match(appearance,/client\.auth\.updateUser\(\{data:\{dengo_appearance:appearance\}\}\)/);
  assert.match(appearance,/appearanceStorageKey\(userId\)/);
  assert.match(appearance,/lastRemote\.current/);
  assert.match(appearance,/previousId:Record<string,Appearance\["theme"\]>/);
  assert.match(provider,/<AppearanceProvider user=\{user\} demo=\{demoMode\}>/);
  assert.match(settings,/<AppearanceStudio \/>/);
  assert.doesNotMatch(settings,/<ThemePicker \/>/);
  assert.doesNotMatch(provider,/saveTheme/);
  assert.doesNotMatch(provider,/savePreferences.*dengo_appearance/);
});
test("global theme rules are loaded last and customize all controls",()=>{
  const layout=read("app/layout.tsx");
  assert.match(layout,/import "\.\/globals\.css";[\s\S]*import "\.\/clean\.css";[\s\S]*import "\.\/clarity\.css";[\s\S]*import "\.\/themes\.css";/);
  const css=read("app/themes.css");
  for(const key of ["data-dengo-cards","data-dengo-background","data-dengo-icons","data-dengo-font",
    "payment-overview-card","clean-sheet","bottom-nav","purchases-main-choice",
    "appearance-theme-choice","appearance-theme-grid"]) {
    assert.ok(css.includes(key),key+" missing in theme CSS");
  }
  const appearance=read("components/appearance-provider.tsx");
  for(const key of ["dengoTheme","dengoCards","dengoBackground","dengoFont","dengoIcons"]) {
    assert.match(appearance,new RegExp("root\\.dataset\\."+key));
  }
});
