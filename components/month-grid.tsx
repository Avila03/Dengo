"use client";
import type { CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Entry } from "@/lib/model";
import { dayLabel } from "@/lib/model";
import type { CalendarTopic } from "@/lib/calendar-topics";
import { monthGrid } from "@/lib/calendar-view";

const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

/** Mês como página de agenda: faixas por compromisso, viagens contínuas, hoje circulado. */
export function MonthGrid({ month, entries, topics, today, selected, onSelect, onShift }: {
  month: string;
  entries: Entry[];
  topics: CalendarTopic[];
  today: string;
  selected: string;
  onSelect: (date: string) => void;
  onShift: (delta: number) => void;
}) {
  const [y, m] = month.split("-").map(Number);
  const title = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })
    .format(new Date(y, m - 1, 15)).replace(" de ", " ");
  const weeks = monthGrid(month, entries, topics);
  return (
    <section className="month-sheet" aria-label={"Calendário de " + title}>
      <div className="month-sheet-head">
        <button type="button" className="icon-btn" aria-label="Mês anterior" onClick={() => onShift(-1)}>
          <ChevronLeft size={20} />
        </button>
        <h2 className="month-sheet-title">{title}</h2>
        <button type="button" className="icon-btn" aria-label="Próximo mês" onClick={() => onShift(1)}>
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="month-sheet-weekdays" aria-hidden="true">
        {WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
      </div>
      {weeks.map((week) => (
        <div className="month-sheet-week" key={week[0].date}>
          {week.map((day) => (
            <button type="button" key={day.date}
              className={"month-sheet-day" + (day.inMonth ? "" : " is-outside") +
                (day.date === selected ? " is-selected" : "") + (day.date === today ? " is-today" : "")}
              aria-pressed={day.date === selected}
              aria-label={dayLabel(day.date) + (day.total ? `, ${day.total} ${day.total === 1 ? "registro" : "registros"}` : ", livre")}
              onClick={() => onSelect(day.date)}>
              <span className="month-sheet-num">{Number(day.date.slice(-2))}</span>
              {day.bars.map((bar) => (
                <span key={bar.entry.id + bar.entry.due}
                  className={"month-sheet-bar" + (bar.multi ? " is-multi" : "") +
                    (bar.segmentStart ? " is-start" : "") + (bar.segmentEnd ? " is-end" : "") +
                    (bar.entry.done ? " is-done" : "")}
                  style={{ "--bar": bar.color } as CSSProperties}>
                  {bar.label || " "}
                </span>
              ))}
              {day.more ? <span className="month-sheet-more">+{day.more}</span> : null}
            </button>
          ))}
        </div>
      ))}
    </section>
  );
}
