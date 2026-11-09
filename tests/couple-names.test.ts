import { test } from "node:test";
import assert from "node:assert/strict";
import { TOGETHER, coupleNamesError, isReservedName, personNameError, type Entry } from "../lib/model.ts";
import { filterResponsible } from "../lib/task-filters.ts";

test("o responsável compartilhado é reservado em qualquer grafia", () => {
  for (const name of [TOGETHER, "nós dois", "  NÓS   DOIS ", "Nos dois"]) assert.equal(isReservedName(name), true, name);
  for (const name of ["Nós", "Dois", "Nós dois e o gato", "Ana"]) assert.equal(isReservedName(name), false, name);
});

test("nome de pessoa: obrigatório, até 60 caracteres e diferente do compartilhado", () => {
  assert.equal(personNameError("Ana"), "");
  assert.match(personNameError("   "), /até 60/);
  assert.match(personNameError("a".repeat(61)), /até 60/);
  assert.match(personNameError("nós dois"), /tarefas dos dois/);
});

test("nomes do casal precisam ser diferentes, inclusive sem acento ou maiúsculas", () => {
  assert.equal(coupleNamesError(["Ana", "Bruno"]), "");
  assert.match(coupleNamesError(["Ana", " ana "]), /dois nomes diferentes/);
  assert.match(coupleNamesError(["José", "jose"]), /dois nomes diferentes/);
  assert.match(coupleNamesError(["Ana", "Nós dois"]), /tarefas dos dois/);
  assert.match(coupleNamesError(["Ana"]), /dois nomes/);
});

test("filtro 'Dos dois' usa o mesmo valor salvo pelos formulários", () => {
  const entry = { id: "1", kind: "task", title: "Lavar a louça", detail: "", assignee: TOGETHER,
    due: "", done: false, created_at: "2026-01-01T00:00:00Z" } satisfies Entry;
  assert.equal(filterResponsible(entry, "together", ["Ana", "Bruno"], 0), true);
  assert.equal(filterResponsible(entry, "mine", ["Ana", "Bruno"], 0), false);
});
