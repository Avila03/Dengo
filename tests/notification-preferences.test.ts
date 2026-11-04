import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NOTIFICATION_TYPES, notificationStorageKey,
  parseNotificationPreferences, validateNotificationPreferences,
} from "../lib/notification-preferences.ts";

test("notification defaults include the eight selected types and only the account's payments", () => {
  const value = parseNotificationPreferences(null);
  assert.equal(NOTIFICATION_TYPES.length, 8);
  assert.deepEqual(Object.keys(value.enabled), [...NOTIFICATION_TYPES]);
  assert.equal("responsibilityDue" in value.enabled, false);
  assert.equal(Object.values(value.enabled).every(Boolean), true);
  assert.equal(value.paymentAudience, "mine");
  assert.equal(value.eventMinutesBefore, 30);
  assert.equal(value.dailyTime, "09:00");
  assert.doesNotThrow(() => validateNotificationPreferences(value));
});
test("saved disabled types and schedule choices survive a storage round trip", () => {
  const value = parseNotificationPreferences({
    enabled: { eventChanges: false, dailyDigest: false, overdue: false },
    eventMinutesBefore: 1440, paymentDaysBefore: 7, paymentOnDueDay: false,
    paymentAudience: "couple", dailyTime: "07:15",
    quietHours: { enabled: false, start: "23:00", end: "06:30" }, hidePreview: false,
  });
  assert.deepEqual(parseNotificationPreferences(JSON.parse(JSON.stringify(value))), value);
  assert.equal(value.enabled.eventChanges, false);
  assert.equal(value.paymentOnDueDay, false);
  assert.equal(value.hidePreview, false);
  assert.equal(value.paymentAudience, "couple");
});
test("invalid stored fields fall back independently without accepting unknown notification types", () => {
  const value = parseNotificationPreferences({
    enabled: { eventChanges: false, paymentDue: "false", responsibilityDue: true, unknown: true },
    eventMinutesBefore: -10, paymentDaysBefore: 99, dailyTime: "25:00",
    quietHours: { start: "22:90", end: null }, timeZone: "invalid", paymentAudience: "anyone",
  });
  assert.equal(value.enabled.eventChanges, false);
  assert.equal(value.enabled.paymentDue, true);
  assert.equal("unknown" in value.enabled, false);
  assert.equal("responsibilityDue" in value.enabled, false);
  assert.equal(value.eventMinutesBefore, 30);
  assert.equal(value.paymentDaysBefore, 1);
  assert.equal(value.dailyTime, "09:00");
  assert.equal(value.quietHours.start, "22:00");
  assert.equal(value.timeZone, "America/Sao_Paulo");
  assert.equal(value.paymentAudience, "mine");
});
test("personal caches are isolated by account and defaults are not mutated by an editor", () => {
  assert.notEqual(notificationStorageKey("first"), notificationStorageKey("second"));
  assert.notEqual(notificationStorageKey("first"), notificationStorageKey("demo"));
  const first = parseNotificationPreferences(null);
  first.enabled.upcomingEvent = false;
  first.quietHours.start = "23:30";
  const second = parseNotificationPreferences(null);
  assert.equal(second.enabled.upcomingEvent, true);
  assert.equal(second.quietHours.start, "22:00");
});
test("quiet hours support overnight windows but reject an ambiguous equal start and end", () => {
  const value = parseNotificationPreferences(null);
  assert.doesNotThrow(() => validateNotificationPreferences(value));
  value.quietHours.end = value.quietHours.start;
  assert.throws(() => validateNotificationPreferences(value), /horários diferentes/);
  value.quietHours.enabled = false;
  assert.doesNotThrow(() => validateNotificationPreferences(value));
  value.dailyTime = "";
  assert.throws(() => validateNotificationPreferences(value), /resumo do dia/);
});
