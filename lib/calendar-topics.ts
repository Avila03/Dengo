import type { Entry } from "./model";
export type CalendarTopic = { id: string; name: string; color: string };
export const DEFAULT_CALENDAR_TOPICS: CalendarTopic[] = [
  { id: "janta", name: "Janta", color: "#ef686e" },
  { id: "filmes", name: "Filmes", color: "#9873d8" },
  { id: "passeio", name: "Passeio", color: "#418cb6" },
  { id: "viagem", name: "Viagem", color: "#42a58e" },
  { id: "outros", name: "Outros", color: "#bf9554" },
];
export const TASK_CALENDAR_COLOR = "#d88954";
export const EXPENSE_CALENDAR_COLOR = "#55a29e";

export function validCalendarTopic(value: unknown): value is CalendarTopic {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const t = value as Record<string, unknown>;
  return typeof t.id === "string" && /^[a-z0-9][a-z0-9_-]{0,63}$/.test(t.id) &&
    typeof t.name === "string" && t.name.trim().length > 0 && t.name.trim().length <= 30 &&
    typeof t.color === "string" && /^#[0-9a-fA-F]{6}$/.test(t.color);
}
export function calendarTopics(value: unknown): CalendarTopic[] {
  if (!Array.isArray(value)) return DEFAULT_CALENDAR_TOPICS;
  const result: CalendarTopic[] = [];
  for (const item of value) {
    if (!validCalendarTopic(item)) continue;
    if (result.some((topic) => topic.id === item.id || topic.name.toLocaleLowerCase("pt-BR") === item.name.trim().toLocaleLowerCase("pt-BR"))) continue;
    result.push({ id: item.id, name: item.name.trim(), color: item.color.toLowerCase() });
  }
  return result.length ? result : DEFAULT_CALENDAR_TOPICS;
}
export function validateCalendarTopics(value: CalendarTopic[]) {
  if (!Array.isArray(value) || !value.length)
    throw new Error("Mantenha pelo menos um tópico.");
  if (JSON.stringify(value).length > 20000)
    throw new Error("A lista de tópicos está grande demais para salvar.");
  const names = new Set<string>();
  const ids = new Set<string>();
  for (const topic of value) {
    if (!validCalendarTopic(topic)) throw new Error("Confira os nomes (até 30 caracteres) e as cores dos tópicos.");
    const name = topic.name.trim().toLocaleLowerCase("pt-BR");
    if (names.has(name) || ids.has(topic.id)) throw new Error("Cada tópico deve ter um nome diferente.");
    names.add(name); ids.add(topic.id);
  }
}
export function calendarEntryTopic(entry: Entry, topics: CalendarTopic[]): CalendarTopic | null {
  if (entry.kind !== "event") return null;
  return topics.find((t) => t.id === entry.data?.topicId)
    || topics.find((t) => t.id === "outros") || topics[0] || DEFAULT_CALENDAR_TOPICS[4];
}
export function calendarEntryColor(entry: Entry, topics: CalendarTopic[]) {
  return entry.kind === "task" ? TASK_CALENDAR_COLOR :
    entry.kind === "expense" ? EXPENSE_CALENDAR_COLOR :
    calendarEntryTopic(entry, topics)?.color || DEFAULT_CALENDAR_TOPICS[4].color;
}
export function eventTopicLabel(entry: Entry, topics: CalendarTopic[]) {
  return entry.kind === "event" ? calendarEntryTopic(entry, topics)?.name || "Evento" :
    entry.kind === "task" ? "Tarefa" : entry.kind === "expense" ? "Conta" : "Registro";
}
