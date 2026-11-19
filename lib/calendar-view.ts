import type { Entry } from "./model.ts";
import {
  addCalendarDays, calendarDayDifference, eventFinish, projectCalendarEntries,
} from "./calendar-schedule.ts";
import {
  EXPENSE_CALENDAR_COLOR, TASK_CALENDAR_COLOR, calendarEntryTopic, type CalendarTopic,
} from "./calendar-topics.ts";

/** Categoria visível no calendário: tópicos dos compromissos + Combinados + Contas. */
export type CalendarCategory = { id: string; name: string; color: string };
export const TASK_CATEGORY: CalendarCategory = { id: "combinados", name: "Combinados", color: TASK_CALENDAR_COLOR };
export const EXPENSE_CATEGORY: CalendarCategory = { id: "contas", name: "Contas", color: EXPENSE_CALENDAR_COLOR };

export function calendarCategories(topics: CalendarTopic[]): CalendarCategory[] {
  return [...topics, TASK_CATEGORY, EXPENSE_CATEGORY];
}
export function categoryOf(entry: Entry, topics: CalendarTopic[]): CalendarCategory {
  if (entry.kind === "task") return TASK_CATEGORY;
  if (entry.kind === "expense") return EXPENSE_CATEGORY;
  return calendarEntryTopic(entry, topics) ?? topics.find((t) => t.id === "outros") ?? topics[0];
}
/** Remove o que está em categorias escondidas. */
export function visibleEntries(entries: Entry[], topics: CalendarTopic[], hidden: ReadonlySet<string>) {
  return hidden.size ? entries.filter((e) => !hidden.has(categoryOf(e, topics).id)) : entries;
}

/** Semanas (domingo a sábado) que cobrem o mês "AAAA-MM", só as necessárias. */
export function monthWeeks(month: string): string[][] {
  const [y, m] = month.split("-").map(Number);
  const first = `${month}-01`;
  const weekday = new Date(Date.UTC(y, m - 1, 1, 12)).getUTCDay();
  const last = `${month}-${String(new Date(Date.UTC(y, m, 0, 12)).getUTCDate()).padStart(2, "0")}`;
  const weeks: string[][] = [];
  for (let start = addCalendarDays(first, -weekday); start <= last; start = addCalendarDays(start, 7))
    weeks.push(Array.from({ length: 7 }, (_, i) => addCalendarDays(start, i)));
  return weeks;
}

export type DayBar = {
  entry: Entry; color: string; multi: boolean;
  /** O trecho começa/termina neste dia (ou na borda da semana). */
  segmentStart: boolean; segmentEnd: boolean;
  /** Título só no começo de cada trecho, para a faixa ler como uma peça só. */
  label: string;
};
export type MonthDay = { date: string; inMonth: boolean; bars: DayBar[]; more: number; total: number };

function byStartThenTime(a: Entry, b: Entry) {
  const multiA = eventFinish(a) > a.due ? 0 : 1, multiB = eventFinish(b) > b.due ? 0 : 1;
  return multiA - multiB || a.due.localeCompare(b.due) || (a.data?.time || "99").localeCompare(b.data?.time || "99")
    || a.title.localeCompare(b.title);
}

/** Dias do mês com até `maxBars` faixas; eventos de vários dias primeiro, para manterem a mesma linha. */
export function monthGrid(month: string, entries: Entry[], topics: CalendarTopic[], maxBars = 2): MonthDay[][] {
  const weeks = monthWeeks(month);
  const from = weeks[0][0], to = weeks[weeks.length - 1][6];
  const projected = projectCalendarEntries(entries, { from, to });
  return weeks.map((week) => week.map((date, index) => {
    const items = projected.filter((e) => e.due <= date && eventFinish(e) >= date).sort(byStartThenTime);
    const bars = items.slice(0, maxBars).map((entry) => {
      const finish = eventFinish(entry);
      const segmentStart = entry.due === date || index === 0;
      const segmentEnd = finish === date || index === 6;
      return { entry, color: categoryOf(entry, topics).color, multi: finish > entry.due,
        segmentStart, segmentEnd, label: segmentStart ? entry.title : "" };
    });
    return { date, inMonth: date.slice(0, 7) === month, bars, more: Math.max(0, items.length - maxBars), total: items.length };
  }));
}

/** O que acontece num dia, em ordem: dia todo primeiro, depois por horário. */
export function dayEntries(date: string, entries: Entry[]): Entry[] {
  return projectCalendarEntries(entries, { from: date, to: date })
    .filter((e) => e.due <= date && eventFinish(e) >= date)
    .sort((a, b) => (a.data?.time || "").localeCompare(b.data?.time || "") || a.title.localeCompare(b.title));
}

/** "dia 2 de 3" num evento de vários dias, ou o horário ("20:00–23:00"), ou "dia todo". */
export function dayTimeLabel(entry: Entry, date: string): string {
  const finish = eventFinish(entry);
  if (finish > entry.due)
    return `dia ${calendarDayDifference(entry.due, date) + 1}/${calendarDayDifference(entry.due, finish) + 1}`;
  const start = entry.data?.time || "";
  if (!start) return "dia todo";
  return entry.data?.endTime ? `${start}–${entry.data.endTime}` : start;
}

export type NextDate = { entry: Entry; daysAway: number };
/** As próximas `count` datas depois de hoje (não inclui hoje), sem o que já foi concluído. */
export function nextDates(entries: Entry[], today: string, count = 3, horizonDays = 366): NextDate[] {
  const from = addCalendarDays(today, 1);
  return projectCalendarEntries(entries, { from, to: addCalendarDays(today, horizonDays) })
    .filter((e) => e.due >= from && !e.done)
    .sort((a, b) => a.due.localeCompare(b.due) || (a.data?.time || "").localeCompare(b.data?.time || ""))
    .slice(0, count)
    .map((entry) => ({ entry, daysAway: calendarDayDifference(today, entry.due) }));
}

export type UpcomingGroup = { title: string; items: Entry[] };
/** Próximos compromissos a partir de hoje: esta semana (até sábado), a próxima e mais adiante. */
export function upcomingGroups(entries: Entry[], today: string, limit = 40, horizonDays = 366): UpcomingGroup[] {
  const weekday = new Date(today + "T12:00:00Z").getUTCDay();
  const weekEnd = addCalendarDays(today, 6 - weekday), nextEnd = addCalendarDays(weekEnd, 7);
  const items = projectCalendarEntries(entries, { from: today, to: addCalendarDays(today, horizonDays) })
    .filter((e) => eventFinish(e) >= today && !e.done)
    .sort((a, b) => a.due.localeCompare(b.due) || (a.data?.time || "").localeCompare(b.data?.time || ""))
    .slice(0, limit);
  return [
    { title: "Esta semana", items: items.filter((e) => e.due <= weekEnd) },
    { title: "Próxima semana", items: items.filter((e) => e.due > weekEnd && e.due <= nextEnd) },
    { title: "Mais adiante", items: items.filter((e) => e.due > nextEnd) },
  ].filter((group) => group.items.length);
}

export function daysAwayLabel(days: number) {
  return days <= 0 ? "hoje" : days === 1 ? "amanhã" : `em ${days} dias`;
}
