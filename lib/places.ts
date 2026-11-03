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

export type OpenStreetMapPlace = PlaceSearchResult & {
  source: "openstreetmap";
  lat: number;
  lon: number;
};

export function validCoordinates(lat: unknown, lon: unknown): boolean {
  return typeof lat === "number" && typeof lon === "number" &&
    Number.isFinite(lat) && Number.isFinite(lon) &&
    lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

export function normalizePhotonPlaces(payload: unknown): OpenStreetMapPlace[] {
  if (!payload || typeof payload !== "object" || !("features" in payload)) return [];
  const features = (payload as { features?: unknown }).features;
  if (!Array.isArray(features)) return [];
  const seen = new Set<string>();
  const results: OpenStreetMapPlace[] = [];
  for (const raw of features) {
    if (!raw || typeof raw !== "object") continue;
    const feature = raw as Record<string, unknown>;
    const props = feature.properties;
    const geom = feature.geometry;
    if (!props || typeof props !== "object" || !geom || typeof geom !== "object") continue;
    const p = props as Record<string, unknown>;
    const coords = (geom as { coordinates?: unknown }).coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const lon = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!validCoordinates(lat, lon)) continue;
    const name = typeof p.name === "string" ? p.name.trim() : "";
    const osmType = typeof p.osm_type === "string" ? p.osm_type : "";
    const osmId = typeof p.osm_id === "number" || typeof p.osm_id === "string" ? String(p.osm_id) : "";
    if (!name || !/^(N|W|R|node|way|relation)$/i.test(osmType) || !/^\d{1,20}$/.test(osmId)) continue;
    const id = "osm_" + osmType.toLowerCase() + "_" + osmId;
    if (seen.has(id)) continue;
    seen.add(id);
    const street = typeof p.street === "string" ? p.street : "";
    const house = typeof p.housenumber === "string" ? p.housenumber : "";
    const parts = [
      street && house ? street + ", " + house : street,
      p.district, p.city, p.state, p.country,
    ].filter((x): x is string => typeof x === "string" && x.trim().length > 0);
    results.push({
      id,
      title: name.slice(0, 120),
      address: [...new Set(parts)].join(", ").slice(0, 240) || name,
      category: typeof p.osm_value === "string" ? p.osm_value.slice(0, 80) : "",
      source: "openstreetmap",
      lat,
      lon,
    });
    if (results.length >= 8) break;
  }
  return results;
}

export function openStreetMapEmbedUrl(lat: number | undefined, lon: number | undefined): string {
  if (!validCoordinates(lat, lon)) return "";
  const span = 0.006;
  return "https://www.openstreetmap.org/export/embed.html?" +
    new URLSearchParams({
      bbox: [lon! - span, lat! - span, lon! + span, lat! + span].join(","),
      layer: "mapnik",
      marker: String(lat) + "," + String(lon),
    }).toString();
}
