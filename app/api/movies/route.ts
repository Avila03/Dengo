import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeMovies } from "@/lib/movies";
export async function GET(request: NextRequest) {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token)
    return NextResponse.json(
      {
        error:
          "A busca no TMDB ainda não foi ativada. Você pode adicionar títulos manualmente.",
      },
      { status: 503 },
    );
  const query = request.nextUrl.searchParams.get("q")?.trim() || "";
  const type =
    request.nextUrl.searchParams.get("type") === "tv" ? "tv" : "movie";
  if (query.length < 2 || query.length > 120)
    return NextResponse.json(
      { error: "Digite entre 2 e 120 caracteres." },
      { status: 400 },
    );
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const demo =
    process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
    process.env.NODE_ENV === "development";
  if (url && key) {
    const bearer = request.headers
      .get("authorization")
      ?.replace(/^Bearer /, "");
    if (!bearer)
      return NextResponse.json(
        { error: "Entre na sua conta para buscar." },
        { status: 401 },
      );
    const db = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
    });
    const { data, error } = await db.auth.getUser(bearer);
    if (error || !data.user)
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    const member = await db
      .from("memberships")
      .select("user_id")
      .eq("user_id", data.user.id)
      .single();
    if (member.error)
      return NextResponse.json(
        { error: "Conta sem acesso ao espaço." },
        { status: 403 },
      );
  } else if (!demo)
    return NextResponse.json(
      { error: "Configure o acesso privado primeiro." },
      { status: 503 },
    );
  try {
    const api = new URL(`https://api.themoviedb.org/3/search/${type}`);
    api.search = new URLSearchParams({
      query,
      language: "pt-BR",
      include_adult: "false",
      page: "1",
    }).toString();
    const result = await fetch(api, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 3600 },
    });
    if (!result.ok)
      return NextResponse.json(
        {
          error:
            result.status === 429
              ? "O catálogo está ocupado. Tente novamente em instantes."
              : "Não foi possível consultar o catálogo. Confira a configuração do TMDB.",
        },
        { status: 502 },
      );
    const data = await result.json();
    return NextResponse.json({
      results: normalizeMovies(data.results || [], type),
    });
  } catch {
    return NextResponse.json(
      { error: "O catálogo não respondeu. Tente novamente." },
      { status: 502 },
    );
  }
}
