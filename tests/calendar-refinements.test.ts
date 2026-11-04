import { test } from "node:test";
import assert from "node:assert/strict";
import type { Entry } from "../lib/model.ts";
import { validateDraft } from "../lib/model.ts";
import { calendarEntries, calendarDayMap, withOccurrenceOverride, splitFutureSeries } from "../lib/calendar.ts";
import { eventFormValues, eventDataFromForm } from "../lib/event-form.ts";

const weekly: Entry = {
  id: "weekly-event", kind: "event", title: "Jantar", detail: "", assignee: "Nós dois",
  due: "2026-12-30", done: false, created_at: "2026-11-04T12:00:00Z",
  data: { eventRepeat: "weekly", topicId: "janta", time: "20:00" },
};

test("weekly calendar projection crosses the year, stays anchored and validates independently of task repetition", () => {
  assert.doesNotThrow(() => validateDraft(weekly));
  const dates = calendarEntries([weekly], { from: "2026-12-29", to: "2027-01-20" }).map((e) => e.due);
  assert.deepEqual(dates, ["2026-12-30", "2027-01-06", "2027-01-13", "2027-01-20"]);
  assert.equal(calendarEntries([weekly], { from: "2026-01-01", to: "2026-12-29" }).length, 0);
  assert.equal(calendarEntries([weekly], { from: "2031-01-01", to: "2031-01-01" }).length, 1);
  assert.equal(weekly.data?.recurrence, undefined);
});

test("a moved weekly occurrence appears outside its original window and can be canceled", () => {
  const occurrence = calendarEntries([weekly], { from: "2027-01-06", to: "2027-01-06" })[0];
  const moved = withOccurrenceOverride(weekly, occurrence, { due: "2027-07-01", title: "Jantar remarcado" });
  assert.equal(calendarEntries([moved], { from: "2027-01-06", to: "2027-01-06" }).length, 0);
  const july = calendarEntries([moved], { from: "2027-07-01", to: "2027-07-01" });
  assert.equal(july[0].title, "Jantar remarcado");
  const canceled = withOccurrenceOverride(moved, july[0], { canceled: true });
  assert.equal(calendarEntries([canceled], { from: "2027-07-01", to: "2027-07-01" }).length, 0);
});

test("completing and reopening a recurring date preserves its edits without completing the series", () => {
  const occurrence = calendarEntries([weekly], { from: "2027-01-06", to: "2027-01-06" })[0];
  const edited = withOccurrenceOverride(weekly, occurrence, { title: "Novo título", detail: "Levar flores" });
  const completed = withOccurrenceOverride(edited, occurrence, { done: true });
  const projected = calendarEntries([completed], { from: "2027-01-06", to: "2027-01-13" });
  assert.equal(projected[0].done, true);
  assert.equal(projected[0].title, "Novo título");
  assert.equal(projected[0].detail, "Levar flores");
  assert.equal(projected[1].done, false);
  const reopened = withOccurrenceOverride(completed, projected[0], { done: false });
  assert.equal(calendarEntries([reopened], { from: "2027-01-06", to: "2027-01-06" })[0].done, false);
});

test("weekly events retain multi-day duration, which can be removed for just one date", () => {
  const trip = { ...weekly, data: { ...weekly.data, endDate: "2027-01-01" } };
  const map = calendarDayMap([trip], { from: "2027-01-06", to: "2027-01-08" });
  assert.equal(map.size, 3);
  const short = withOccurrenceOverride(trip, map.get("2027-01-06")![0], { endDate: "" });
  const revised = calendarDayMap([short], { from: "2027-01-06", to: "2027-01-08" });
  assert.equal(revised.size, 1);
});

test("this and following weekly split keeps past dates and avoids duplicate boundary dates", () => {
  const occurrence = calendarEntries([weekly], { from: "2027-01-13", to: "2027-01-13" })[0];
  const split = splitFutureSeries(weekly, occurrence, { ...occurrence, title: "Novo combinado" });
  const future: Entry = { ...split.future, id: "next-segment", created_at: weekly.created_at };
  const dates = calendarEntries([split.original, future], { from: "2027-01-01", to: "2027-01-27" });
  assert.deepEqual(dates.map((e) => e.due), ["2027-01-06", "2027-01-13", "2027-01-20", "2027-01-27"]);
  assert.equal(dates[0].title, "Jantar");
  assert.equal(dates[1].title, "Novo combinado");
});

test("place selection stores saved name and address while retaining an existing movie source", () => {
  const movieEvent = { ...weekly, data: { ...weekly.data, sourceId: "film", sourceKind: "movie" as const } };
  const place: Entry = { ...weekly, id: "restaurant", kind: "place", title: "Espartano", data: { address: "Porto Alegre" } };
  const values = { ...eventFormValues(movieEvent), placeId: place.id, detail: "Reserva" };
  const data = eventDataFromForm(values, [place], movieEvent.data);
  assert.equal(data.location, "Espartano · Porto Alegre");
  assert.equal(data.placeId, place.id);
  assert.equal(data.sourceId, "film");
  assert.equal(data.sourceKind, "movie");
  assert.equal(data.endTime, "");
  assert.doesNotThrow(() => validateDraft({ ...movieEvent, data }));
});

test("editing keeps historical locations until explicitly cleared, and replaces legacy place links", () => {
  const historical = { ...weekly, data: { ...weekly.data, location: "Antigo endereço" } };
  assert.equal(eventDataFromForm(eventFormValues(historical), [], historical.data).location, "Antigo endereço");
  const oldPlace = { ...historical, data: { ...historical.data, sourceId: "old", sourceKind: "place" as const } };
  assert.equal(eventFormValues(oldPlace).placeId, "old");
  const cleared = eventDataFromForm({ ...eventFormValues(oldPlace), placeId: "", location: "" }, [], oldPlace.data);
  assert.equal(cleared.sourceId, "");
  assert.equal(cleared.location, "");
});
