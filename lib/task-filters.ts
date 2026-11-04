import type { Entry } from "./model";

export type TaskSection = "overdue" | "today" | "upcoming" | "undated" | "done";
export type ResponsibleFilter = "all" | "mine" | "partner" | "together";

export const TASK_SECTION_LABELS: Record<TaskSection, string> = {
  overdue: "Atrasadas",
  today: "Para hoje",
  upcoming: "Próximas responsabilidades",
  undated: "Sem data definida",
  done: "Concluídas",
};

export function taskSection(entry: Entry, today: string): TaskSection {
  if (entry.done) return "done";
  if (!entry.due) return "undated";
  if (entry.due < today) return "overdue";
  if (entry.due === today) return "today";
  return "upcoming";
}

export function filterResponsible(
  entry: Entry, filter: ResponsibleFilter, names: [string, string], memberSlot: number,
) {
  if (filter === "all") return true;
  if (filter === "together") return entry.assignee === "Nós dois";
  return entry.assignee === names[filter === "mine" ? memberSlot : 1 - memberSlot];
}

export function sortTaskEntries(entries: Entry[], today: string): Entry[] {
  const rank: Record<TaskSection, number> = {
    overdue: 0, today: 1, upcoming: 2, undated: 3, done: 4,
  };
  return [...entries].sort((a, b) => {
    const sectionA = taskSection(a, today);
    const sectionB = taskSection(b, today);
    return rank[sectionA] - rank[sectionB] ||
      (a.due || "9999-99-99").localeCompare(b.due || "9999-99-99") ||
      a.title.localeCompare(b.title, "pt-BR");
  });
}
