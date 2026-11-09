import { test } from "node:test";
import assert from "node:assert/strict";
import { isOffline } from "../lib/connection.ts";

test("só considera offline quando o navegador diz explicitamente", () => {
  assert.equal(isOffline({ onLine: false }), true);
  assert.equal(isOffline({ onLine: true }), false);
  // Sem navegador (renderização no servidor) ou sem a informação: segue online.
  assert.equal(isOffline(undefined), false);
  assert.equal(isOffline({}), false);
});
