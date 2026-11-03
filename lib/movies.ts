export type MovieResult = {
  id: number;
  title: string;
  year: string;
  poster: string;
  overview: string;
  mediaType: "movie" | "tv";
};
export function normalizeMovies(
  items: Record<string, unknown>[],
  type: "movie" | "tv",
): MovieResult[] {
  return items
    .filter(
      (r) =>
        typeof r.id === "number" && typeof (r.title ?? r.name) === "string",
    )
    .slice(0, 20)
    .map((r) => ({
      id: r.id as number,
      title: String(r.title ?? r.name).slice(0, 120),
      year: String(r.release_date ?? r.first_air_date ?? "").slice(0, 4),
      poster:
        typeof r.poster_path === "string" &&
        /^\/[a-zA-Z0-9_.-]+$/.test(r.poster_path)
          ? `https://image.tmdb.org/t/p/w342${r.poster_path}`
          : "",
      overview: String(r.overview ?? "").slice(0, 2000),
      mediaType: type,
    }));
}
