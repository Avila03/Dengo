"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Repeat2,
  Clock3, Heart, Palette, Plus, Filter, Bell,
} from "lucide-react";
import { Shell } from "./shell";
import { TopicDots } from "./topic-dots";
import { EventQuickView } from "./event-quick-view";
import { eventDurationLabel } from "@/lib/calendar-anniversaries";
import { calendarTopics, calendarEntryColor, eventTopicLabel } from "@/lib/calendar-topics";
import { useDengo } from "./provider";
import { dayLabel, localToday } from "@/lib/model";
import { calendarEntries, calendarDayMap, eventDaysUntil } from "@/lib/calendar";
import { addCalendarDays, eventStartTimeLabel } from "@/lib/calendar-schedule";
import { todayEntries, addDaysISO, weekDates, calendarMonthDays, shiftMonth } from "@/lib/today";
import { money } from "@/lib/finance";
import { activeReminders } from "@/lib/payment-plans";
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
  return entry.kind === "expense" ? (entry.data?.paymentPlanVirtual ? "/compras?aba=pagamentos&sec=vencimentos" : "/compras?aba=gastos") : "/compromissos";
}

export function Home() {
  const { entries, busy, toggle, preferences } = useDengo();
  const today = localToday();
  const paymentReminders=activeReminders(entries,today);
  const topics = calendarTopics(preferences.calendarTopics);
  const [selected, setSelected] = useState(today);
  const [monthOpen, setMonthOpen] = useState(false);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [allVisible, setAllVisible] = useState(false);
  const [showTopicFilters, setShowTopicFilters] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [preview, setPreview] = useState<Entry | null>(null);
  const week = weekDates(selected);
  const visible = (entry: Entry) => selectedTopic === "all" ||
    (entry.kind === "event" && (
      entry.data?.topicId === selectedTopic ||
      (selectedTopic === "outros" && !topics.some((topic) => topic.id === entry.data?.topicId))
    ));
  const selectedItems = todayEntries(entries, selected).filter(visible);
  const todayItems = todayEntries(entries, today);
  const todayPending = todayItems.filter((entry) => !entry.done).length;
  const intervalDates = [today, week[0], week[6], selected, month + "-01",
    month + "-" + String(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()).padStart(2,"0")].sort();
  const allDays = calendarDayMap(entries, {
    from: intervalDates[0],
    to: intervalDates[intervalDates.length - 1],
  });
  const byDay = new Map<string, Entry[]>();
  for (const [date, events] of allDays)
    byDay.set(date, events.filter(visible));
  const nextSpecial = calendarEntries(entries, {from: today, to: addCalendarDays(today, 400)})
    .filter((entry) => entry.kind === "event" &&
      (entry.data?.eventRepeat === "monthly" || entry.data?.eventRepeat === "yearly") &&
      (entry.data?.eventCounter === "age" || entry.data?.eventCounter === "together" ||
       entry.data?.eventCounter === "elapsed"))
    .sort((a,b) => a.due.localeCompare(b.due))[0];
  const daysToSpecial = nextSpecial ? eventDaysUntil(today, nextSpecial.due) : 0;
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

      {paymentReminders.length>0 ? (
        <Link href="/compras?aba=pagamentos&sec=vencimentos" className="day-payment-alert">
          <Bell size={18}/>
          <span><strong>{paymentReminders.length} {paymentReminders.length===1?"pagamento":"pagamentos"}</strong>
            {" "}para conferir no Dengo</span>
          <ArrowRight size={17}/>
        </Link>
      ):null}
      {nextSpecial ? (
        <section className="day-countdown" aria-label="Próxima data especial">
          <Heart size={17} />
          <div><strong>{daysToSpecial === 0 ? "É hoje!" : daysToSpecial === 1 ? "Falta 1 dia" :
            "Faltam " + daysToSpecial + " dias"}</strong>
            <span> para {nextSpecial.title}</span>
            {eventDurationLabel(nextSpecial) ? <small> · {eventDurationLabel(nextSpecial)}</small> : null}
          </div>
          <button type="button" className="icon-btn" aria-label="Ver data especial"
            onClick={() => { chooseDay(nextSpecial.due); setPreview(nextSpecial); }}>
            <ArrowRight size={17} />
          </button>
        </section>
      ) : null}
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
              aria-label={dayNames[i] + ", " + dayLabel(date) + ", " + (byDay.get(date)?.length || 0) + " registros"}
              aria-pressed={date === selected}>
              <span>{dayNames[i]}</span>
              <strong>{Number(date.slice(-2))}</strong>
              <TopicDots entries={byDay.get(date) || []} topics={topics} />
            </button>
          ))}
        </div>
        <div className="day-calendar-foot">
          <button type="button" className="text-link day-month-toggle"
            aria-expanded={monthOpen} aria-controls="day-month-view"
            onClick={() => setMonthOpen((value) => !value)}>
            <CalendarDays size={16} /> {monthOpen ? "Ocultar mês" : "Ver mês"} <ChevronDown size={16} />
          </button>
          <Link href="/calendario?topicos=1" className="text-link">
            <Palette size={15} /> Tópicos
          </Link>
          <Link href={"/calendario?data=" + selected} className="text-link">
            Agenda completa <ArrowRight size={15} />
          </Link>
        </div>
        <div className="home-calendar-filter-toggle">
          <button type="button" className="text-link" aria-expanded={showTopicFilters}
            onClick={() => setShowTopicFilters(!showTopicFilters)}>
            <Filter size={14} /> {selectedTopic === "all" ? "Filtrar tópicos" :
              topics.find(t => t.id === selectedTopic)?.name || "Tópico"} 
          </button>
          {selectedTopic !== "all" ? <button type="button" className="text-link"
            onClick={() => setSelectedTopic("all")}>Limpar</button> : null}
        </div>
        {showTopicFilters ? (
          <div className="calendar-topic-filters" role="group" aria-label="Filtrar calendário">
            <button type="button" className={selectedTopic === "all" ? "selected" : ""}
              onClick={() => setSelectedTopic("all")}>Todos</button>
            {topics.map((topic) => (
              <button key={topic.id} type="button"
                className={selectedTopic === topic.id ? "selected" : ""}
                onClick={() => setSelectedTopic(topic.id)}>
                <i className="topic-legend-dot" style={{backgroundColor:topic.color}} /> {topic.name}
              </button>
            ))}
          </div>
        ) : null}
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
                  aria-label={dayLabel(date) + ", " + (byDay.get(date)?.length || 0) + " registros"} aria-pressed={date === selected}>
                  {Number(date.slice(-2))}
                  <TopicDots entries={byDay.get(date) || []} topics={topics} />
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
                <div className="day-agenda-time">{eventStartTimeLabel(entry, selected)}</div>
                <div className="day-agenda-detail">
                  {entry.kind === "event" ? (
                    <button type="button" className="day-agenda-title day-agenda-preview"
                      onClick={() => setPreview(entry)} aria-label={"Abrir detalhes de " + entry.title}>
                      <span className="day-entry-dot" style={{backgroundColor:calendarEntryColor(entry,topics)}} aria-hidden="true" />
                      {entry.title}
                    </button>
                  ) : (
                    <Link href={detailLink(entry)} className="day-agenda-title">
                      <span className="day-entry-dot" style={{backgroundColor:calendarEntryColor(entry,topics)}} aria-hidden="true" />
                      {entry.title}
                    </Link>
                  )}
                  <small>{entry.kind === "event" ? eventTopicLabel(entry, topics) : labelByKind[entry.kind]}
                    {entry.kind === "event" && entry.data?.eventRepeat &&
                      entry.data.eventRepeat !== "none" ? (
                        <span className="day-repeat-mark"><Repeat2 size={12} /> {entry.data.eventRepeat === "monthly" ? "Mensal" : "Anual"}</span>
                      ) : null}
                    {" · " + entry.assignee}
                    {entry.data?.location ? " · " + entry.data.location : ""}
                    {entry.kind === "expense" && entry.data?.amount ? " · " + money(entry.data.amount) : ""}
                  </small>
                  {eventDurationLabel(entry) ? (
                    <span className="day-anniversary-duration"><Repeat2 size={12} /> {eventDurationLabel(entry)}</span>
                  ) : null}
                </div>
                {entry.done ? <Check className="day-row-check" size={19} aria-label="Concluído" /> :
                  entry.data?.paymentPlanVirtual ? (
                    <Link href="/compras?aba=pagamentos&sec=vencimentos" className="icon-btn day-row-check"
                      aria-label={"Registrar pagamento de "+entry.title}><ArrowRight size={18}/></Link>
                  ) :
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
      {preview ? <EventQuickView key={preview.id} occurrence={preview}
        onClose={() => setPreview(null)} /> : null}
    </Shell>
  );
}
