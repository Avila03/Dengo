"use client";
import { useState, useEffect, type FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CalendarDays,
  Plus,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Pencil,
  Filter,
  Palette,
  Repeat2,
} from "lucide-react";
import { Shell } from "./shell";
import { CleanSheet } from "./clean-sheet";
import { eventDurationLabel, type EventCounter } from "@/lib/calendar-anniversaries";
import { EntryAudit } from "./entry-audit";
import { TopicManager } from "./topic-manager";
import { EventQuickView } from "./event-quick-view";
import { TopicDots } from "./topic-dots";
import { calendarTopics, calendarEntryColor, eventTopicLabel, EXPENSE_CALENDAR_COLOR, TASK_CALENDAR_COLOR } from "@/lib/calendar-topics";
import { PageHeading } from "./ui";
import { useDengo } from "./provider";
import { type Entry, type Draft, localToday, dayLabel, isDate, addMonths } from "@/lib/model";
import {
  calendarEntries,
  eventICS,
  googleCalendarUrl,
  downloadFile,
  calendarDayMap,
  eventRangeLabel,
} from "@/lib/calendar";
const labels = {
  task: "Tarefa",
  expense: "Conta",
  event: "Compromisso",
};
export function Calendar() {
  const { entries, names, busy, add, update, preferences, saveCalendarTopics } = useDengo();
  const search = useSearchParams();
  const router = useRouter();
  const source = entries.find((e) => e.id === search.get("origem"));
  const topics = calendarTopics(preferences.calendarTopics);
  const today = localToday();
  const wantedDate = search.get("data");
  const initialDate = wantedDate && isDate(wantedDate) ? wantedDate : today;
  const [month, setMonth] = useState(initialDate.slice(0, 7)),
    [selected, setSelected] = useState(initialDate),
    [open, setOpen] = useState(!!source || search.get("novo") === "1"),
    [editing, setEditing] = useState<Entry | null>(null),
    [manageTopics, setManageTopics] = useState(search.get("topicos") === "1"),
    [topicId, setTopicId] = useState(source?.kind === "movie" ? "filmes" :
      source?.kind === "place" ? "passeio" : "janta"),
    [eventRepeat, setEventRepeat] = useState<"none" | "monthly" | "yearly">("none"),
    [eventCounter, setEventCounter] = useState<EventCounter>("elapsed"),
    [linkedSourceId, setLinkedSourceId] = useState(source?.id || ""),
    [topicFilter, setTopicFilter] = useState("all"),
    [showFilters, setShowFilters] = useState(false),
    [preview, setPreview] = useState<Entry | null>(null);
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, m - 1, 1).getDay();
  const days = new Date(y, m, 0).getDate();
  const monthInterval = { from: month + "-01", to: month + "-" + String(days).padStart(2, "0") };
  const filterEntries = (records: Entry[]) => topicFilter === "all"
    ? records
    : records.filter((entry) => entry.kind === "event" && (
      entry.data?.topicId === topicFilter ||
      (topicFilter === "outros" && !topics.some((t) => t.id === entry.data?.topicId))
    ));
  const unfilteredDays = calendarDayMap(entries, monthInterval);
  const byDay = new Map<string, Entry[]>();
  for (const [date, dayItems] of unfilteredDays)
    byDay.set(date, filterEntries(dayItems));
  const daily = (byDay.get(selected) || [])
    .sort((a, b) => (a.data?.time || "").localeCompare(b.data?.time || ""));
  const upcoming = filterEntries(calendarEntries(entries, { from: today, to: addMonths(today, 12) }))
    .filter((entry) => !entry.done)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 5);
  useEffect(() => {
    if (!source) return;
    setLinkedSourceId(source.id);
    setOpen(true);
    setTopicId(source.kind === "movie" ? "filmes" : "passeio");
  }, [source?.id]);
  function shift(n: number) {
    const d = new Date(y, m - 1 + n, 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setMonth(next);
    setSelected(`${next}-01`);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const chosen = entries.find((entry) =>
      (entry.kind === "place" || entry.kind === "movie") && entry.id === linkedSourceId);
    const draft: Draft = {
      kind: "event",
      title: String(f.get("title") || "").trim(),
      detail: String(f.get("detail") || ""),
      assignee: String(f.get("assignee") || "Nós dois"),
      due: String(f.get("due")),
      done: editing?.done ?? false,
      data: {
        time: String(f.get("time") || ""),
        endTime: String(f.get("endTime") || ""),
        endDate: String(f.get("endDate") || ""),
        location: String(f.get("location") || "") || (chosen?.kind === "place" ? chosen.data?.address || "" : ""),
        topicId: topics.some((topic) => topic.id === topicId) ? topicId : topics[0].id,
        eventRepeat,
        eventCounter: eventRepeat === "none" ? "off" : eventCounter,
        sourceId: chosen?.id || "",
        sourceKind: chosen?.kind,
      },
    };
    if (await (editing ? update(editing, draft) : add(draft))) {
      setOpen(false);
      if (search.has("origem") || search.has("novo"))
        router.replace("/calendario?data=" + draft.due, { scroll: false });
      setEditing(null);
      setSelected(draft.due);
      setMonth(draft.due.slice(0, 7));
    }
  }
  return (
    <Shell>
      <PageHeading
        eyebrow="TEMPO PARA O QUE IMPORTA"
        title="Nosso calendário"
        description="Encontros, compromissos com data e contas marcadas no calendário."
      >
        <button type="button" className="secondary" aria-expanded={manageTopics}
          onClick={() => setManageTopics((value) => !value)}>
          <Palette size={17} /> {manageTopics ? "Fechar tópicos" : "Tópicos e cores"}
        </button>
        <button
          className="primary"
          onClick={() => {
            setOpen(!open);
            setEditing(null);
            setTopicId("janta");
            setEventRepeat("none");
            setEventCounter("elapsed");
            setLinkedSourceId("");
          }}
        >
          <Plus size={18} />
          {open ? "Fechar" : "Novo compromisso"}
        </button>
      </PageHeading>
      {manageTopics ? (
        <TopicManager key={topics.map((topic) => topic.id + topic.name + topic.color).join("|")}
          topics={topics} busy={busy} onSave={saveCalendarTopics} />
      ) : null}
      {open ? (
        <CleanSheet title={editing ? "Editar compromisso" : "Novo compromisso"}
          onClose={() => {setOpen(false);setEditing(null);}}>
        <form
          className="panel entry-form"
          key={editing?.id || source?.id || "new"}
          onSubmit={submit}
        >
          <h2>
            {editing
              ? "Editar compromisso"
              : source
                ? `Planejar: ${source.title}`
                : "Um tempo reservado para nós"}
          </h2>
          {editing?.data?.eventRepeat && editing.data.eventRepeat !== "none" ? (
            <p className="helper calendar-repeat-series">Você está editando uma série recorrente. As mudanças valem para todas as datas dessa série.</p>
          ) : null}
          <div className="form-grid">
            <label className="full">
              Título
              <input
                name="title"
                required
                maxLength={120}
                defaultValue={
                  editing?.title ||
                  (source?.kind === "movie"
                    ? `Assistir: ${source.title}`
                    : source?.title) ||
                  ""
                }
              />
            </label>
            <label>
              Data
              <input
                name="due"
                type="date"
                required
                defaultValue={editing?.due || selected}
              />
            </label>
            <label>
              Data de término (opcional)
              <input name="endDate" type="date" defaultValue={editing?.data?.endDate || ""} />
            </label>
            <label>
              Tópico
              <span className="topic-select">
                <span className="topic-legend-dot" style={{
                  backgroundColor: topics.find((topic) => topic.id === topicId)?.color || topics[0].color,
                }} />
                <select name="topicId" value={topics.some((topic) => topic.id === topicId) ? topicId : topics[0].id}
                  onChange={(event) => setTopicId(event.target.value)}>
                  {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
                </select>
              </span>
            </label>
            <label>
              Repetir esta data
              <span className="calendar-repeat-select">
                <Repeat2 size={17} />
                <select name="eventRepeat" value={eventRepeat}
                  onChange={(e) => {
                    const repeat = e.target.value as "none" | "monthly" | "yearly";
                    setEventRepeat(repeat);
                    if (!editing) setEventCounter(repeat === "monthly" ? "together" : repeat === "yearly" ? "age" : "elapsed");
                  }}>
                  <option value="none">Não repetir</option>
                  <option value="monthly">Todo mês · mêsversário de namoro</option>
                  <option value="yearly">Todo ano · aniversários</option>
                </select>
              </span>
            </label>
            {eventRepeat !== "none" ? (
              <label className="full">
                Como mostrar o tempo desde a data inicial?
                <select name="eventCounter" value={eventCounter}
                  onChange={(e) => setEventCounter(e.target.value as EventCounter)}>
                  <option value="together">Tempo juntos — 2 anos e 3 meses juntos</option>
                  <option value="elapsed">Tempo decorrido — Há 2 anos e 3 meses</option>
                  <option value="age">Idade — 25 anos de idade</option>
                  <option value="off">Não mostrar contagem</option>
                </select>
              </label>
            ) : null}
            {eventRepeat !== "none" ? (
              <p className="helper full calendar-repeat-hint">
                {eventRepeat === "monthly"
                  ? "O Dengo marca essa data todos os meses. Informe a data REAL em que o relacionamento começou para contar os anos e meses juntos. Se o dia não existir no mês, usa o último dia (ex.: 31/01 → 28/02)."
                  : "O Dengo marca essa data todos os anos. Para mostrar a idade, informe a data de nascimento com o ano original. Para 29 de fevereiro, usa 28/02 nos anos não bissextos."}
              </p>
            ) : null}
            <label>
              Horário opcional (Brasília)
              <input
                name="time"
                type="time"
                defaultValue={editing?.data?.time}
              />
            </label>
            <label>
              Horário de término (opcional)
              <input name="endTime" type="time" defaultValue={editing?.data?.endTime || ""} />
            </label>
            <label>
              Participantes
              <select
                name="assignee"
                defaultValue={editing?.assignee || "Nós dois"}
              >
                {["Nós dois", ...names].map((n, i) => (
                  <option key={i}>{n}</option>
                ))}
              </select>
            </label>
            <label className="full">
              Vincular a um lugar, filme ou série do Dengo
              <select value={linkedSourceId} onChange={(event) => setLinkedSourceId(event.target.value)}>
                <option value="">Sem vínculo</option>
                {entries.filter((entry) => entry.kind === "place" || entry.kind === "movie")
                  .map((entry) => <option value={entry.id} key={entry.id}>
                    {entry.kind === "place" ? "Lugar · " : "Filme/série · "}{entry.title}
                  </option>)}
              </select>
            </label>
            <label>
              Local opcional
              <input
                name="location"
                maxLength={240}
                defaultValue={
                  editing?.data?.location || entries.find((entry) => entry.id === linkedSourceId)?.data?.address || ""
                }
              />
            </label>
            <label className="full">
              Observação opcional
              <input
                name="detail"
                maxLength={240}
                defaultValue={editing?.detail}
              />
            </label>
          </div>
          <button className="primary" disabled={busy}>
            {busy ? "Salvando…" : "Salvar compromisso"}
          </button>
        </form>
        </CleanSheet>
      ) : null}
      <div className="calendar-filter-bar">
        <button type="button" className="secondary" aria-expanded={showFilters}
          onClick={() => setShowFilters((value) => !value)}>
          <Filter size={16} /> {topicFilter === "all" ? "Filtrar por tópico" : "Filtro: " + (topics.find(t => t.id === topicFilter)?.name || "Outros")}
        </button>
        {topicFilter !== "all" ? (
          <button type="button" className="text-link" onClick={() => setTopicFilter("all")}>Limpar</button>
        ) : null}
      </div>
      {showFilters ? (
        <div className="calendar-topic-filters" role="group" aria-label="Filtrar por tópico">
          <button type="button" className={topicFilter === "all" ? "selected" : ""}
            onClick={() => setTopicFilter("all")}>Todos</button>
          {topics.map((topic) => (
            <button type="button" key={topic.id}
              className={topicFilter === topic.id ? "selected" : ""}
              onClick={() => setTopicFilter(topic.id)}>
              <i className="topic-legend-dot" style={{backgroundColor: topic.color}} />{topic.name}
            </button>
          ))}
        </div>
      ) : null}
      <div className="calendar-layout">
        <section className="panel">
          <div className="section-title">
            <h2 className="month-title">
              {new Intl.DateTimeFormat("pt-BR", {
                month: "long",
                year: "numeric",
              }).format(new Date(y, m - 1, 15))}
            </h2>
            <div className="row-actions">
              <button
                className="icon-btn"
                aria-label="Mês anterior"
                onClick={() => shift(-1)}
              >
                <ChevronLeft />
              </button>
              <button
                className="icon-btn"
                aria-label="Próximo mês"
                onClick={() => shift(1)}
              >
                <ChevronRight />
              </button>
            </div>
          </div>
          <div className="calendar-grid">
            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
              <span key={`day-${i}`} className="weekday">
                {d}
              </span>
            ))}
            {Array.from({ length: start }, (_, i) => (
              <span key={`empty-${i}`} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const date = `${month}-${String(i + 1).padStart(2, "0")}`;
              const dayEntries = byDay.get(date) || [];
              const count = dayEntries.length;
              return (
                <button
                  key={date}
                  className={`calendar-day ${selected === date ? "selected" : ""} ${date === today ? "today" : ""}`}
                  aria-pressed={selected === date}
                  aria-label={`${dayLabel(date)}, ${count} registros`}
                  onClick={() => setSelected(date)}
                >
                  {i + 1}
                  <TopicDots entries={dayEntries} topics={topics} />
                </button>
              );
            })}
          </div>
          <div className="calendar-legend topics-legend" aria-label="Legenda de cores">
            {topics.map((topic) => (
              <span key={topic.id}>
                <i className="topic-legend-dot" style={{ backgroundColor: topic.color }} /> {topic.name}
              </span>
            ))}
            <span><i className="topic-legend-dot" style={{ backgroundColor: TASK_CALENDAR_COLOR }} /> Tarefas</span>
            <span><i className="topic-legend-dot" style={{ backgroundColor: EXPENSE_CALENDAR_COLOR }} /> Contas</span>
          </div>
        </section>
        <section className="panel">
          <div className="section-title">
            <h2>{dayLabel(selected)}</h2>
            <button
              className="icon-btn"
              aria-label="Adicionar compromisso nesta data"
              onClick={() => {
                setOpen(true);
                setEditing(null);
                setTopicId("janta");
                setEventRepeat("none");
                setEventCounter("elapsed");
                setLinkedSourceId("");
              }}
            >
              <Plus />
            </button>
          </div>
          {daily.length ? (
            daily.map((e) => {
              const series = e.data?.eventSourceId
                ? entries.find((sourceEntry) => sourceEntry.id === e.data?.eventSourceId) || e
                : e;
              return (
              <article className="agenda-item" key={e.id}>
                <span className="tag">
                  <i className="topic-legend-dot" style={{ backgroundColor: calendarEntryColor(e, topics) }} />
                  {e.kind === "event" ? eventTopicLabel(e, topics) : labels[e.kind as keyof typeof labels]}
                  {e.done ? " · Concluído" : ""}
                  {e.kind === "event" && e.data?.eventRepeat && e.data.eventRepeat !== "none" ? (
                    <span className="calendar-repeat-tag"><Repeat2 size={12} /> {e.data.eventRepeat === "monthly" ? "Mensal" : "Anual"}</span>
                  ) : null}
                </span>
                {e.kind === "event" ? (
                  <button type="button" className="calendar-event-title"
                    onClick={() => setPreview(e)} aria-label={"Ver detalhes de " + e.title}>
                    <h3>{e.title}</h3>
                  </button>
                ) : <h3>{e.title}</h3>}
                {eventDurationLabel(e) ? (
                  <p className="event-duration"><Repeat2 size={15} /> {eventDurationLabel(e)}</p>
                ) : null}
                <p>
                  {eventRangeLabel(e, selected)} · {e.assignee}
                </p>
                {e.data?.location ? <p>{e.data.location}</p> : null}
                <EntryAudit entry={series} />
                <div className="row-actions">
                  <a
                    className="text-link"
                    href={googleCalendarUrl(e)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google Agenda <ExternalLink size={13} />
                  </a>
                  <button
                    className="icon-btn"
                    aria-label={`Baixar ${e.title} no calendário`}
                    onClick={() =>
                      downloadFile("dengo-compromisso.ics", eventICS(e))
                    }
                  >
                    <Download size={16} />
                  </button>
                  {e.kind === "event" ? (
                    <button type="button" className="secondary calendar-quick-button"
                      onClick={() => setPreview(e)}>
                      <Pencil size={15} /> Detalhes / editar
                    </button>
                  ) : null}
                </div>
              </article>
              );
            })
          ) : (
            <div className="empty">
              <CalendarDays />
              <h3>Um espaço livre no dia.</h3>
              <p>Que tal reservar um momento para vocês?</p>
            </div>
          )}
        </section>
      </div>
      <section className="panel setup-note">
        <h2>Vem por aí</h2>
        {upcoming.length ? (
          upcoming.map((e) => (
            <button
              className="upcoming-row"
              key={e.id}
              onClick={() => {
                setSelected(e.due);
                setMonth(e.due.slice(0, 7));
              }}
            >
              <span>{dayLabel(e.due)}</span>
              <strong>{e.title}{eventDurationLabel(e) ? <small className="event-duration-preview"> · {eventDurationLabel(e)}</small> : null}</strong>
              <span>{e.assignee}</span>
            </button>
          ))
        ) : (
          <p>Nenhum plano pendente a partir de hoje.</p>
        )}
        <p className="helper">
          Google Agenda abre um evento para você confirmar. O arquivo .ics pode
          ser importado em outros calendários. Alterações posteriores no Dengo
          não são sincronizadas automaticamente.
        </p>
      </section>
      {preview ? <EventQuickView key={preview.id} occurrence={preview}
        onClose={() => setPreview(null)} /> : null}
    </Shell>
  );
}
