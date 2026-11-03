import type { Entry } from "./model";

export function todayEntries(entries: Entry[], date: string): Entry[] {
  return entries
    .filter((entry) =>
      entry.due === date &&
      (entry.kind === "event" || entry.kind === "task" || entry.kind === "expense"),
    )
    .sort((a, b) => {
      const timeA = a.data?.time || "00:00";
      const timeB = b.data?.time || "00:00";
      if (timeA !== timeB) return timeA.localeCompare(timeB);
      const priority: Record<string, number> = { event: 0, task: 1, expense: 2 };
      return (priority[a.kind] ?? 99) - (priority[b.kind] ?? 99)
        || a.title.localeCompare(b.title, "pt-BR");
    });
}
