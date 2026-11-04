import type { Entry } from "./model";

/** Preserva o dia de origem sempre que possível, mesmo depois de fevereiro. */
export function eventDateInMonth(anchor: string, year: number, month: number): string {
  const day = Number(anchor.slice(8, 10));
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return String(year).padStart(4, "0") + "-" +
    String(month).padStart(2, "0") + "-" +
    String(Math.min(day, last)).padStart(2, "0");
}

/**
 * Sem intervalo, mantém as entradas originais.
 * Com intervalo, projeta mensalidades/aniversários sem duplicar dados no banco.
 */
export function calendarEntries(
  entries: Entry[],
  interval?: { from: string; to: string },
): Entry[] {
  const dated = entries.filter(
    (entry) => entry.due && ["event", "task", "expense"].includes(entry.kind),
  );
  if (!interval) return dated;
  const { from, to } = interval;
  if (from > to) return [];
  const result: Entry[] = [];
  for (const entry of dated) {
    const repeat = entry.kind === "event" ? entry.data?.eventRepeat : undefined;
    if (repeat !== "monthly" && repeat !== "yearly") {
      if (entry.due >= from && entry.due <= to) result.push(entry);
      continue;
    }
    if (entry.due > to) continue;
    const [baseYear, baseMonth] = entry.due.split("-").map(Number);
    const [fromYear, fromMonth] = from.split("-").map(Number);
    const [toYear, toMonth] = to.split("-").map(Number);
    const lower = Math.max(baseYear * 12 + baseMonth - 1, fromYear * 12 + fromMonth - 1);
    const upper = toYear * 12 + toMonth - 1;
    for (let current = lower; current <= upper; current++) {
      const year = Math.floor(current / 12);
      const month = current % 12 + 1;
      if (repeat === "yearly" && month !== baseMonth) continue;
      const due = eventDateInMonth(entry.due, year, month);
      if (due < entry.due || due < from || due > to) continue;
      result.push(due === entry.due ? entry : {
        ...entry,
        id: entry.id + "::" + due,
        due,
        done: false,
        data: { ...entry.data, eventSourceId: entry.id },
      });
    }
  }
  return result;
}
function escapeICS(s: string) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}
export function eventICS(e: Entry) {
  const date = e.due.replaceAll("-", "");
  const time = e.data?.time?.replace(":", "");
  const start = time
    ? new Date(`${e.due}T${e.data!.time}:00-03:00`)
    : new Date(`${e.due}T12:00:00Z`);
  const end = new Date(start);
  if (time) end.setUTCHours(end.getUTCHours() + 1);
  else end.setUTCDate(end.getUTCDate() + 1);
  const utc = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dengo//PT-BR",
    "BEGIN:VEVENT",
    `UID:${e.id}@dengo`,
    `DTSTAMP:${utc(new Date())}`,
    time ? `DTSTART:${utc(start)}` : `DTSTART;VALUE=DATE:${date}`,
    time
      ? `DTEND:${utc(end)}`
      : `DTEND;VALUE=DATE:${end.toISOString().slice(0, 10).replaceAll("-", "")}`,
    `SUMMARY:${escapeICS(e.title)}`,
    `DESCRIPTION:${escapeICS(e.detail)}`,
    `LOCATION:${escapeICS(e.data?.location || "")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const encoder = new TextEncoder();
  return (
    lines
      .map((line) => {
        let out = "",
          part = "";
        for (const char of line) {
          if (encoder.encode(part + char).length > 75) {
            out += part + "\r\n";
            part = " ";
          }
          part += char;
        }
        return out + part;
      })
      .join("\r\n") + "\r\n"
  );
}

export function googleCalendarUrl(e: Entry) {
  const date = e.due.replaceAll("-", "");
  const time = e.data?.time?.replace(":", "");
  let dates = date + "/" + date;
  if (time) {
    const start = `${date}T${time}00`;
    const endDate = new Date(`${e.due}T${e.data!.time}:00-03:00`);
    endDate.setUTCHours(endDate.getUTCHours() + 1);
    const end = new Date(endDate.getTime() - 3 * 3600000)
      .toISOString()
      .replace(/[-:]/g, "")
      .slice(0, 15);
    dates = `${start}/${end}`;
  } else {
    const end = new Date(`${e.due}T12:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    dates = `${date}/${end.toISOString().slice(0, 10).replaceAll("-", "")}`;
  }
  return (
    "https://calendar.google.com/calendar/render?" +
    new URLSearchParams({
      action: "TEMPLATE",
      text: e.title,
      dates,
      details: e.detail,
      location: e.data?.location || "",
      ctz: "America/Sao_Paulo",
    })
  );
}
export function mapsUrl(address: string) {
  return (
    "https://www.google.com/maps/search/?" +
    new URLSearchParams({ api: "1", query: address })
  );
}
export function downloadFile(
  name: string,
  text: string,
  type = "text/calendar",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
