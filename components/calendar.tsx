"use client";
import { useState, type FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CalendarDays,
  Plus,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Pencil,
  Palette,
  Repeat2,
} from "lucide-react";
import { Shell } from "./shell";
import { EntryAudit } from "./entry-audit";
import { TopicManager } from "./topic-manager";
import { TopicDots } from "./topic-dots";
import { calendarTopics, calendarEntryColor, eventTopicLabel, EXPENSE_CALENDAR_COLOR, TASK_CALENDAR_COLOR } from "@/lib/calendar-topics";
import { PageHeading, DeleteButton } from "./ui";
import { useDengo } from "./provider";
import { type Entry, type Draft, localToday, dayLabel, isDate, addMonths } from "@/lib/model";
import {
  calendarEntries,
  eventICS,
  googleCalendarUrl,
  downloadFile,
} from "@/lib/calendar";
const labels = {
  task: "Tarefa",
  expense: "Conta",
  event: "Compromisso",
};
export function Calendar() {
  const { entries, names, busy, add, update, remove, preferences, saveCalendarTopics } = useDengo();
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
    [eventRepeat, setEventRepeat] = useState<"none" | "monthly" | "yearly">("none");
  const items = calendarEntries(entries, { from: month + "-01", to: month + "-31" });
  const byDay = new Map<string, Entry[]>();
  for (const entry of items) {
    const day = byDay.get(entry.due) || [];
    day.push(entry);
    byDay.set(entry.due, day);
  }
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, m - 1, 1).getDay();
  const days = new Date(y, m, 0).getDate();
  const daily = items
    .filter((e) => e.due === selected)
    .sort((a, b) => (a.data?.time || "").localeCompare(b.data?.time || ""));
  const upcoming = calendarEntries(entries, { from: today, to: addMonths(today, 12) })
    .filter((e) => !e.done)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 5);
  function shift(n: number) {
    const d = new Date(y, m - 1 + n, 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setMonth(next);
    setSelected(`${next}-01`);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const draft: Draft = {
      kind: "event",
      title: String(f.get("title") || "").trim(),
      detail: String(f.get("detail") || ""),
      assignee: String(f.get("assignee") || "Nós dois"),
      due: String(f.get("due")),
      done: editing?.done ?? false,
      data: {
        time: String(f.get("time") || ""),
        location: String(f.get("location") || ""),
        topicId: topics.some((topic) => topic.id === topicId) ? topicId : topics[0].id,
        eventRepeat,
        ...(source
          ? { sourceId: source.id, sourceKind: source.kind }
          : editing?.data?.sourceId
            ? {
                sourceId: editing.data.sourceId,
                sourceKind: editing.data.sourceKind,
              }
            : {}),
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
                  onChange={(e) => setEventRepeat(e.target.value as "none" | "monthly" | "yearly")}>
                  <option value="none">Não repetir</option>
                  <option value="monthly">Todo mês · mêsversário de namoro</option>
                  <option value="yearly">Todo ano · aniversários</option>
                </select>
              </span>
            </label>
            {eventRepeat !== "none" ? (
              <p className="helper full calendar-repeat-hint">
                {eventRepeat === "monthly"
                  ? "O Dengo marca essa data todos os meses. Se o dia não existir no mês, usa o último dia (ex.: 31/01 → 28/02)."
                  : "O Dengo marca essa data todos os anos. Para 29 de fevereiro, usa 28/02 nos anos não bissextos."}
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
            <label>
              Local opcional
              <input
                name="location"
                maxLength={240}
                defaultValue={
                  editing?.data?.location || source?.data?.address || ""
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
                <h3>{e.title}</h3>
                <p>
                  {e.data?.time || "Dia inteiro"} · {e.assignee}
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
                    <>
                      <button
                        className="icon-btn"
                        aria-label={`Editar ${e.data?.eventRepeat && e.data.eventRepeat !== "none" ? "série " : ""}${e.title}`}
                        onClick={() => {
                          setEditing(series);
                          setTopicId(series.data?.topicId || "outros");
                          setEventRepeat(series.data?.eventRepeat || "none");
                          setOpen(true);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                      <DeleteButton
                        label={e.data?.eventRepeat && e.data.eventRepeat !== "none" ? e.title + " (toda a série recorrente)" : e.title}
                        disabled={busy}
                        onDelete={() => void remove(series)}
                      />
                    </>
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
              <strong>{e.title}</strong>
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
    </Shell>
  );
}
