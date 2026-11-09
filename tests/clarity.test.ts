import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string): string {
  return readFileSync(new URL("../" + path, import.meta.url), "utf8");
}

test("empty shopping and task lists show one create action, no redundant empty CTA", () => {
  const source = read("components/collection.tsx");
  assert.equal((source.match(/className="primary clean-create-button"/g) || []).length, 1);
  assert.doesNotMatch(source, /<div className="empty large">/);
  assert.doesNotMatch(source, /<Pencil size=\{16\} \/>\s*\{isTask \? "Criar tarefa"/);
  assert.match(source, /className="clean-collection-empty"/);
  assert.match(source, /all\.length > 0 \? \(\s*<div className="clean-list-controls">/);
});
test("search is progressive and responsibility filters stay visible", () => {
  const source=read("components/collection.tsx");
  assert.match(source, /const \[formOpen, setFormOpen\] = useState\(false\)/);
  assert.match(source, /\[showSearch, setShowSearch\] = useState\(false\)/);
  assert.match(source, /className="responsibility-filters"/);
  assert.match(source, /showSearch \|\| query \? \(/);
  assert.match(source, /placeholder=\{isTask \? "Nome da responsabilidade" : "Nome do item"\}/);
});
test("shopping header is not duplicated by an embedded list heading", () => {
  const source=read("components/collection.tsx");
  assert.match(source, /className=\{embedded \? "clean-embedded-collection-head"/);
  assert.doesNotMatch(source, /className="shopping-inline-title"/);
  const hub=read("components/shopping-hub.tsx");
  assert.match(hub, /<h1>Caderneta/);
  assert.match(hub, /className="purchases-tabs purchases-main-choice"/);
  assert.doesNotMatch(hub, /className="payment-section-nav"/);
});
test("mobile navigation avoids long wrap and refresh is available in settings", () => {
  const shell=read("components/shell.tsx");
  const settings=read("components/settings.tsx");
  const style=read("app/clarity.css");
  assert.match(shell, /label: "Combinados"/);
  assert.match(style, /\.bottom-nav a span\{white-space:nowrap/);
  assert.match(style, /\.topbar-refresh\{display:none!important\}/);
  assert.match(settings, /Atualizar registros/);
  assert.match(settings, /onClick=\{refresh\}/);
});
test("empty places and films have compact empty states and hidden filters", () => {
  const places=read("components/places.tsx");
  const movies=read("components/movies.tsx");
  assert.match(places, /all\.length > 0 \? <section className="places-filter-panel"/);
  assert.match(places, /<section className="clean-simple-empty"/);
  assert.doesNotMatch(places, /className="panel empty large"/);
  assert.match(movies, /all\.length > 0 \? <div className="saved-media-filters"/);
  assert.match(movies, /open=\{!all\.length\}/);
  assert.match(movies, /className="clean-simple-empty"/);
});
test("clarity CSS loaded last without removing brand", () => {
  const layout=read("app/layout.tsx");
  assert.match(layout,/import "\.\/globals\.css";\s*import "\.\/clean\.css";\s*import "\.\/clarity\.css";/);
  const style=read("app/clarity.css");
  for(const cls of [".clean-collection-empty",".clean-list-panel",".clean-list-filters",
    ".clean-search-toggle",".clean-create-button",".clean-place-collection-filter"]) {
    assert.ok(style.includes(cls),cls+" missing");
  }
});
