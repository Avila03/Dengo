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

export const PLACE_CATEGORIES = {
  all: "Todos",
  restaurant: "Restaurantes",
  cafe: "Cafés",
  bar: "Bares",
  burger: "Hamburguerias",
  pizza: "Pizzarias",
  bakery: "Padarias",
} as const;
export type PlaceCategory = keyof typeof PLACE_CATEGORIES;
export function isPlaceCategory(value: string): value is PlaceCategory {
  return Object.prototype.hasOwnProperty.call(PLACE_CATEGORIES, value);
}
export function photonCategoryFilter(category: PlaceCategory): string {
  const choices: Record<PlaceCategory, string> = {
    all: "osm.amenity.restaurant,osm.amenity.cafe,osm.amenity.bar,osm.amenity.pub,osm.amenity.fast_food,osm.shop.bakery",
    restaurant: "osm.amenity.restaurant",
    cafe: "osm.amenity.cafe,osm.shop.coffee",
    bar: "osm.amenity.bar,osm.amenity.pub,osm.amenity.biergarten",
    burger: "osm.amenity.fast_food,osm.amenity.restaurant",
    pizza: "osm.amenity.restaurant,osm.amenity.fast_food",
    bakery: "osm.shop.bakery,osm.shop.confectionery",
  };
  return choices[category];
}
export function overpassSearchQuery(name: string, city: string, category: PlaceCategory): string {
  // Allow only letters, numbers, spaces and dashes, preventing Overpass regex injection.
  const safeName = name.replace(/[^\p{L}\p{N} -]/gu, " ").trim().slice(0, 80);
  const safeCity = city.split(",")[0].trim();
  const pattern = JSON.stringify(safeName);
  const area = 'area["name"=' + JSON.stringify(safeCity) + ']["boundary"="administrative"]["admin_level"="8"]->.city;';
  const amenity: Record<PlaceCategory, string> = {
    all: '["amenity"~"^(restaurant|cafe|bar|pub|fast_food|biergarten)$"]',
    restaurant: '["amenity"="restaurant"]',
    cafe: '["amenity"="cafe"]',
    bar: '["amenity"~"^(bar|pub|biergarten)$"]',
    burger: '["amenity"~"^(fast_food|restaurant)$"]',
    pizza: '["amenity"~"^(fast_food|restaurant)$"]',
    bakery: '["shop"~"^(bakery|confectionery)$"]',
  };
  const main = 'nwr(area.city)["name"~' + pattern + ',i]' + amenity[category] + ';';
  const bakery = category === "all"
    ? 'nwr(area.city)["name"~' + pattern + ',i]["shop"~"^(bakery|confectionery)$"];'
    : "";
  return ['[out:json][timeout:12];',area,'(',main,bakery,');','out center 8;'].join("\n");
}
export function normalizeOverpassPlaces(payload: unknown): OpenStreetMapPlace[] {
  if (!payload || typeof payload !== "object" || !("elements" in payload)) return [];
  const data = (payload as { elements?: unknown }).elements;
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  const items: OpenStreetMapPlace[] = [];
  for (const element of data) {
    if (!element || typeof element !== "object") continue;
    const e = element as Record<string, unknown>;
    const kind = String(e.type);
    const tag = kind === "node" ? "n" : kind === "way" ? "w" : kind === "relation" ? "r" : "";
    if (!tag || !/^\d+$/.test(String(e.id))) continue;
    const tags = e.tags && typeof e.tags === "object" ? e.tags as Record<string, unknown> : {};
    const center = e.center && typeof e.center === "object" ? e.center as Record<string, unknown> : {};
    const lat = typeof e.lat === "number" ? e.lat : Number(center.lat);
    const lon = typeof e.lon === "number" ? e.lon : Number(center.lon);
    const title = typeof tags.name === "string" ? tags.name.trim() : "";
    if (!title || !validCoordinates(lat, lon)) continue;
    const id = "osm_" + tag + "_" + String(e.id);
    if (seen.has(id)) continue;
    seen.add(id);
    const address = [
      typeof tags["addr:street"] === "string" && typeof tags["addr:housenumber"] === "string"
        ? tags["addr:street"] + ", " + tags["addr:housenumber"] : tags["addr:street"],
      tags["addr:suburb"], tags["addr:city"],
    ].filter((value): value is string => typeof value === "string" && !!value.trim()).join(", ");
    items.push({
      id, title: title.slice(0,120), address: address.slice(0,240) || title,
      category: String(tags.amenity || tags.shop || "").slice(0,80),
      source: "openstreetmap", lat, lon,
    });
    if (items.length >= 8) break;
  }
  return items;
}
