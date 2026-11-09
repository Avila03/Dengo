import type { SupabaseClient } from "@supabase/supabase-js";
import type { Entry } from "./model.ts";
import { loadAllEntries } from "./records.ts";

/**
 * Sincronização incremental dos registros do casal.
 *
 * Antes, cada atualização (abrir o app, voltar à aba, qualquer alteração do
 * par recebida em tempo real) baixava todos os registros completos. Agora o
 * app baixa só a "assinatura" de cada registro (id + datas, poucos bytes) e
 * busca por inteiro apenas o que é novo ou mudou. Registros que sumiram da
 * lista foram excluídos. O resultado é idêntico ao carregamento completo.
 *
 * `updated_at` é preenchido pelo gatilho `stamp_entry_author` em toda
 * inserção e alteração, inclusive pelas funções do servidor.
 */
export type EntryStamp = { id: string; created_at: string; updated_at?: string | null };

const STAMP_PAGE = 1000;
const FETCH_CHUNK = 100;
/** Acima desta fração de registros alterados, o carregamento completo é mais barato. */
const FULL_RELOAD_RATIO = 0.6;

function sameVersion(entry: Entry, stamp: EntryStamp) {
  return entry.created_at === stamp.created_at && (entry.updated_at ?? null) === (stamp.updated_at ?? null);
}

/** Decide quais registros precisam ser buscados de novo. Função pura, testável. */
export function planEntrySync(current: Entry[], stamps: EntryStamp[]) {
  const known = new Map(current.map((e) => [e.id, e]));
  const fetch: string[] = [];
  for (const stamp of stamps) {
    const entry = known.get(stamp.id);
    if (!entry || !sameVersion(entry, stamp)) fetch.push(stamp.id);
  }
  return { fetch };
}

/**
 * Monta a lista final na ordem do servidor (mais recentes primeiro).
 * Devolve exatamente `current` quando nada mudou, evitando novas renderizações.
 */
export function mergeEntrySync(current: Entry[], stamps: EntryStamp[], fetched: Entry[]): Entry[] {
  const fresh = new Map(fetched.map((e) => [e.id, e]));
  const known = new Map(current.map((e) => [e.id, e]));
  const result: Entry[] = [];
  for (const stamp of stamps) {
    const entry = fresh.get(stamp.id) ?? known.get(stamp.id);
    // Excluído entre a leitura das assinaturas e a busca: simplesmente some.
    if (entry) result.push(entry);
  }
  const unchanged = result.length === current.length && result.every((e, i) => e === current[i]);
  return unchanged ? current : result;
}

async function loadStamps(db: SupabaseClient, space: string) {
  const all: EntryStamp[] = [];
  for (let from = 0; ; from += STAMP_PAGE) {
    const { data, error } = await db
      .from("entries")
      .select("id,created_at,updated_at")
      .eq("space_id", space)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + STAMP_PAGE - 1);
    if (error) throw new Error("Não foi possível atualizar os registros. Tente atualizar.");
    all.push(...(data as EntryStamp[]));
    if (data.length < STAMP_PAGE) break;
  }
  return [...new Map(all.map((s) => [s.id, s])).values()];
}

async function loadEntriesById(db: SupabaseClient, space: string, ids: string[]) {
  const result: Entry[] = [];
  for (let i = 0; i < ids.length; i += FETCH_CHUNK) {
    const { data, error } = await db
      .from("entries")
      .select("*")
      .eq("space_id", space)
      .in("id", ids.slice(i, i + FETCH_CHUNK));
    if (error) throw new Error("Não foi possível atualizar os registros. Tente atualizar.");
    result.push(...(data as Entry[]));
  }
  return result;
}

/**
 * Atualiza `current` (registros já carregados deste mesmo espaço) com o
 * estado do servidor. Com `current` vazio, faz o carregamento completo.
 */
export async function syncEntries(db: SupabaseClient, space: string, current: Entry[]): Promise<Entry[]> {
  if (!current.length) return loadAllEntries(db, space);
  const stamps = await loadStamps(db, space);
  const { fetch } = planEntrySync(current, stamps);
  if (!fetch.length) return mergeEntrySync(current, stamps, []);
  if (fetch.length > stamps.length * FULL_RELOAD_RATIO) return loadAllEntries(db, space);
  const fetched = await loadEntriesById(db, space, fetch);
  return mergeEntrySync(current, stamps, fetched);
}
