"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight,
  Clock3, Heart, Plus,
} from "lucide-react";
import { Shell } from "./shell";
import { useDengo } from "./provider";
import { dayLabel, localToday } from "@/lib/model";
import { calendarEntries } from "@/lib/calendar";
import { todayEntries, addDaysISO, weekDates, calendarMonthDays, shiftMonth } from "@/lib/today";
import { money } from "@/lib/finance";
import type { Entry } from "@/lib/model";

const dayNames = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const labelByKind: Record<string, string> = {
  event: "Evento",
  task: "Tarefa",
  expense: "Conta",
};
function detailLink(entry: Entry): string {
  if (entry.kind === "event") return "/calendario?data=" + entry.due;
  return entry.kind === "expense" ? "/compras?aba=gastos" : "/compromissos";
}

export function Home() {
  const { entries, busy, toggle, preferences } = useDengo();
  const today = localToday();
  const [selected, setSelected] = useState(today);
  const [monthOpen, setMonthOpen] = useState(false);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [allVisible, setAllVisible] = useState(false);
  const week = weekDates(selected);
  const selectedItems = todayEntries(entries, selected);
  const todayItems = todayEntries(entries, today);
  const todayPending = todayItems.filter((entry) => !entry.done).length;
  const datesWithPlans = new Set(calendarEntries(entries).map((entry) => entry.due));
  const displayed = allVisible ? selectedItems : selectedItems.slice(0, 3);
  const selectedIsToday = selected === today;
  const dateText = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long", day: "numeric", month: "long",
  }).format(new Date(today + "T12:00:00"));
  const monthTitle = new Intl.DateTimeFormat("pt-BR", {
    month: "long", year: "numeric",
  }).format(new Date(month + "-15T12:00:00"));

  function chooseDay(day: string) {
    setSelected(day);
    setMonth(day.slice(0, 7));
    setAllVisible(false);
  }
  return (
    <Shell>
      <section className="day-head">
        <div>
          <span className="eyebrow">NOSSA ROTINA, DO NOSSO JEITO</span>
          <h1>Nosso dia<span className="rose">.</span></h1>
          <p>{dateText}</p>
        </div>
        <Link href={"/calendario?data=" + today + "&novo=1"} className="primary day-add" aria-label="Adicionar compromisso ao calendário">
          <Plus size={18} /> <span>Adicionar</span>
        </Link>
      </section>

      <section className="day-status" aria-label="Resumo do dia">
        <span><Heart size={16} /> {preferences.names.join(" & ")}</span>
        <span>{todayItems.length} {todayItems.length === 1 ? "registro" : "registros"} hoje</span>
        <span><Clock3 size={15} /> {todayPending} {todayPending === 1 ? "pendente" : "pendentes"}</span>
      </section>

      <section className="panel day-calendar" aria-label="Calendário">
        <div className="day-calendar-top">
          <div>
            <span className="eyebrow">CALENDÁRIO</span>
            <h2>Esta semana</h2>
          </div>
          <div className="day-calendar-tools">
            <button type="button" className="icon-btn" aria-label="Semana anterior"
              onClick={() => chooseDay(addDaysISO(selected, -7))}><ChevronLeft size={19} /></button>
            <button type="button" className="day-today-button" onClick={() => chooseDay(today)}>Hoje</button>
            <button type="button" className="icon-btn" aria-label="Próxima semana"
              onClick={() => chooseDay(addDaysISO(selected, 7))}><ChevronRight size={19} /></button>
          </div>
        </div>
        <div className="day-week-grid" role="group" aria-label="Selecione um dia da semana">
          {week.map((date, i) => (
            <button type="button" key={date} onClick={() => chooseDay(date)}
              className={"day-week-day" +
                (date === today ? " today" : "") + (date === selected ? " selected" : "")}
              aria-label={dayNames[i] + ", " + dayLabel(date)}
              aria-pressed={date === selected}>
              <span>{dayNames[i]}</span>
              <strong>{Number(date.slice(-2))}</strong>
              <i className={datesWithPlans.has(date) ? "day-has-plan" : ""} aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className="day-calendar-foot">
          <button type="button" className="text-link day-month-toggle"
            aria-expanded={monthOpen} aria-controls="day-month-view"
            onClick={() => setMonthOpen((value) => !value)}>
            <CalendarDays size={16} /> {monthOpen ? "Ocultar mês" : "Ver mês"} <ChevronDown size={16} />
          </button>
          <Link href={"/calendario?data=" + selected} className="text-link">
            Agenda completa <ArrowRight size={15} />
          </Link>
        </div>
        {monthOpen ? (
          <div className="day-month" id="day-month-view">
            <div className="day-month-header">
              <button type="button" className="icon-btn" aria-label="Mês anterior"
                onClick={() => setMonth((value) => shiftMonth(value, -1))}><ChevronLeft size={19} /></button>
              <strong>{monthTitle}</strong>
              <button type="button" className="icon-btn" aria-label="Próximo mês"
                onClick={() => setMonth((value) => shiftMonth(value, 1))}><ChevronRight size={19} /></button>
            </div>
            <div className="day-month-grid">
              {weekdays.map((name) => <span className="day-month-weekday" key={name}>{name}</span>)}
              {calendarMonthDays(month).map((date, index) => date ? (
                <button type="button" key={date} onClick={() => chooseDay(date)}
                  className={"day-month-cell" +
                    (date === today ? " today" : "") +
                    (date === selected ? " selected" : "")}
                  aria-label={dayLabel(date)} aria-pressed={date === selected}>
                  {Number(date.slice(-2))}
                  {datesWithPlans.has(date) ? <i aria-hidden="true" /> : null}
                </button>
              ) : <span key={"empty-" + index} aria-hidden="true" />)}
            </div>
          </div>
        ) : null}
      </section>

      <section className="panel day-agenda">
        <div className="day-agenda-top">
          <div>
            <span className="eyebrow">{selectedIsToday ? "RESUMO DE HOJE" : "DIA SELECIONADO"}</span>
            <h2>{selectedIsToday ? "Para hoje" : dayLabel(selected)}</h2>
          </div>
          <Link className="text-link" href={"/calendario?data=" + selected + "&novo=1"}>
            <Plus size={16} /> Marcar
          </Link>
        </div>
        {displayed.length ? (
          <div className="day-agenda-list">
            {displayed.map((entry) => (
              <article className={"day-agenda-row" + (entry.done ? " done" : "")} key={entry.id}>
                <div className="day-agenda-time">{entry.data?.time || "Dia todo"}</div>
                <div className="day-agenda-detail">
                  <Link href={detailLink(entry)} className="day-agenda-title">{entry.title}</Link>
                  <small>{labelByKind[entry.kind]} · {entry.assignee}
                    {entry.data?.location ? " · " + entry.data.location : ""}
                    {entry.kind === "expense" && entry.data?.amount ? " · " + money(entry.data.amount) : ""}
                  </small>
                </div>
                {entry.done ? <Check className="day-row-check" size={19} aria-label="Concluído" /> :
                  entry.kind === "task" || entry.kind === "expense" ? (
                    <button type="button" className="icon-btn day-row-check"
                      disabled={busy} aria-label={entry.kind === "expense" ? "Marcar pagamento de " + entry.title : "Concluir " + entry.title}
                      onClick={() => void toggle(entry)}><Check size={18} /></button>
                  ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="day-agenda-empty">
            <Heart size={21} />
            <span>{selectedIsToday ? "Nada marcado para hoje. Aproveitem o dia!" : "Nenhum compromisso nesse dia."}</span>
          </div>
        )}
        {selectedItems.length > 3 ? (
          <button type="button" className="day-show-all" onClick={() => setAllVisible((value) => !value)}>
            {allVisible ? "Mostrar menos" : "Ver mais " + (selectedItems.length - 3) + " registros"}
            <ChevronDown size={16} />
          </button>
        ) : null}
      </section>
    </Shell>
  );
}
