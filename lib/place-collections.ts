import type { Entry } from "./model.ts";

export const DEFAULT_PLACE_COLLECTIONS = ["Encontros", "Cafés", "Viagens", "Ideias"];

export type PlaceStatus = "want" | "visited" | "all";

export function placeCollection(value: unknown): string {
  if (typeof value !== "string") return "Encontros";
  const label = value.trim().replace(/\s+/g, " ");
  return label && label.length <= 40 ? label : "Encontros";
}

export function placeCollections(entries: Entry[]): string[] {
  const custom = entries.filter((entry) => entry.kind === "place")
    .map((entry) => placeCollection(entry.data?.placeCollection));
  return [...new Set([...DEFAULT_PLACE_COLLECTIONS, ...custom])];
}

export function filterPlaces(
  entries: Entry[],
  status: PlaceStatus,
  collection: string,
  favoritesOnly: boolean,
): Entry[] {
  return entries.filter((entry) =>
    entry.kind === "place" &&
    (status === "all" || (status === "visited" ? entry.done : !entry.done)) &&
    (!collection || placeCollection(entry.data?.placeCollection) === collection) &&
    (!favoritesOnly || Boolean(entry.data?.favorite))
  ).sort((a, b) =>
    Number(Boolean(b.data?.favorite)) - Number(Boolean(a.data?.favorite)) ||
    a.title.localeCompare(b.title, "pt-BR")
  );
}
