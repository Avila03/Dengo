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
  eventDateInMonth,
} from "../lib/calendar.ts";
import { normalizeMovies } from "../lib/movies.ts";
import { todayEntries, weekDates, calendarMonthDays, shiftMonth, addDaysISO } from "../lib/today.ts";
import { calendarDayMap, eventRangeLabel, eventDaysUntil, recurringInstanceKey,
  withOccurrenceOverride, splitFutureSeries, recurrenceSeries } from "../lib/calendar.ts";
import { calendarDayDifference, eventFinish } from "../lib/calendar-schedule.ts";
import { DEFAULT_CALENDAR_TOPICS, calendarTopics, calendarEntryColor, eventTopicLabel, validateCalendarTopics } from "../lib/calendar-topics.ts";
import { filterResponsible, sortTaskEntries, taskSection } from "../lib/task-filters.ts";
import { elapsedCalendarMonths, formatYearsAndMonths, eventDurationLabel } from "../lib/calendar-anniversaries.ts";
import { normalizeGooglePlaces, googlePlaceMapsUrl, googleMapsEmbedUrl, normalizePhotonPlaces, openStreetMapEmbedUrl, photonCategoryFilter, overpassSearchQuery, normalizeOverpassPlaces, normalizePlaceLink, safePlaceLink } from "../lib/places.ts";
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
  assert.equal(movie.rating, null);
});
test("catalog normalizes scores, posters and ignores adult titles", () => {
  const results = normalizeMovies([
    { id: 1, title: "Um Filme", vote_average: 8.36, poster_path: "/movie.jpg", release_date: "2026-04-10" },
    { id: 2, title: "Oculto", adult: true },
    { id: 3, title: "", poster_path: "/movie.jpg" },
    { id: 4, title: "Outro", vote_average: 19, poster_path: "//evil.invalid" },
  ], "movie");
  assert.equal(results.length, 2);
  assert.equal(results[0].rating, 8.4);
  assert.equal(results[0].poster, "https://image.tmdb.org/t/p/w342/movie.jpg");
  assert.equal(results[1].rating, null);
  assert.equal(results[1].poster, "");
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

test("normalizes Google Place IDs and ignores duplicates and invalid values", () => {
  const results = normalizeGooglePlaces([
    { id: "ChIJ12345678", displayName: { text: "Espartano" }, formattedAddress: "Porto Alegre, RS" },
    { id: "ChIJ12345678", displayName: { text: "Duplicado" } },
    { id: "not valid", displayName: { text: "Invalido" } },
  ]);
  assert.equal(results.length, 1);
  assert.equal(results[0].title, "Espartano");
});
test("Google map URLs point to the selected Place ID", () => {
  const url = new URL(googlePlaceMapsUrl("ChIJ12345678", "Espartano"));
  assert.equal(url.searchParams.get("query_place_id"), "ChIJ12345678");
  const embed = new URL(googleMapsEmbedUrl("ChIJ12345678", "referrer_restricted_key"));
  assert.equal(embed.searchParams.get("q"), "place_id:ChIJ12345678");
  assert.equal(googleMapsEmbedUrl("https://invalid", "key"), "");
});

test("Photon search returns stable OSM IDs and map coordinates", () => {
  const results = normalizePhotonPlaces({
    features: [
      { properties: { osm_type: "N", osm_id: 12345, name: "Espartano", city: "Porto Alegre", country: "Brasil", osm_value: "restaurant" }, geometry: { coordinates: [-51.2, -30.0] } },
      { properties: { osm_type: "N", osm_id: 12345, name: "Duplicado" }, geometry: { coordinates: [-51.2, -30.0] } },
      { properties: { osm_type: "N", osm_id: 123456, name: "Inválido" }, geometry: { coordinates: [999, -30.0] } },
    ],
  });
  assert.equal(results.length, 1);
  assert.equal(results[0].id, "osm_n_12345");
  assert.equal(results[0].lat, -30);
  assert.equal(results[0].lon, -51.2);
  assert.equal(results[0].title, "Espartano");
  const url = new URL(openStreetMapEmbedUrl(results[0].lat, results[0].lon));
  assert.equal(url.searchParams.get("marker"), "-30,-51.2");
  assert.equal(openStreetMapEmbedUrl(999, 0), "");
});

test("restaurant, bar and café search categories select OSM POIs", () => {
  assert.match(photonCategoryFilter("restaurant"), /osm\.amenity\.restaurant/);
  assert.match(photonCategoryFilter("bar"), /osm\.amenity\.pub/);
  assert.match(photonCategoryFilter("cafe"), /osm\.amenity\.cafe/);
  const query = overpassSearchQuery("Espartano", "Porto Alegre, RS", "restaurant");
  assert.match(query, /area\["name"="Porto Alegre"\]/);
  assert.match(query, /amenity/);
});
test("Overpass results normalize nodes and way centers", () => {
  const places = normalizeOverpassPlaces({ elements: [
    { type: "node", id: 1234, lat: -30.01, lon: -51.21, tags: { name: "Espartano", amenity: "restaurant", "addr:city": "Porto Alegre" } },
    { type: "way", id: 5678, center: { lat: -30.03, lon: -51.2 }, tags: { name: "Café", amenity: "cafe" } },
  ] });
  assert.equal(places.length, 2);
  assert.equal(places[0].id, "osm_n_1234");
  assert.equal(places[1].title, "Café");
});

test("a saved place accepts TikTok and Google Maps HTTPS links", () => {
  const tikTok = "https://www.tiktok.com/@perfil/video/123456";
  const google = "https://maps.app.goo.gl/abcdef";
  assert.equal(normalizePlaceLink(tikTok), tikTok);
  assert.equal(normalizePlaceLink(google), google);
  assert.equal(normalizePlaceLink(""), "");
  assert.equal(safePlaceLink("javascript:alert(1)"), "");
  assert.throws(() => normalizePlaceLink("http://example.com"), /https/);
  assert.throws(() => normalizePlaceLink("https://username:password@example.com"));
});

test("Nosso dia shows only events, tasks and expenses scheduled for today", () => {
  const today = "2026-11-03";
  const sample: Entry[] = [
    { ...task, id: "old", kind: "task" as const, due: "2026-11-02" },
    { ...task, id: "shopping", kind: "shopping" as const, due: today },
    { ...task, id: "event", kind: "event" as const, due: today, data: { time: "19:00" } },
    { ...task, id: "task", kind: "task" as const, due: today },
    { ...task, id: "expense", kind: "expense" as const, due: today, done: true, data: { amount: 1000, payer: 0, shareFirst: 5000, time: "09:00" } },
  ];
  assert.deepEqual(todayEntries(sample, today).map((item) => item.id),
    ["task", "expense", "event"]);
});

test("calendar preview respects Monday-first weeks across months and years", () => {
  assert.deepEqual(weekDates("2026-11-03"), [
    "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05",
    "2026-11-06", "2026-11-07", "2026-11-08",
  ]);
  assert.equal(addDaysISO("2026-12-29", 7), "2027-01-05");
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  const days = calendarMonthDays("2026-11");
  assert.equal(days[0], null); // November 1, 2026 is a Sunday.
  assert.equal(days[6], "2026-11-01");
  assert.equal(days[days.length - 1], "2026-11-30");
});

test("calendar topics support renamed labels, distinct colors and validation", () => {
  const topics = [
    { id: "janta", name: "Jantar", color: "#1200dd" },
    { id: "filmes", name: "Sessão", color: "#a04bea" },
  ];
  validateCalendarTopics(topics);
  assert.deepEqual(calendarTopics(topics), topics);
  assert.equal(calendarTopics(null)[0].name, "Janta");
  assert.throws(() => validateCalendarTopics([topics[0], { ...topics[1], name: "Jantar" }]));
  assert.throws(() => validateCalendarTopics([{ ...topics[0], color: "invalid" }]));
  assert.equal(calendarTopics([{ id: "oops", name: "Unsafe", color: "url(x)" }])[0].id, "janta");
});
test("each of three same-day events contributes a colored indicator", () => {
  const entries: Entry[] = [
    { ...task, id: "1", kind: "event", data: { topicId: "janta" } },
    { ...task, id: "2", kind: "event", data: { topicId: "filmes" } },
    { ...task, id: "3", kind: "event", data: { topicId: "passeio" } },
  ];
  assert.deepEqual(calendarEntries(entries).map(e => calendarEntryColor(e, DEFAULT_CALENDAR_TOPICS)),
    DEFAULT_CALENDAR_TOPICS.slice(0,3).map(t => t.color));
  assert.equal(eventTopicLabel(entries[0], DEFAULT_CALENDAR_TOPICS), "Janta");
});
test("commitment filtering uses current couple member and prioritizes late items", () => {
  const items: Entry[] = [
    { ...task, id: "future", assignee: "Bruno", due: "2026-11-07" },
    { ...task, id: "partner", assignee: "Par", due: "2026-11-03" },
    { ...task, id: "late", assignee: "Bruno", due: "2026-11-01" },
    { ...task, id: "joint", assignee: "Nós dois", due: "" },
  ];
  assert.deepEqual(sortTaskEntries(items, "2026-11-03").map(x => x.id), ["late","partner","future","joint"]);
  assert.equal(taskSection(items[2], "2026-11-03"), "overdue");
  assert.deepEqual(items.filter(x => filterResponsible(x,"mine",["Bruno","Par"],0)).map(x => x.id), ["future","late"]);
  assert.deepEqual(items.filter(x => filterResponsible(x,"mine",["Bruno","Par"],1)).map(x => x.id), ["partner"]);
  assert.deepEqual(items.filter(x => filterResponsible(x,"together",["Bruno","Par"],1)).map(x => x.id), ["joint"]);
});

test("more than three same-day entries preserve every color", () => {
  const topics = DEFAULT_CALENDAR_TOPICS;
  const items: Entry[] = Array.from({ length: 12 }, (_, i) => ({
    ...task,
    id: "many-" + i,
    kind: "event" as const,
    data: { topicId: topics[i % topics.length].id },
  }));
  const sameDay = calendarEntries(items).filter((item) => item.due === task.due);
  assert.equal(sameDay.length, 12);
  assert.deepEqual(sameDay.map((item) => calendarEntryColor(item, topics)),
    items.map((item) => calendarEntryColor(item, topics)));
});
test("calendar accepts more than sixteen custom colored topics", () => {
  const custom = Array.from({length: 30},(_, i) => ({
    id: "tema_" + i,
    name: "Tema " + i,
    color: "#" + i.toString(16).padStart(6, "0"),
  }));
  validateCalendarTopics(custom);
  assert.equal(calendarTopics(custom).length, 30);
});

test("monthly date anniversary repeats without duplicating database records", () => {
  const anniversary: Entry = {
    ...task, kind: "event", id: "anniversary", due: "2026-01-31",
    title: "Mêsversário de namoro", data: { eventRepeat: "monthly", topicId: "janta" },
  };
  const projected = calendarEntries([anniversary], { from: "2026-01-01", to: "2026-04-30" });
  assert.deepEqual(projected.map((e) => e.due), [
    "2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30",
  ]);
  assert.equal(projected[0].id, "anniversary");
  assert.equal(projected[1].id, "anniversary::2026-02-28");
  assert.equal(projected[1].data?.eventSourceId, "anniversary");
  assert.equal(projected[2].data?.topicId, "janta");
  assert.equal(calendarEntries([anniversary]).length, 1);
  assert.equal(todayEntries([anniversary], "2026-03-31").length, 1);
  assert.equal(todayEntries([anniversary], "2026-03-30").length, 0);
});
test("annual birthdays recur in every year with February 29 fallback", () => {
  const birth: Entry = {
    ...task, kind: "event", id: "birth", due: "2024-02-29",
    title: "Aniversário", data: { eventRepeat: "yearly" },
  };
  const projected = calendarEntries([birth], { from: "2024-01-01", to: "2028-12-31" });
  assert.deepEqual(projected.map((e) => e.due),
    ["2024-02-29", "2025-02-28", "2026-02-28", "2027-02-28", "2028-02-29"]);
  assert.equal(eventDateInMonth("2024-02-29", 2028, 2), "2028-02-29");
  assert.equal(eventDateInMonth("2024-02-29", 2027, 2), "2027-02-28");
});
test("recurring special dates never appear before their start date", () => {
  const special: Entry = {
    ...task, kind: "event", due: "2026-11-20",
    data: { eventRepeat: "monthly" },
  };
  assert.equal(calendarEntries([special], { from: "2026-11-01", to: "2026-11-19" }).length, 0);
  assert.deepEqual(
    calendarEntries([special], { from: "2026-12-01", to: "2027-02-28" }).map((e) => e.due),
    ["2026-12-20", "2027-01-20", "2027-02-20"],
  );
  assert.equal(calendarEntries([special], { from: "2027-02-28", to: "2027-02-01" }).length, 0);
});
test("event repetition validates and stays separate from task repetition", () => {
  const event: Entry = {
    ...task, kind: "event", data: { eventRepeat: "yearly" },
  };
  assert.doesNotThrow(() => validateDraft(event));
  assert.throws(() => validateDraft({ ...event, due: "" }), /data inicial/);
  assert.throws(() => validateDraft({
    ...event, data: { eventRepeat: "never" as "yearly" },
  }), /repetição válida/);
  assert.equal(nextDate(task.due, "weekly"), "2026-11-10");
});

test("monthly monthiversary shows years and months from the original date", () => {
  const start: Entry = {
    ...task, id: "our-date", kind: "event", due: "2024-08-15",
    title: "Mêsversário de namoro",
    data: { eventRepeat: "monthly", eventCounter: "together", topicId: "janta" },
  };
  const projected = calendarEntries([start], { from: "2026-11-01", to: "2026-11-30" });
  assert.equal(projected.length, 1);
  assert.equal(projected[0].due, "2026-11-15");
  assert.equal(projected[0].data?.eventAnchorDate, "2024-08-15");
  assert.equal(eventDurationLabel(projected[0]), "2 anos e 3 meses juntos");
  assert.equal(eventDurationLabel(start), "Começo da nossa história");
  assert.equal(formatYearsAndMonths(27), "2 anos e 3 meses");
  assert.equal(elapsedCalendarMonths("2024-08-15", "2026-11-15"), 27);
  const elapsed = { ...projected[0], data: { ...projected[0].data, eventCounter: "elapsed" as const } };
  assert.equal(eventDurationLabel(elapsed), "Há 2 anos e 3 meses");
  assert.equal(eventDurationLabel({ ...projected[0], data: { ...projected[0].data, eventCounter: "off" } }), "");
});
test("birthday age uses real birth year and leap-day occurrence", () => {
  const birthday: Entry = {
    ...task, id: "birthday", kind: "event", due: "2000-02-29",
    title: "Aniversário", data: { eventRepeat: "yearly", eventCounter: "age" },
  };
  const [occurrence] = calendarEntries([birthday], { from: "2026-02-01", to: "2026-02-28" });
  assert.equal(occurrence.due, "2026-02-28");
  assert.equal(eventDurationLabel(occurrence), "26 anos de idade");
  const [leap] = calendarEntries([birthday], { from: "2028-02-01", to: "2028-02-29" });
  assert.equal(leap.due, "2028-02-29");
  assert.equal(eventDurationLabel(leap), "28 anos de idade");
  assert.equal(eventDurationLabel({ ...task, kind: "task", data: { eventRepeat: "monthly", eventCounter: "age" } }), "");
});
test("monthly counter honors a short February without resetting the age", () => {
  const start: Entry = {
    ...task, id: "months", kind: "event", due: "2024-01-31",
    data: { eventRepeat: "monthly", eventCounter: "elapsed" },
  };
  const february = calendarEntries([start], { from: "2026-02-01", to: "2026-02-28" })[0];
  assert.equal(february.due, "2026-02-28");
  assert.equal(eventDurationLabel(february), "Há 2 anos e 1 mês");
  const march = calendarEntries([start], { from: "2026-03-01", to: "2026-03-31" })[0];
  assert.equal(eventDurationLabel(march), "Há 2 anos e 2 meses");
});
test("calendar event counter accepts expected values and rejects invalid values", () => {
  const sample: Entry = {
    ...task, kind: "event", data: { eventRepeat: "monthly", eventCounter: "age" },
  };
  assert.doesNotThrow(() => validateDraft(sample));
  assert.throws(() => validateDraft({
    ...sample, data: { eventRepeat: "monthly", eventCounter: "bad" as "age" },
  }), /contagem válida/);
});

test("multi-day events appear on each date, including a month boundary", () => {
  const trip: Entry = { ...task, id: "trip", kind: "event", due: "2026-11-29",
    data: { endDate: "2026-12-02", time: "", endTime: "", topicId: "viagem" } };
  const byDay = calendarDayMap([trip], {from:"2026-11-28",to:"2026-12-03"});
  assert.deepEqual([...byDay.keys()], [
    "2026-11-29","2026-11-30","2026-12-01","2026-12-02",
  ]);
  assert.equal(byDay.get("2026-12-01")?.length, 1);
  assert.equal(todayEntries([trip], "2026-12-01").length, 1);
  assert.equal(eventFinish(trip), "2026-12-02");
  assert.match(eventICS(trip), /DTEND;VALUE=DATE:20261203/);
  assert.equal(new URL(googleCalendarUrl(trip)).searchParams.get("dates"),
    "20261129/20261203");
});
test("timed events can end on the next day in ICS and Google Calendar", () => {
  const dinner: Entry = { ...task, id: "dinner", kind: "event", due: "2026-11-03",
    data: {time:"20:00",endTime:"01:00",endDate:"2026-11-04"} };
  assert.match(eventICS(dinner), /DTSTART:20261103T230000Z/);
  assert.match(eventICS(dinner), /DTEND:20261104T040000Z/);
  assert.equal(new URL(googleCalendarUrl(dinner)).searchParams.get("dates"),
    "20261103T200000/20261104T010000");
  assert.equal(calendarDayMap([dinner], {from:"2026-11-03",to:"2026-11-04"}).size,2);
  assert.match(eventRangeLabel(dinner), /20:00 até 01:00/);
});
test("event ranges reject reversed dates, invalid hours and long spans", () => {
  const sample: Entry = { ...task, kind:"event", data:{endDate:"2026-11-02"} };
  assert.throws(()=>validateDraft(sample), /término/);
  assert.throws(()=>validateDraft({...sample,data:{time:"24:80"}}), /inválido/);
  assert.throws(()=>validateDraft({...sample,data:{endTime:"21:00"}}), /inicial/);
  assert.throws(()=>validateDraft({...sample,data:{time:"21:00",endTime:"20:30"}}), /posterior/);
  assert.throws(()=>validateDraft({...sample,data:{endDate:"2027-02-10"}}), /61 dias/);
  assert.doesNotThrow(()=>validateDraft({
    ...sample, data:{time:"21:00",endTime:"01:00",endDate:"2026-11-04"},
  }));
});
test("one occurrence can be rescheduled, canceled or edited without affecting others", () => {
  const anniversary: Entry = { ...task, id:"series", kind:"event", due:"2026-01-15",
    data:{eventRepeat:"monthly",topicId:"janta"} };
  const feb = calendarEntries([anniversary],{from:"2026-02-01",to:"2026-02-28"})[0];
  const shifted = withOccurrenceOverride(anniversary,feb,{
    title:"Jantar remarcado",due:"2026-02-16",topicId:"passeio",endDate:"2026-02-17",
  });
  const febView = calendarEntries([shifted],{from:"2026-02-01",to:"2026-02-28"});
  assert.equal(febView.length,1);
  assert.equal(febView[0].title,"Jantar remarcado");
  assert.equal(febView[0].due,"2026-02-16");
  assert.equal(eventFinish(febView[0]),"2026-02-17");
  assert.equal(febView[0].data?.eventOccurrenceDate,"2026-02-15");
  assert.equal(calendarEntries([shifted],{from:"2026-03-01",to:"2026-03-31"})[0].due,"2026-03-15");
  const canceled = withOccurrenceOverride(shifted,
    calendarEntries([shifted],{from:"2026-03-01",to:"2026-03-31"})[0], {canceled:true});
  assert.equal(calendarEntries([canceled],{from:"2026-03-01",to:"2026-03-31"}).length,0);
  assert.equal(calendarEntries([canceled],{from:"2026-04-01",to:"2026-04-30"}).length,1);
  assert.equal(recurrenceSeries([shifted],febView[0]).id,"series");
});
test("editing this and following splits future from past dates", () => {
  const series: Entry = {...task,id:"original",kind:"event",due:"2026-01-10",
    data:{eventRepeat:"monthly",eventCounter:"together",topicId:"janta"}};
  const april = calendarEntries([series],{from:"2026-04-01",to:"2026-04-30"})[0];
  const planned = splitFutureSeries(series,april,{
    title:"Novo mêsversário",detail:"",assignee:"Nós dois",due:"2026-04-20",
    data:{time:"20:00",topicId:"passeio"},
  });
  const newSeries:Entry = {...planned.future,id:"future",created_at:task.created_at};
  const all = calendarEntries([planned.original,newSeries],{from:"2026-01-01",to:"2026-06-30"});
  assert.deepEqual(all.map(e=>e.due), [
    "2026-01-10","2026-02-10","2026-03-10",
    "2026-04-20","2026-05-20","2026-06-20",
  ]);
  assert.equal(planned.original.data?.eventRepeatUntil,"2026-04-10");
  assert.equal(newSeries.data?.eventAnchorDate,"2026-01-10");
});
test("event preparations link to exactly one occurrence and countdown is date-safe", () => {
  const source:Entry = {...task,id:"event1",kind:"event",due:"2026-01-15",
    data:{eventRepeat:"yearly"}};
  const next = calendarEntries([source],{from:"2027-01-01",to:"2027-01-31"})[0];
  const prep:Entry = {...task,id:"prep1",kind:"shopping",data:{
    eventInstanceKey:recurringInstanceKey(next),
  }};
  assert.equal(prep.data?.eventInstanceKey,"event1::2027-01-15");
  assert.equal(recurringInstanceKey(source),"event1::2026-01-15");
  assert.equal(eventDaysUntil("2026-11-03","2026-11-13"),10);
  assert.equal(eventDaysUntil("2026-12-31","2027-01-01"),1);
  assert.equal(calendarDayDifference("2026-11-03","2026-11-13"),10);
});
