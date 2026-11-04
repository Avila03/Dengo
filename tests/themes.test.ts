import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  THEMES, DEFAULT_THEME, isThemeId, normalizeTheme, themeStorageKey, themeById,
} from "../lib/themes.ts";

function source(path:string) {
  return readFileSync(new URL("../"+path, import.meta.url),"utf8");
}
function luminance(hex:string) {
  const values=(hex.slice(1).match(/.{2}/g)||[]).map(s=>parseInt(s,16)/255)
    .map(n=>n<=0.04045?n/12.92:Math.pow((n+0.055)/1.055,2.4));
  return .2126*values[0]+.7152*values[1]+.0722*values[2];
}
function contrast(a:string,b:string) {
  const [bright,dark]=[luminance(a),luminance(b)].sort((x,y)=>y-x);
  return (bright+.05)/(dark+.05);
}

test("the six approved themes are available with distinct strong identities",()=>{
  assert.deepEqual(THEMES.map(t=>t.id),
    ["original","noite","lavanda","salvia","inverno","ouro"]);
  assert.equal(DEFAULT_THEME,"original");
  assert.equal(new Set(THEMES.map(t=>t.accent)).size,6);
  assert.equal(THEMES.filter(t=>t.dark).length,3);
  assert.equal(themeById("noite").dark,true);
  assert.equal(themeById("salvia").dark,true);
  assert.equal(themeById("ouro").dark,true);
  assert.equal(themeById("lavanda").accent,"#6636C9");
  assert.equal(themeById("inverno").accent,"#185DCE");
  assert.equal(themeById("salvia").background,"#0E261D");
  assert.equal(themeById("ouro").background,"#0B0B0C");
});
test("all six palettes meet at least WCAG AA text contrast for primary controls",()=>{
  for(const theme of THEMES) {
    assert.ok(contrast(theme.surface,theme.ink)>=4.5,
      theme.name+" text on surface has insufficient contrast");
    assert.ok(contrast(theme.accent,theme.actionText)>=4.5,
      theme.name+" button lacks accessible text contrast");
  }
});
test("unknown themes gracefully restore Original; storage never shares between accounts",()=>{
  assert.equal(normalizeTheme("invalid"),DEFAULT_THEME);
  assert.equal(normalizeTheme(null),DEFAULT_THEME);
  assert.equal(normalizeTheme("ouro"),"ouro");
  assert.equal(isThemeId("salvia"),true);
  assert.equal(isThemeId("fake"),false);
  assert.notEqual(themeStorageKey("alice"),themeStorageKey("bob"));
  assert.notEqual(themeStorageKey("alice"),themeStorageKey(null));
});
test("theme selection previews immediately and commits only when requested",()=>{
  const picker=source("components/theme-picker.tsx");
  assert.match(picker,/applyDocumentTheme\(preview\)/);
  assert.match(picker,/return \(\) => applyDocumentTheme\(theme\)/);
  assert.match(picker,/await saveTheme\(value\)/);
  assert.match(picker,/disabled=\{themeSaving \|\| preview===theme\}/);
  assert.match(picker,/Restaurar Original/);
  assert.match(picker,/aria-pressed=\{selected\}/);
  assert.match(picker,/THEMES\.map/);
});
test("themes persist to the logged-in person's Auth metadata, not shared space prefs",()=>{
  const provider=source("components/provider.tsx");
  assert.match(provider,/supabase\.auth\.updateUser\(\{\s*data: \{ dengo_theme: next \}/);
  assert.match(provider,/user\?\.user_metadata\?\.dengo_theme/);
  assert.match(provider,/localStorage\.setItem\(themeStorageKey\(user\?\.id\), next\)/);
  assert.match(provider,/themeStorageKey\(user\?\.id\)/);
  assert.match(provider,/saveTheme,/);
  const settings=source("components/settings.tsx");
  assert.match(settings,/<ThemePicker \/>/);
  assert.doesNotMatch(settings,/theme:\s*\w+\s*,\s*budgets:/);
});
test("the theme layer loads after all previous styles and covers all theme IDs",()=>{
  const layout=source("app/layout.tsx");
  assert.match(layout,/import "\.\/globals\.css";[\s\S]*import "\.\/clean\.css";[\s\S]*import "\.\/clarity\.css";[\s\S]*import "\.\/themes\.css";/);
  const css=source("app/themes.css");
  for(const theme of THEMES) {
    assert.ok(css.includes('data-dengo-theme="'+theme.id+'"'),
      theme.name+" selector missing from CSS");
    assert.ok(css.includes("--rose:"+theme.accent),
      theme.name+" color not used in theme CSS");
  }
  assert.match(css,/data-dengo-dark="true"/);
  assert.match(css,/\.appearance-options/);
  assert.match(css,/\.appearance-miniature/);
  assert.match(css,/\.clean-sheet/);
  assert.match(css,/\.bottom-nav/);
});
