import type { Draft, Entry } from "./model.ts";

export type WatchStatus = "not_started" | "watching" | "watched";
export type MediaFilter = "pending" | "not_started" | "watching" | "watched" | "common" | "all";

export const WATCH_STATUS_LABELS: Record<WatchStatus, string> = {
  not_started: "Não assistiu",
  watching: "Assistindo",
  watched: "Assistido",
};

/** Legacy records only stored a boolean "done"; this preserves their meaning. */
export function mediaStatus(entry: Entry): WatchStatus {
  const stored = entry.data?.watchStatus;
  if (stored && Object.hasOwn(WATCH_STATUS_LABELS, stored)) return stored;
  return entry.done ? "watched" : "not_started";
}

export function mediaCounters(entries: Entry[]) {
  const saved = entries.filter((entry) => entry.kind === "movie");
  return {
    pending: saved.filter((entry) => mediaStatus(entry) !== "watched").length,
    watching: saved.filter((entry) => mediaStatus(entry) === "watching").length,
    watched: saved.filter((entry) => mediaStatus(entry) === "watched").length,
  };
}

export function filterSavedMedia(entries: Entry[], filter: MediaFilter): Entry[] {
  const saved = entries.filter((entry) => entry.kind === "movie");
  const result = saved.filter((entry) => {
    const status = mediaStatus(entry);
    if (filter === "pending") return status !== "watched";
    if (filter === "common")
      return status !== "watched" && !!entry.data?.interestFirst && !!entry.data?.interestSecond;
    if (filter === "all") return true;
    return status === filter;
  });
  // Show in-progress titles first, and then keep saved order.
  return [...result].sort((a, b) =>
    Number(mediaStatus(b) === "watching") - Number(mediaStatus(a) === "watching"));
}

export function mediaProgressLabel(entry: Entry): string {
  if (entry.kind !== "movie" || entry.data?.mediaType !== "tv") return "";
  const season = entry.data?.currentSeason;
  const episode = entry.data?.currentEpisode;
  if (!season || !episode) return "";
  return "Temporada " + season + " · Episódio " + episode;
}

/** One status for the shared couple record; keep existing review and ratings. */
export function withMediaStatus(entry: Entry, status: WatchStatus): Draft {
  return {
    kind: "movie",
    title: entry.title,
    detail: entry.detail,
    assignee: entry.assignee,
    due: entry.due,
    done: status === "watched",
    data: {
      ...entry.data,
      watchStatus: status,
      ...(status === "watching" && entry.data?.mediaType === "tv" ? {
        currentSeason: entry.data?.currentSeason || 1,
        currentEpisode: entry.data?.currentEpisode || 1,
      } : {}),
    },
  };
}
