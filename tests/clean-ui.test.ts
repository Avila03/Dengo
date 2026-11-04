import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function file(path: string): string {
  return readFileSync(new URL("../" + path, import.meta.url), "utf8");
}

test("Clean visual stylesheet is loaded after the original design", () => {
  assert.match(file("app/layout.tsx"),
    /import "\.\/globals\.css";\s*import "\.\/clean\.css";/);
  const css=file("app/clean.css");
  for(const selector of [".clean-sheet-backdrop",".clean-item-menu",
    ".clean-place-details",".clean-discover",".clean-plan-details",
    ".clean-calendar-upcoming",".clean-shopping-summary"]) {
    assert.ok(css.includes(selector),selector+" is present in stylesheet");
  }
});
test("five tabs and gear shortcut remain accessible", () => {
  const src=file("components/shell.tsx");
  for(const href of ["/","/compromissos","/compras","/lugares","/filmes"]) {
    assert.ok(src.includes('href: "'+href+'"'),href);
  }
  assert.match(src,/href="\/configuracoes"/);
  assert.match(src,/className="bottom-nav"/);
});
test("core lists preserve editable actions through compact details", () => {
  const collection=file("components/collection.tsx");
  assert.match(collection,/className="clean-item-menu"/);
  assert.match(collection,/Registrar gasto/);
  assert.match(collection,/<DeleteButton/);
  assert.match(collection,/<CleanSheet/);

  const places=file("components/places.tsx");
  assert.match(places,/className="clean-place-details"/);
  assert.match(places,/safePlaceLink/);
  assert.match(places,/Planejar/);
  assert.match(places,/<DeleteButton/);
  assert.match(places,/<CleanSheet/);
});
test("media still has status, episode and feedback; discovery remains accessible", () => {
  const media=file("components/movies.tsx");
  for(const token of ['className="clean-media-details"',
    'className="media-discover clean-discover"',
    "currentSeason","currentEpisode","mediaFeedback","WATCH_STATUS_LABELS"]) {
    assert.ok(media.includes(token),token);
  }
  assert.match(media,/open=\{!all\.length\}/);
  assert.match(media,/<CleanSheet/);
});
test("calendars and payment plan advanced controls are not removed", () => {
  const calendar=file("components/calendar.tsx");
  assert.match(calendar,/className="clean-calendar-legend"/);
  assert.match(calendar,/className="clean-calendar-upcoming"/);
  assert.match(calendar,/className="clean-calendar-help"/);
  assert.match(calendar,/<CleanSheet/);
  const payments=file("components/payment-center.tsx");
  assert.match(payments,/className="clean-plan-details"/);
  assert.match(payments,/clean-plan-pay/);
  assert.match(payments,/setStatus\(plan,"paused"\)/);
  assert.match(payments,/setStatus\(plan,"active"\)/);
  assert.match(payments,/registered===0 \? <DeleteButton/);
  assert.match(payments,/<CleanSheet/);
  const finance=file("components/finance.tsx");
  assert.match(finance,/<CleanSheet/);
});
