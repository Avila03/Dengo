import { test } from "node:test";
import assert from "node:assert/strict";
import { leaveCoupleMessage, vacantSlot } from "../lib/lobby.ts";

test("o lugar livre é sempre o oposto de quem ficou", () => {
  assert.equal(vacantSlot(0), 1);
  assert.equal(vacantSlot(1), 0);
});

test("mensagens de saída não expõem detalhes técnicos", () => {
  assert.equal(leaveCoupleMessage(null), "");
  assert.match(leaveCoupleMessage({ code: "DG001", message: "x" }), /última pessoa/);
  assert.equal(leaveCoupleMessage({ code: "P0001", message: "Sua conta não pertence a um casal." }),
    "Sua conta não pertence a um casal.");
  // Função ainda não criada no banco, erro de rede ou outro código do PostgREST.
  assert.match(leaveCoupleMessage({ code: "PGRST202", message: "Could not find the function" }), /Não foi possível sair/);
  assert.match(leaveCoupleMessage({}), /Não foi possível sair/);
});
