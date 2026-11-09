/** Links e mapas embutidos dos lugares salvos (sem busca em serviços externos). */
export function validGooglePlaceId(value: string): boolean {
  return /^[A-Za-z0-9_-]{5,255}$/.test(value);
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

export function validCoordinates(lat: unknown, lon: unknown): boolean {
  return typeof lat === "number" && typeof lon === "number" &&
    Number.isFinite(lat) && Number.isFinite(lon) &&
    lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
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

/** A user-supplied reference link, not metadata imported from another service. */
export function normalizePlaceLink(input: string): string {
  const value = input.trim();
  if (!value) return "";
  if (value.length > 3000) throw new Error("O link é muito longo. Copie um link de compartilhamento mais curto.");
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password)
      throw new Error("Use um link HTTPS válido.");
    return url.href;
  } catch {
    throw new Error("Cole um link completo começando com https://, como TikTok ou Google Maps.");
  }
}
export function safePlaceLink(value: unknown): string {
  if (typeof value !== "string") return "";
  try { return normalizePlaceLink(value); } catch { return ""; }
}
