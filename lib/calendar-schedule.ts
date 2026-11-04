import type { Entry, EventOccurrenceChanges } from "./model.ts";

const DAY_MS = 86400000;
export function addCalendarDays(date: string, count: number): string {
  const ms = Date.parse(date + "T12:00:00Z") + count * DAY_MS;
  return new Date(ms).toISOString().slice(0, 10);
}
export function calendarDayDifference(from: string, to: string): number {
  return Math.round((Date.parse(to + "T12:00:00Z") - Date.parse(from + "T12:00:00Z")) / DAY_MS);
}
export function eventFinish(entry: Entry): string {
  return entry.kind === "event" && entry.data?.endDate && entry.data.endDate >= entry.due
    ? entry.data.endDate : entry.due;
}
export function hasEventOnDay(entry: Entry, date: string): boolean {
  return entry.due <= date && eventFinish(entry) >= date;
}
export function eventStartTimeLabel(entry: Entry, day?: string): string {
  if (day && entry.due < day) return "Continua";
  return entry.data?.time || "Dia todo";
}
export function eventDateInMonth(anchor: string, year: number, month: number): string {
  const day = Number(anchor.slice(8, 10));
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return String(year).padStart(4, "0") + "-" +
    String(month).padStart(2, "0") + "-" +
    String(Math.min(day, last)).padStart(2, "0");
}
export function recurringInstanceKey(entry: Entry): string {
  const sourceId = entry.data?.eventSourceId || entry.id;
  const day = entry.data?.eventOccurrenceDate || entry.due;
  return entry.kind === "event" && entry.data?.eventRepeat &&
      entry.data.eventRepeat !== "none" ? sourceId + "::" + day : sourceId;
}
export function recurrenceSeries(entries: Entry[], occurrence: Entry): Entry {
  if (!occurrence.data?.eventSourceId) return occurrence;
  return entries.find((candidate) => candidate.id === occurrence.data?.eventSourceId) || occurrence;
}
export function eventDaysUntil(today: string, scheduled: string): number {
  return calendarDayDifference(today, scheduled);
}
export function eventRangeLabel(event: Entry, day?: string): string {
  const end = eventFinish(event);
  const startTime = event.data?.time;
  const endTime = event.data?.endTime;
  if (end > event.due) {
    const range = event.due.split("-").reverse().join("/") +
      " — " + end.split("-").reverse().join("/");
    return range + (startTime ? " · " + startTime + (endTime ? " até " + endTime : "") : "");
  }
  return eventStartTimeLabel(event, day) +
    (startTime && endTime ? "–" + endTime : "");
}

function applyOccurrence(source: Entry, scheduled: string, change?: EventOccurrenceChanges): Entry {
  const baseDuration = calendarDayDifference(source.due, eventFinish(source));
  const due = change?.due || scheduled;
  const endDate = change?.endDate || (baseDuration ? addCalendarDays(due, baseDuration) : "");
  const { canceled, title, detail, assignee, due: moved, ...dataOverride } = change || {};
  const data = {
    ...source.data,
    ...dataOverride,
    endDate,
    eventSourceId: source.id,
    eventOccurrenceDate: scheduled,
    eventAnchorDate: source.data?.eventAnchorDate || source.due,
  };
  return {
    ...source,
    id: scheduled === source.due && !change ? source.id : source.id + "::" + scheduled,
    due,
    done: false,
    title: title ?? source.title,
    detail: detail ?? source.detail,
    assignee: assignee ?? source.assignee,
    data,
  };
}

/** Only generate instances that overlap this interval, including multi-day spans. */
export function projectCalendarEntries(
  entries: Entry[],
  interval?: { from: string; to: string },
): Entry[] {
  const dated = entries.filter((e) =>
    e.due && ["event", "task", "expense"].includes(e.kind));
  if (!interval) return dated;
  const { from, to } = interval;
  if (from > to) return [];
  const output: Entry[] = [];
  for (const source of dated) {
    const frequency = source.kind === "event" ? source.data?.eventRepeat : undefined;
    if (frequency !== "monthly" && frequency !== "yearly") {
      if (source.due <= to && eventFinish(source) >= from) output.push(source);
      continue;
    }
    const lowerDate = addCalendarDays(from, -65);
    const upperDate = addCalendarDays(to, 65);
    const [fromYear, fromMonth] = lowerDate.split("-").map(Number);
    const [toYear, toMonth] = upperDate.split("-").map(Number);
    const baseMonth = Number(source.due.slice(5, 7));
    const first = fromYear * 12 + fromMonth - 1;
    const last = toYear * 12 + toMonth - 1;
    const dates = new Set<string>();
    for (let monthIndex = first; monthIndex <= last; monthIndex++) {
      const year = Math.floor(monthIndex / 12);
      const month = monthIndex % 12 + 1;
      if (frequency === "yearly" && baseMonth !== month) continue;
      dates.add(eventDateInMonth(source.due, year, month));
    }
    for (const originalDate of Object.keys(source.data?.eventOverrides || {}))
      dates.add(originalDate);
    for (const scheduled of dates) {
      if (scheduled < source.due || (source.data?.eventRepeatUntil && scheduled >= source.data.eventRepeatUntil)) continue;
      const change = source.data?.eventOverrides?.[scheduled];
      if (change?.canceled) continue;
      const event = applyOccurrence(source, scheduled, change);
      if (event.due <= to && eventFinish(event) >= from) output.push(event);
    }
  }
  return output.sort((a,b) => a.due.localeCompare(b.due) || (a.data?.time || "").localeCompare(b.data?.time || ""));
}

export function calendarDayMap(
  entries: Entry[], interval: {from: string; to: string},
): Map<string, Entry[]> {
  const result = new Map<string, Entry[]>();
  for (const entry of projectCalendarEntries(entries, interval)) {
    const start = entry.due > interval.from ? entry.due : interval.from;
    const end = eventFinish(entry) < interval.to ? eventFinish(entry) : interval.to;
    for (let day = start; day <= end; day = addCalendarDays(day, 1)) {
      const list = result.get(day) || [];
      list.push(entry);
      result.set(day, list);
    }
  }
  return result;
}

/** Scope a change to one date: keep the original series intact. */
export function withOccurrenceOverride(
  series: Entry, occurrence: Entry, changes: EventOccurrenceChanges,
): Entry {
  const date = occurrence.data?.eventOccurrenceDate || occurrence.due;
  return {
    ...series,
    data: {
      ...series.data,
      eventOverrides: {
        ...series.data?.eventOverrides,
        [date]: changes,
      },
    },
  };
}

/** Prepare a future-series split. The caller saves the new segment then updates the old. */
export function splitFutureSeries(
  source: Entry,
  occurrence: Entry,
  next: { title:string; detail:string; assignee:string; due:string; data:Entry["data"] },
): { original: Entry; future: {title:string;detail:string;assignee:string;due:string;done:boolean;kind:Entry["kind"];data:Entry["data"]} } {
  const boundary = occurrence.data?.eventOccurrenceDate || occurrence.due;
  const exceptions = source.data?.eventOverrides || {};
  const earlier = Object.fromEntries(Object.entries(exceptions).filter(([date]) => date < boundary));
  const later = Object.fromEntries(Object.entries(exceptions).filter(([date]) => date > boundary));
  return {
    original: {
      ...source,
      data: {...source.data, eventRepeatUntil: boundary, eventOverrides: earlier},
    },
    future: {
      kind: "event",
      title: next.title,
      detail: next.detail,
      assignee: next.assignee,
      due: next.due,
      done: false,
      data: {
        ...source.data,
        ...next.data,
        eventRepeatUntil: undefined,
        eventOverrides: later,
        eventOccurrenceDate: undefined,
        eventSourceId: undefined,
        eventAnchorDate: source.data?.eventAnchorDate || source.due,
      },
    },
  };
}
