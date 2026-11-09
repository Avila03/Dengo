/** Bilhetes: recados curtos de um para o outro, guardados em `public.notes`. */
export type Note = {
  id: string;
  author_slot: 0 | 1;
  body: string;
  created_at: string;
  created_by?: string | null;
};

export const NOTES_DEMO_KEY = "dengo.demo.notes.v1";
export const NOTE_MAX = 280;
/** Quantos bilhetes recentes o app carrega. */
export const NOTES_LIMIT = 20;

export function noteBodyError(body: string) {
  const value = body.trim();
  if (!value) return "Escreva alguma coisa no bilhete.";
  if (value.length > NOTE_MAX) return `O bilhete pode ter até ${NOTE_MAX} caracteres.`;
  return "";
}

export function isNote(value: unknown): value is Note {
  if (!value || typeof value !== "object") return false;
  const n = value as Record<string, unknown>;
  return typeof n.id === "string" && (n.author_slot === 0 || n.author_slot === 1) &&
    typeof n.body === "string" && typeof n.created_at === "string";
}

/** Lê os bilhetes da demonstração, descartando o que estiver corrompido. */
export function readDemoNotes(raw: string | null): Note[] {
  try {
    const list = JSON.parse(raw || "[]");
    return Array.isArray(list) ? list.filter(isNote).slice(0, NOTES_LIMIT) : [];
  } catch {
    return [];
  }
}

/** "agora há pouco", "há 3 h", "ontem", "12 de out." — sempre no fuso de quem lê. */
export function noteWhen(createdAt: string, now = new Date()) {
  const at = new Date(createdAt);
  const minutes = Math.round((now.getTime() - at.getTime()) / 60000);
  if (!Number.isFinite(minutes)) return "";
  if (minutes < 2) return "agora há pouco";
  if (minutes < 60) return `há ${minutes} min`;
  const sameDay = at.toDateString() === now.toDateString();
  if (sameDay) return `há ${Math.round(minutes / 60)} h`;
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (at.toDateString() === yesterday.toDateString()) return "ontem";
  return at.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}
