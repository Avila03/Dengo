export type Entry = {
  id: string;
  space_id?: string;
  kind: "shopping" | "task";
  title: string;
  detail: string;
  assignee: string;
  due: string;
  done: boolean;
  created_at: string;
};
export const STORAGE_KEY = "dengo.demo.v1";
export function isEntry(value: unknown): value is Entry {
  if (!value || typeof value !== "object") return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    (e.kind === "task" || e.kind === "shopping") &&
    typeof e.title === "string" &&
    typeof e.detail === "string" &&
    typeof e.assignee === "string" &&
    typeof e.due === "string" &&
    typeof e.done === "boolean" &&
    typeof e.created_at === "string"
  );
}
export function readEntries(raw: string | null): Entry[] {
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every(isEntry))
    throw new Error(
      "Dados locais inválidos. Exporte ou verifique o armazenamento antes de continuar.",
    );
  return parsed;
}
export function dayLabel(date: string) {
  return date
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "numeric",
        month: "short",
      }).format(new Date(`${date}T12:00:00`))
    : "Sem prazo";
}
export function isOverdue(entry: Entry, today: string) {
  return !entry.done && !!entry.due && entry.due < today;
}
export function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
