import { test } from "node:test";
import assert from "node:assert/strict";
import { invitationCode, authorName } from "../lib/lobby.ts";
test("invitation accepts the original code or a copied link and normalizes case", () => {
  const c = "ABCDEF0123456789ABCDEF0123456789";
  assert.equal(invitationCode(c), c.toLowerCase());
  assert.equal(
    invitationCode("https://dengo.example/?convite=" + c + "&x=1"),
    c.toLowerCase(),
  );
});
test("invalid or missing invitation tokens are rejected before a request", () => {
  for (const s of [
    "",
    "1234",
    "https://dengo.example/",
    "javascript:alert(1)",
    "z".repeat(32),
  ])
    assert.throws(() => invitationCode(s));
});
test("record authors use account slots and never guess legacy attribution", () => {
  assert.equal(authorName(1, ["Bruno", "Seu par"]), "Seu par");
  assert.equal(authorName(0, ["Bruno", "Seu par"]), "Bruno");
  assert.equal(authorName(null, ["Bruno", "Seu par"]), "Registro anterior");
});
