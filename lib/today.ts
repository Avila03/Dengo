import type { Entry } from "./model";
import { calendarEntries } from "./calendar.ts";

export function todayEntries(entries: Entry[], date: string): Entry[] {
  return calendarEntries(entries, { from: date, to: date })
    .sort((a, b) => {
      const timeA = a.data?.time || "00:00";
      const timeB = b.data?.time || "00:00";
      if (timeA !== timeB) return timeA.localeCompare(timeB);
      const priority: Record<string, number> = { event: 0, task: 1, expense: 2 };
      return (priority[a.kind] ?? 99) - (priority[b.kind] ?? 99)
        || a.title.localeCompare(b.title, "pt-BR");
    });
}

/** Local calendar arithmetic at noon to avoid UTC date boundaries. */
export function addDaysISO(day: string, increment: number): string {
  const value = new Date(day + "T12:00:00");
  value.setDate(value.getDate() + increment);
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

export function weekDates(day: string): string[] {
  const current = new Date(day + "T12:00:00");
  const previousDays = (current.getDay() + 6) % 7;
  const monday = addDaysISO(day, -previousDays);
  return Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i));
}

export function calendarMonthDays(month: string): (string | null)[] {
  const [year, mm] = month.split("-").map(Number);
  const offset = (new Date(year, mm - 1, 1).getDay() + 6) % 7;
  const last = new Date(year, mm, 0).getDate();
  return [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: last }, (_, i) =>
      month + "-" + String(i + 1).padStart(2, "0")),
  ];
}

export function shiftMonth(month: string, delta: number): string {
  const [year, mm] = month.split("-").map(Number);
  const next = new Date(year, mm - 1 + delta, 1);
  return next.getFullYear() + "-" + String(next.getMonth() + 1).padStart(2, "0");
}
/** Dias desde a data em que o casal começou (inclui o dia de hoje como "1 dia" só a partir do dia seguinte). */
export function daysTogether(since: string, today: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(since) || since > today) return 0;
  const start = Date.UTC(+since.slice(0, 4), +since.slice(5, 7) - 1, +since.slice(8, 10));
  const end = Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10));
  return Math.round((end - start) / 86400000);
}
