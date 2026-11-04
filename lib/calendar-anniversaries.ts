import type { Entry } from "./model.ts";

export type EventCounter = "elapsed" | "together" | "age" | "off";

/** Whole calendar months, not approximate days/30; short months count as milestones. */
export function elapsedCalendarMonths(startDate: string, occurrenceDate: string): number {
  const [startYear, startMonth] = startDate.split("-").map(Number);
  const [year, month] = occurrenceDate.split("-").map(Number);
  if (!Number.isInteger(startYear) || !Number.isInteger(startMonth) ||
      !Number.isInteger(year) || !Number.isInteger(month)) return -1;
  return (year - startYear) * 12 + (month - startMonth);
}

export function formatYearsAndMonths(months: number): string {
  const wholeYears = Math.floor(months / 12);
  const remainingMonths = months % 12;
  const parts: string[] = [];
  if (wholeYears) parts.push(wholeYears + (wholeYears === 1 ? " ano" : " anos"));
  if (remainingMonths) parts.push(remainingMonths + (remainingMonths === 1 ? " mês" : " meses"));
  return parts.join(" e ") || "0 meses";
}

/**
 * Rendered only on recurring event occurrences.
 * The true anchor is recorded on projected occurrences so that future dates
 * do not accidentally restart the anniversary counter.
 */
export function eventDurationLabel(entry: Entry): string {
  if (entry.kind !== "event") return "";
  const repeat = entry.data?.eventRepeat;
  if (repeat !== "monthly" && repeat !== "yearly") return "";
  const mode: EventCounter = entry.data?.eventCounter || "elapsed";
  if (mode === "off") return "";
  const anchor = entry.data?.eventAnchorDate || entry.due;
  const months = elapsedCalendarMonths(anchor, entry.due);
  if (months < 0) return "";
  const years = Math.floor(months / 12);
  if (mode === "age") return years + (years === 1 ? " ano de idade" : " anos de idade");
  if (!months) return mode === "together" ? "Começo da nossa história" : "Data de início";
  const duration = formatYearsAndMonths(months);
  if (mode === "together") return duration + " juntos";
  return "Há " + duration;
}
