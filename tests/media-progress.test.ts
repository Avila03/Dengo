import { test } from "node:test";
import assert from "node:assert/strict";
import type { Entry } from "../lib/model.ts";
import { validateDraft } from "../lib/model.ts";
import {
  mediaStatus, mediaCounters, filterSavedMedia, mediaProgressLabel, withMediaStatus,
} from "../lib/media-progress.ts";

const example: Entry = {
  id: "m1", kind: "movie", title: "Filme A", detail: "",
  assignee: "Nós dois", due: "", done: false,
  created_at: "2026-11-04T12:00:00Z",
  data: { mediaType: "movie", interestFirst: true, interestSecond: true },
};
test("legacy watched and unwatched records remain correct", () => {
  assert.equal(mediaStatus(example), "not_started");
  assert.equal(mediaStatus({ ...example, done: true }), "watched");
  assert.equal(mediaStatus({ ...example, done: true,
    data: { mediaType: "movie", watchStatus: "watching" } }), "watching");
});
test("stats and clickable filters distinguish saved, watching and watched", () => {
  const entries: Entry[] = [
    example,
    { ...example, id: "tv", done: false,
      data: { mediaType: "tv", watchStatus: "watching", currentSeason: 3, currentEpisode: 5 } },
    { ...example, id: "watched", done: true },
    { ...example, id: "other", done: false,
      data: { mediaType: "movie", interestFirst: false, interestSecond: false } },
    { ...example, id: "task", kind: "task", done: false },
  ];
  assert.deepEqual(mediaCounters(entries), { pending: 3, watching: 1, watched: 1 });
  assert.deepEqual(filterSavedMedia(entries, "pending").map((entry) => entry.id),
    ["tv", "m1", "other"]);
  assert.deepEqual(filterSavedMedia(entries, "watching").map((entry) => entry.id), ["tv"]);
  assert.deepEqual(filterSavedMedia(entries, "watched").map((entry) => entry.id), ["watched"]);
  assert.deepEqual(filterSavedMedia(entries, "not_started").map((entry) => entry.id),
    ["m1", "other"]);
  assert.deepEqual(filterSavedMedia(entries, "common").map((entry) => entry.id), ["m1"]);
  assert.equal(filterSavedMedia(entries, "all").length, 4);
});
test("changing status keeps ratings and reviews and synchronizes done", () => {
  const rated: Entry = { ...example,
    data: { mediaType: "tv", ratingFirst: 8.5, ratingSecond: 9,
      mediaFeedback: "Adoramos a fotografia." } };
  const watching = withMediaStatus(rated, "watching");
  assert.equal(watching.done, false);
  assert.equal(watching.data?.watchStatus, "watching");
  assert.equal(watching.data?.currentSeason, 1);
  assert.equal(watching.data?.currentEpisode, 1);
  assert.equal(watching.data?.mediaFeedback, "Adoramos a fotografia.");
  const watched = withMediaStatus({ ...rated, data: watching.data }, "watched");
  assert.equal(watched.done, true);
  assert.equal(watched.data?.ratingFirst, 8.5);
  assert.equal(watched.data?.ratingSecond, 9);
  const undone = withMediaStatus({ ...rated, done: true, data: watched.data }, "not_started");
  assert.equal(undone.done, false);
  assert.equal(undone.data?.mediaFeedback, "Adoramos a fotografia.");
});
test("series progress displays current season and episode", () => {
  const current: Entry = { ...example, data: {
    mediaType: "tv", watchStatus: "watching", currentSeason: 2, currentEpisode: 7,
  } };
  assert.equal(mediaProgressLabel(current), "Temporada 2 · Episódio 7");
  assert.equal(mediaProgressLabel(example), "");
  assert.equal(mediaProgressLabel({ ...current, data: { mediaType: "tv" } }), "");
});
test("media validation limits season, episode, status, and feedback", () => {
  const draft = withMediaStatus(example, "watching");
  assert.doesNotThrow(() => validateDraft(draft));
  assert.throws(() => validateDraft({ ...draft,
    data: { ...draft.data, watchStatus: "paused" as "watching" } }), /status/);
  assert.throws(() => validateDraft({ ...draft,
    data: { ...draft.data, mediaType: "tv", currentSeason: 0 } }), /temporada/);
  assert.throws(() => validateDraft({ ...draft,
    data: { ...draft.data, mediaType: "tv", currentEpisode: 1000 } }), /episódio/);
  assert.throws(() => validateDraft({ ...draft,
    data: { ...draft.data, mediaFeedback: "x".repeat(801) } }), /800/);
  assert.throws(() => validateDraft({ ...draft,
    data: { ...draft.data, mediaType: "movie", currentSeason: 3 } }), /exclusivo/);
  assert.doesNotThrow(() => validateDraft({ ...draft,
    data: { ...draft.data, mediaType: "tv", currentSeason: 3, currentEpisode: 5,
      mediaFeedback: "História marcante." } }));
});
