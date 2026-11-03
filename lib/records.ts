import type { SupabaseClient } from "@supabase/supabase-js";
import type { Entry } from "./model";
export async function loadAllEntries(db: SupabaseClient, space: string) {
  const all: Entry[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await db
      .from("entries")
      .select("*")
      .eq("space_id", space)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + 499);
    if (error)
      throw new Error(
        "Não foi possível carregar todos os registros. Tente atualizar.",
      );
    all.push(...(data as Entry[]));
    if (data.length < 500) break;
  }
  return [...new Map(all.map((e) => [e.id, e])).values()];
}
