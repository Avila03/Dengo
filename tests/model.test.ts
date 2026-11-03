import { test } from "node:test";
import assert from "node:assert/strict";
import { readEntries, isOverdue, type Entry } from "../lib/model.ts";
const item: Entry = {
  id: "1",
  kind: "task",
  title: "Plantas",
  detail: "",
  assignee: "Nós dois",
  due: "2026-11-01",
  done: false,
  created_at: "2026-11-01T12:00:00Z",
};
test("local data survives a storage round trip", () =>
  assert.deepEqual(readEntries(JSON.stringify([item])), [item]));
test("corrupt or outdated local records are rejected rather than overwritten", () => {
  assert.throws(() => readEntries("{"));
  assert.throws(() => readEntries('[{"title":"incomplete"}]'));
  assert.throws(() => readEntries("{}"));
});
test("only unfinished tasks before today are overdue", () => {
  assert.equal(isOverdue(item, "2026-11-03"), true);
  assert.equal(isOverdue({ ...item, done: true }, "2026-11-03"), false);
  assert.equal(isOverdue({ ...item, due: "" }, "2026-11-03"), false);
  assert.equal(isOverdue(item, "2026-11-01"), false);
});
