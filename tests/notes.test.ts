import { test } from "node:test";
import assert from "node:assert/strict";
import { noteBodyError, noteWhen, readDemoNotes, NOTE_MAX } from "../lib/notes.ts";
import { penOf, TOGETHER } from "../lib/model.ts";
import { daysTogether } from "../lib/today.ts";

test("bilhete precisa de texto e cabe em 280 caracteres", () => {
  assert.match(noteBodyError("   "), /Escreva/);
  assert.equal(noteBodyError(" oi "), "");
  assert.match(noteBodyError("a".repeat(NOTE_MAX + 1)), /280/);
});

test("bilhetes da demonstração ignoram dados corrompidos", () => {
  assert.deepEqual(readDemoNotes("{quebrado"), []);
  const ok = { id: "1", author_slot: 1, body: "oi", created_at: "2026-11-09T12:00:00Z" };
  assert.deepEqual(readDemoNotes(JSON.stringify([ok, { id: 2 }, { ...ok, author_slot: 3 }])), [ok]);
});

test("quando o bilhete foi colado, em palavras", () => {
  const now = new Date("2026-11-09T15:00:00");
  assert.equal(noteWhen(new Date("2026-11-09T14:59:30").toISOString(), now), "agora há pouco");
  assert.equal(noteWhen(new Date("2026-11-09T14:20:00").toISOString(), now), "há 40 min");
  assert.equal(noteWhen(new Date("2026-11-09T09:00:00").toISOString(), now), "há 6 h");
  assert.equal(noteWhen(new Date("2026-11-08T22:00:00").toISOString(), now), "ontem");
  assert.match(noteWhen(new Date("2026-10-12T10:00:00").toISOString(), now), /12/);
});

test("cada um com sua caneta", () => {
  const names = ["Ana", "Bruno"];
  assert.equal(penOf("Ana", names), "a");
  assert.equal(penOf("Bruno", names), "b");
  assert.equal(penOf(TOGETHER, names), "both");
  assert.equal(penOf("Nome antigo", names), "other");
});

test("dias juntos a partir da data do casal", () => {
  assert.equal(daysTogether("2022-03-14", "2026-11-09"), 1701);
  assert.equal(daysTogether("2026-11-09", "2026-11-09"), 0);
  assert.equal(daysTogether("2027-01-01", "2026-11-09"), 0);
  assert.equal(daysTogether("", "2026-11-09"), 0);
});
