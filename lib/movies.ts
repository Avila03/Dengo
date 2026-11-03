export type MovieResult = {
  id: number;
  title: string;
  year: string;
  poster: string;
  overview: string;
  mediaType: "movie" | "tv";
  rating: number | null;
};

export function normalizeMovies(
  items: Record<string, unknown>[],
  type: "movie" | "tv",
): MovieResult[] {
  return items
    .filter(
      (r) =>
        Number.isSafeInteger(r.id) &&
        Number(r.id) > 0 &&
        r.adult !== true &&
        typeof (r.title ?? r.name) === "string" &&
        String(r.title ?? r.name).trim().length > 0,
    )
    .slice(0, 20)
    .map((r) => ({
      id: r.id as number,
      title: String(r.title ?? r.name).trim().slice(0, 120),
      year: String(r.release_date ?? r.first_air_date ?? "").slice(0, 4),
      poster:
        typeof r.poster_path === "string" &&
        /^\/[a-zA-Z0-9_.-]+$/.test(r.poster_path)
          ? `https://image.tmdb.org/t/p/w342${r.poster_path}`
          : "",
      overview: typeof r.overview === "string" ? r.overview.slice(0, 2000) : "",
      mediaType: type,
      rating:
        typeof r.vote_average === "number" &&
        Number.isFinite(r.vote_average) &&
        r.vote_average >= 0 &&
        r.vote_average <= 10
          ? Math.round(r.vote_average * 10) / 10
          : null,
    }));
}
