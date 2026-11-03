import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeMovies } from "@/lib/movies";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("mode") || "search";
  const type = params.get("type") === "tv" ? "tv" : "movie";
  const query = params.get("q")?.trim() || "";
  const requestedPage = params.get("page") || "1";
  if (!["search", "trending", "popular"].includes(mode))
    return NextResponse.json({ error: "Modo de consulta inválido." }, { status: 400 });
  if (!/^[1-9][0-9]?$/.test(requestedPage) || Number(requestedPage) > 10)
    return NextResponse.json({ error: "Página inválida." }, { status: 400 });
  if (mode === "search" && (query.length < 2 || query.length > 120))
    return NextResponse.json(
      { error: "Digite entre 2 e 120 caracteres para pesquisar." },
      { status: 400 },
    );

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const demo =
    process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
    process.env.NODE_ENV === "development";

  if (url && key) {
    const bearer = request.headers.get("authorization")?.replace(/^Bearer /, "");
    if (!bearer)
      return NextResponse.json({ error: "Entre na sua conta para explorar o catálogo." }, { status: 401 });
    const db = createClient(url, key);
    const { data, error } = await db.auth.getUser(bearer);
    if (error || !data.user)
      return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
    const memberDb = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
    });
    const member = await memberDb.from("memberships")
      .select("user_id").eq("user_id", data.user.id).maybeSingle();
    if (member.error || !member.data)
      return NextResponse.json({ error: "Entre no espaço de um casal antes de explorar." }, { status: 403 });
  } else if (!demo) {
    return NextResponse.json(
      { error: "Configure o acesso privado do Dengo primeiro." },
      { status: 503 },
    );
  }

  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token)
    return NextResponse.json(
      { error: "O catálogo online ainda precisa ser ativado pelo administrador. Sua lista manual continua disponível.", code: "CATALOG_NOT_CONFIGURED" },
      { status: 503 },
    );

  const path = mode === "search"
    ? `search/${type}`
    : mode === "popular"
      ? `${type}/popular`
      : `trending/${type}/week`;
  const api = new URL(`https://api.themoviedb.org/3/${path}`);
  api.search = new URLSearchParams({
    language: "pt-BR",
    page: requestedPage,
    ...(mode === "search" ? { query, include_adult: "false" } : {}),
  }).toString();
  try {
    const response = await fetch(api, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: mode === "search" ? 900 : 1800 },
    });
    if (!response.ok)
      return NextResponse.json(
        { error: response.status === 429
          ? "Muitas buscas no momento. Tente novamente em instantes."
          : "Não foi possível consultar o TMDB. Verifique a integração do catálogo." },
        { status: 502 },
      );
    const data: unknown = await response.json();
    const parsed = data && typeof data === "object" ? data as Record<string, unknown> : {};
    const items = Array.isArray(parsed.results)
      ? parsed.results.filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === "object" && !Array.isArray(r))
      : [];
    const pages = Number.isInteger(parsed.total_pages) ? Number(parsed.total_pages) : 1;
    return NextResponse.json({
      results: normalizeMovies(items, type),
      page: Number(requestedPage),
      totalPages: Math.min(Math.max(1, pages), 10),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "O catálogo não respondeu. Tente novamente." }, { status: 502 });
  }
}
