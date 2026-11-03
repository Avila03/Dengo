export type PlaceSearchResult = {
  id: string;
  title: string;
  address: string;
  category: string;
};

export function validGooglePlaceId(value: string): boolean {
  return /^[A-Za-z0-9_-]{5,255}$/.test(value);
}

export function normalizeGooglePlaces(value: unknown): PlaceSearchResult[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: PlaceSearchResult[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const place = raw as Record<string, unknown>;
    const id = typeof place.id === "string" ? place.id : "";
    const display = place.displayName;
    const name = display && typeof display === "object"
      ? (display as Record<string, unknown>).text : "";
    const title = typeof name === "string" ? name.trim() : "";
    if (!validGooglePlaceId(id) || !title || seen.has(id)) continue;
    const rawCategory = place.primaryTypeDisplayName;
    const type = rawCategory && typeof rawCategory === "object"
      ? (rawCategory as Record<string, unknown>).text : "";
    result.push({
      id,
      title: title.slice(0, 120),
      address: typeof place.formattedAddress === "string"
        ? place.formattedAddress.trim().slice(0, 240) : "",
      category: typeof type === "string" ? type.trim().slice(0, 80) : "",
    });
    seen.add(id);
    if (result.length === 8) break;
  }
  return result;
}

export function googlePlaceMapsUrl(id: string | undefined, name: string) {
  const params = new URLSearchParams({ api: "1", query: name || "Brasil" });
  if (id && validGooglePlaceId(id)) params.set("query_place_id", id);
  return "https://www.google.com/maps/search/?" + params.toString();
}

export function googleMapsEmbedUrl(id: string | undefined, key: string) {
  if (!id || !validGooglePlaceId(id) || !key.trim()) return "";
  return "https://www.google.com/maps/embed/v1/place?" +
    new URLSearchParams({
      key: key.trim(),
      q: "place_id:" + id,
      language: "pt-BR",
      region: "BR",
    }).toString();
}
