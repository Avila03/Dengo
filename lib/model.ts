export type Kind =
  "shopping" | "task" | "expense" | "transfer" | "event" | "movie" | "place";
export type Details = {
  amount?: number;
  payer?: 0 | 1;
  shareFirst?: number;
  category?: string;
  repeatAnchor?: number;
  recurrence?: "none" | "daily" | "weekly" | "monthly";
  alternate?: boolean;
  time?: string;
  location?: string;
  sourceId?: string;
  sourceKind?: Kind;
  mediaType?: "movie" | "tv";
  tmdbId?: number;
  poster?: string;
  overview?: string;
  year?: string;
  ratingFirst?: number;
  ratingSecond?: number;
  interestFirst?: boolean;
  interestSecond?: boolean;
  address?: string;
  googlePlaceId?: string;
  budget?: number;
  url?: string;
  review?: string;
};
export type Entry = {
  id: string;
  space_id?: string;
  kind: Kind;
  title: string;
  detail: string;
  assignee: string;
  due: string;
  done: boolean;
  created_at: string;
  data?: Details;
  occurrence_from?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_by_slot?: 0 | 1 | null;
  updated_by_slot?: 0 | 1 | null;
  updated_at?: string | null;
};
export type Draft = Omit<
  Entry,
  | "id"
  | "created_at"
  | "space_id"
  | "occurrence_from"
  | "created_by"
  | "updated_by"
  | "created_by_slot"
  | "updated_by_slot"
  | "updated_at"
>;
export type Preferences = {
  title: string;
  names: [string, string];
  since: string;
  photo: string;
  budgets: Record<string, number>;
};
export const DEFAULT_PREFS: Preferences = {
  title: "Nosso cantinho",
  names: ["Eu", "Meu amor"],
  since: "",
  photo: "",
  budgets: {},
};
export const STORAGE_KEY = "dengo.demo.v1";
export const PREFS_KEY = "dengo.preferences.v1";
const kinds: Kind[] = [
  "shopping",
  "task",
  "expense",
  "transfer",
  "event",
  "movie",
  "place",
];
export function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === value;
}
export function isEntry(value: unknown): value is Entry {
  if (!value || typeof value !== "object") return false;
  const e = value as Entry;
  return (
    typeof e.id === "string" &&
    kinds.includes(e.kind) &&
    typeof e.title === "string" &&
    typeof e.detail === "string" &&
    typeof e.assignee === "string" &&
    typeof e.due === "string" &&
    (e.due === "" || isDate(e.due)) &&
    typeof e.done === "boolean" &&
    typeof e.created_at === "string" &&
    (!e.data || typeof e.data === "object")
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
  return isDate(date)
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
export function addMonths(date: string, months: number, desiredDay?: number) {
  const [y, m, d] = date.split("-").map(Number);
  const last = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 + months, Math.min(desiredDay ?? d, last)))
    .toISOString()
    .slice(0, 10);
}
export function nextDate(date: string, repeat: Details["recurrence"]) {
  if (!isDate(date) || !repeat || repeat === "none") return "";
  if (repeat === "monthly") return addMonths(date, 1);
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + (repeat === "weekly" ? 7 : 1));
  return d.toISOString().slice(0, 10);
}
export function successor(entry: Entry, names: string[]): Draft | null {
  const anchor = entry.data?.repeatAnchor || Number(entry.due.slice(-2));
  const due =
    entry.data?.recurrence === "monthly" && isDate(entry.due)
      ? addMonths(entry.due, 1, anchor)
      : nextDate(entry.due, entry.data?.recurrence);
  if (!due || !["task", "expense"].includes(entry.kind)) return null;
  return {
    kind: entry.kind,
    title: entry.title,
    detail: entry.detail,
    assignee: entry.data?.alternate
      ? entry.assignee === names[0]
        ? names[1]
        : names[0]
      : entry.assignee,
    due,
    done: false,
    data: { ...entry.data, sourceId: undefined, repeatAnchor: anchor },
  };
}
export function validateDraft(d: Draft) {
  if (!d.title.trim() || d.title.length > 120)
    throw new Error("Informe um título com até 120 caracteres.");
  if (d.detail.length > 240)
    throw new Error("A observação deve ter até 240 caracteres.");
  if (d.due && !isDate(d.due)) throw new Error("Informe uma data válida.");
  if (d.data?.recurrence && d.data.recurrence !== "none" && !d.due)
    throw new Error("Uma repetição precisa de data inicial.");
  if (["expense", "transfer"].includes(d.kind)) {
    if (
      !Number.isSafeInteger(d.data?.amount) ||
      d.data!.amount! <= 0 ||
      d.data!.amount! > 100000000
    )
      throw new Error("Informe um valor entre R$ 0,01 e R$ 1.000.000,00.");
    if (d.data?.payer !== 0 && d.data?.payer !== 1)
      throw new Error("Selecione quem pagou.");
    if (
      d.kind === "expense" &&
      (!Number.isInteger(d.data?.shareFirst) ||
        d.data!.shareFirst! < 0 ||
        d.data!.shareFirst! > 10000)
    )
      throw new Error("A divisão deve estar entre 0 e 100%.");
  }
}
