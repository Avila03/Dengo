import { test } from "node:test";
import assert from "node:assert/strict";
import {
  successor,
  nextDate,
  validateDraft,
  isDate,
  type Entry,
} from "../lib/model.ts";
import {
  eventICS,
  googleCalendarUrl,
  mapsUrl,
  calendarEntries,
} from "../lib/calendar.ts";
import { normalizeMovies } from "../lib/movies.ts";
const task: Entry = {
  id: "abc",
  kind: "task",
  title: "Plantas, casa",
  detail: "Linha 1\nLinha 2",
  assignee: "A",
  due: "2026-11-03",
  done: false,
  created_at: "2026-11-03T12:00:00Z",
  data: { recurrence: "weekly", alternate: true },
};
test("recurrences preserve dates and alternate owners", () => {
  const next = successor(task, ["A", "B"]);
  assert.equal(next?.due, "2026-11-10");
  assert.equal(next?.assignee, "B");
  assert.equal(next?.done, false);
  assert.equal(nextDate("2026-12-31", "daily"), "2027-01-01");
  assert.equal(nextDate("2026-01-31", "monthly"), "2026-02-28");
  assert.equal(nextDate("2028-01-31", "monthly"), "2028-02-29");
  assert.equal(isDate("2026-02-30"), false);
});
test("recurring tasks require a start date", () =>
  assert.throws(() => validateDraft({ ...task, due: "" })));
test("calendar only includes dated tasks, bills and events", () =>
  assert.equal(
    calendarEntries([
      task,
      { ...task, kind: "movie" },
      { ...task, kind: "expense" },
    ]).length,
    2,
  ));
test("calendar links produce one day all-day events and next-day end times", () => {
  const url = new URL(googleCalendarUrl(task));
  assert.equal(url.searchParams.get("dates"), "20261103/20261104");
  const late = new URL(googleCalendarUrl({ ...task, data: { time: "23:30" } }));
  assert.equal(
    late.searchParams.get("dates"),
    "20261103T233000/20261104T003000",
  );
  assert.match(eventICS(task), /SUMMARY:Plantas\\, casa/);
  assert.match(eventICS(task), /Linha 1\\nLinha 2/);
});
test("maps links encode place text safely", () =>
  assert.equal(
    new URL(mapsUrl("Café & Amor, RS")).searchParams.get("query"),
    "Café & Amor, RS",
  ));
test("external catalog response is normalized and unsafe image paths ignored", () => {
  const [movie] = normalizeMovies(
    [
      {
        id: 42,
        title: "Filme",
        poster_path: "https://evil.invalid/image",
        release_date: "2026-01-01",
      },
    ],
    "movie",
  );
  assert.equal(movie.poster, "");
  assert.equal(movie.year, "2026");
  assert.equal(movie.mediaType, "movie");
});

test("monthly recurrences retain the original day after a short month", () => {
  const january = {
    ...task,
    due: "2026-01-31",
    data: { recurrence: "monthly" as const },
  };
  const feb = successor(january, ["A", "B"])!;
  assert.equal(feb.due, "2026-02-28");
  const march = successor({ ...feb, id: "feb", created_at: task.created_at }, [
    "A",
    "B",
  ]);
  assert.equal(march?.due, "2026-03-31");
});

test("calendar files use explicit end times and fold UTF-8 text safely", () => {
  const file = eventICS({
    ...task,
    data: { time: "23:30" },
    detail: "á".repeat(120),
  });
  assert.match(file, /DTSTART:20261104T023000Z/);
  assert.match(file, /DTEND:20261104T033000Z/);
  for (const line of file.split("\r\n"))
    assert.ok(new TextEncoder().encode(line).length <= 75);
});
