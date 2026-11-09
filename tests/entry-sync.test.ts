import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Entry } from "../lib/model.ts";
import { mergeEntrySync, planEntrySync, syncEntries } from "../lib/entry-sync.ts";

const entry = (id: string, created: number, updated: number | null = created, title = id): Entry => ({
  id, kind: "task", title, detail: "", assignee: "Nós dois", due: "", done: false,
  space_id: "s1",
  created_at: new Date(Date.UTC(2026, 0, 1, 0, created)).toISOString(),
  updated_at: updated === null ? null : new Date(Date.UTC(2026, 0, 1, 0, updated)).toISOString(),
});
const stamp = (e: Entry) => ({ id: e.id, created_at: e.created_at, updated_at: e.updated_at });
/** Ordem do servidor: mais recentes primeiro. */
const byServerOrder = (list: Entry[]) =>
  [...list].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));

/** Banco falso que entende só as consultas usadas pela sincronização. */
function fakeDb(rows: Entry[]) {
  const calls: { select: string; ids?: string[]; range?: [number, number] }[] = [];
  const db = {
    from(table: string) {
      assert.equal(table, "entries");
      let select = "*", ids: string[] | undefined, space = "", range: [number, number] | undefined;
      const run = () => {
        calls.push({ select, ids, range });
        let data: Partial<Entry>[] = byServerOrder(rows).filter((r) => r.space_id === space);
        if (ids) data = data.filter((r) => ids!.includes(r.id!));
        if (range) data = data.slice(range[0], range[1] + 1);
        if (select !== "*") data = data.map((r) => ({ id: r.id, created_at: r.created_at, updated_at: r.updated_at }));
        return Promise.resolve({ data, error: null });
      };
      const query = {
        select(cols: string) { select = cols; return query; },
        eq(_col: string, value: string) { space = value; return query; },
        order() { return query; },
        in(_col: string, values: string[]) { ids = values; return run(); },
        range(a: number, b: number) { range = [a, b]; return run(); },
      };
      return query;
    },
  };
  return { db: db as unknown as SupabaseClient, calls };
}

test("sem mudanças, nada é baixado por inteiro e a lista é a mesma referência", async () => {
  const rows = byServerOrder([entry("a", 1), entry("b", 2), entry("c", 3)]);
  const { db, calls } = fakeDb(rows);
  const result = await syncEntries(db, "s1", rows);
  assert.equal(result, rows);
  assert.deepEqual(calls.map((c) => c.select), ["id,created_at,updated_at"]);
});

test("baixa só o registro alterado e o novo; remove o excluído", async () => {
  const before = byServerOrder([entry("a", 1), entry("b", 2), entry("c", 3), entry("d", 4), entry("e", 5)]);
  const server = byServerOrder([
    entry("a", 1), entry("b", 2, 9, "b editado"), entry("d", 4), entry("e", 5), entry("f", 10),
  ]);
  const { db, calls } = fakeDb(server);
  const result = await syncEntries(db, "s1", before);
  assert.deepEqual(result.map((e) => e.id), ["f", "e", "d", "b", "a"]);
  assert.equal(result.find((e) => e.id === "b")!.title, "b editado");
  // Registros inalterados são reaproveitados (mesmo objeto).
  assert.equal(result.find((e) => e.id === "a"), before.find((e) => e.id === "a"));
  const full = calls.filter((c) => c.select === "*");
  assert.equal(full.length, 1);
  assert.deepEqual([...full[0].ids!].sort(), ["b", "f"]);
});

test("registro antigo sem updated_at só é baixado quando muda", () => {
  const old = entry("x", 1, null);
  assert.deepEqual(planEntrySync([old], [stamp(old)]).fetch, []);
  assert.deepEqual(planEntrySync([old], [{ ...stamp(old), updated_at: "2026-02-01T00:00:00.000Z" }]).fetch, ["x"]);
});

test("sem cópia local, faz o carregamento completo", async () => {
  const rows = [entry("a", 1), entry("b", 2)];
  const { db, calls } = fakeDb(rows);
  const result = await syncEntries(db, "s1", []);
  assert.deepEqual(result.map((e) => e.id), ["b", "a"]);
  assert.deepEqual(calls.map((c) => c.select), ["*"]);
});

test("com quase tudo alterado, prefere o carregamento completo", async () => {
  const before = [entry("a", 1), entry("b", 2), entry("c", 3)];
  const server = [entry("a", 1, 7), entry("b", 2, 8), entry("c", 3)];
  const { db, calls } = fakeDb(server);
  const result = await syncEntries(db, "s1", byServerOrder(before));
  assert.deepEqual(result.map((e) => e.updated_at), byServerOrder(server).map((e) => e.updated_at));
  assert.equal(calls.filter((c) => c.select === "*" && !c.ids).length, 1);
});

test("muitos registros alterados são buscados em lotes", async () => {
  const before = Array.from({ length: 400 }, (_, i) => entry("id" + String(i).padStart(3, "0"), i));
  const server = before.map((e, i) => (i < 150 ? { ...e, updated_at: "2026-03-01T00:00:00.000Z" } : e));
  const { db, calls } = fakeDb(server);
  const result = await syncEntries(db, "s1", byServerOrder(before));
  assert.equal(result.length, 400);
  assert.equal(result.filter((e) => e.updated_at === "2026-03-01T00:00:00.000Z").length, 150);
  assert.deepEqual(calls.filter((c) => c.ids).map((c) => c.ids!.length), [100, 50]);
});

test("registro excluído entre as duas consultas não reaparece", () => {
  const a = entry("a", 1), b = entry("b", 2);
  const merged = mergeEntrySync([a], [stamp(b), stamp(a)], []);
  assert.deepEqual(merged.map((e) => e.id), ["a"]);
});
