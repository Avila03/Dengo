import test from "node:test";
import assert from "node:assert/strict";
import { passwordChangeProblem, passwordChangeMessage } from "../lib/password.ts";

test("troca de senha valida os campos", () => {
  assert.equal(passwordChangeProblem("", "novasenha1", "novasenha1"), "Digite a senha atual.");
  assert.match(passwordChangeProblem("velha123", "curta", "curta"), /8 caracteres/);
  assert.match(passwordChangeProblem("velha123", "novasenha1", "novasenha2"), /confirmação/);
  assert.match(passwordChangeProblem("mesma1234", "mesma1234", "mesma1234"), /diferente/);
  assert.equal(passwordChangeProblem("velha123", "novasenha1", "novasenha1"), "");
});

test("erros do Supabase viram mensagens em português", () => {
  assert.equal(passwordChangeMessage({ code: "invalid_credentials", message: "Invalid login credentials" }), "A senha atual não confere.");
  assert.match(passwordChangeMessage({ code: "weak_password" }), /fraca/);
  assert.match(passwordChangeMessage({ code: "same_password" }), /diferente/);
  assert.match(passwordChangeMessage({ message: "boom" }), /Não foi possível/);
});
