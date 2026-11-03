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
import { todayEntries, weekDates, calendarMonthDays, shiftMonth, addDaysISO } from "../lib/today.ts";
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
