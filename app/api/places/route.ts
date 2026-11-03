import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeGooglePlaces } from "@/lib/places";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const city = request.nextUrl.searchParams.get("city")?.trim() ?? "";
  if (search.length < 2 || search.length > 100 || city.length > 80)
    return NextResponse.json(
      { error: "Digite um nome entre 2 e 100 caracteres e uma cidade de até 80 caracteres." },
      { status: 400 },
    );

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    return NextResponse.json({ error: "Configure o acesso privado do Dengo primeiro." }, { status: 503 });

  const header = request.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!bearer)
    return NextResponse.json({ error: "Entre na sua conta para procurar lugares." }, { status: 401 });
  const db = createClient(url, key, {
    global: { headers: { Authorization: "Bearer " + bearer } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await db.auth.getUser(bearer);
  if (error || !data.user || data.user.is_anonymous)
    return NextResponse.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  const member = await db.from("memberships").select("space_id")
    .eq("user_id", data.user.id).maybeSingle();
  if (member.error || !member.data)
    return NextResponse.json(
      { error: "Entre no espaço do casal antes de pesquisar lugares." },
      { status: 403 },
    );
  const placesKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!placesKey)
    return NextResponse.json(
      { error: "Falta ativar a chave do Google Places no Dengo. O cadastro manual continua disponível.", code: "GOOGLE_NOT_CONFIGURED" },
      { status: 503 },
    );

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": placesKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.primaryTypeDisplayName",
      },
      body: JSON.stringify({
        textQuery: city ? search + ", " + city : search,
        languageCode: "pt-BR",
        regionCode: "BR",
        pageSize: 8,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      return NextResponse.json(
        { error: response.status === 429
          ? "O Google Places atingiu seu limite de consultas. Tente novamente mais tarde."
          : "A busca do Google Places falhou. Confira a chave, o faturamento e se a Places API (New) está habilitada." },
        { status: 502 },
      );
    const payload: unknown = await response.json();
    const raw = payload && typeof payload === "object" && "places" in payload
      ? (payload as { places?: unknown }).places : [];
    return NextResponse.json(
      { results: normalizeGooglePlaces(raw) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "O Google Places não respondeu. Tente novamente." }, { status: 502 });
  }
}
