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
  Filter,
  Repeat2,
} from "lucide-react";
import { Shell } from "./shell";
import { CleanSheet } from "./clean-sheet";
import { eventDurationLabel } from "@/lib/calendar-anniversaries";
import { EventFields } from "./event-fields";
import { eventDataFromForm, type EventFormValues } from "@/lib/event-form";
import { EntryAudit } from "./entry-audit";
import { TopicManager } from "./topic-manager";
import { EventQuickView } from "./event-quick-view";
import { TopicDots } from "./topic-dots";
import { calendarTopics, calendarEntryColor, eventTopicLabel, EXPENSE_CALENDAR_COLOR, TASK_CALENDAR_COLOR } from "@/lib/calendar-topics";
import { PageHeading } from "./ui";
import { useDengo } from "./provider";
import { type Entry, type Draft, localToday, dayLabel, isDate, addMonths, validateDraft } from "@/lib/model";
import {
  calendarEntries,
  eventICS,
  googleCalendarUrl,
  downloadFile,
  calendarDayMap,
  eventRangeLabel,
} from "@/lib/calendar";
const labels = {
  task: "Responsabilidade",
  expense: "Conta",
  event: "Compromisso",
};
export function Calendar() {
  const { entries, names, busy, add, preferences, saveCalendarTopics } = useDengo();
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
    [manageTopics, setManageTopics] = useState(search.get("topicos") === "1"),
    [formError, setFormError] = useState(""),
    [form, setForm] = useState<EventFormValues>(() => newForm(initialDate)),
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
  function newForm(date: string): EventFormValues {
    return {
      title: source?.kind === "movie" ? `Assistir: ${source.title}` : source?.title || "",
      due: date, endDate: "", time: "", detail: "", assignee: "Nós dois",
      placeId: source?.kind === "place" ? source.id : "", location: "",
      topicId: source?.kind === "movie" ? "filmes" : source?.kind === "place" ? "passeio" : topics[0].id,
      repeat: "none", counter: "off",
    };
  }
  function openNew() {
    setForm(newForm(selected)); setFormError(""); setOpen(true);
  }
  function shift(n: number) {
    const d = new Date(y, m - 1 + n, 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setMonth(next);
    setSelected(`${next}-01`);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const draft: Draft = {
      kind: "event", title: form.title.trim(), detail: form.detail.trim(),
      due: form.due, assignee: form.assignee, done: false,
      data: eventDataFromForm(form, entries, {
        sourceId: source?.id || "", sourceKind: source?.kind,
      }),
    };
    try { validateDraft(draft); }
    catch (cause) { setFormError(cause instanceof Error ? cause.message : "Confira os dados."); return; }
    if (await add(draft)) {
      setOpen(false);
      if (search.has("origem") || search.has("novo"))
        router.replace("/calendario?data=" + draft.due, { scroll: false });
      setSelected(draft.due); setMonth(draft.due.slice(0, 7));
    } else setFormError("Não foi possível salvar. Confira as datas e tente novamente.");
  }

  return (
    <Shell>
      <PageHeading
        eyebrow="TEMPO PARA O QUE IMPORTA"
        title="Nosso calendário"
        description="Encontros, compromissos com data e contas marcadas no calendário."
      >
        <button className="primary" onClick={openNew}>
          <Plus size={18} /> Novo compromisso
        </button>
      </PageHeading>
      {open ? (
        <CleanSheet title="Novo compromisso" onClose={() => setOpen(false)}>
          <form className="panel entry-form" onSubmit={submit}>
            <EventFields values={form} onChange={setForm} topics={topics} entries={entries} names={names} />
            {formError ? <p className="error" role="alert">{formError}</p> : null}
            <button className="primary" disabled={busy}>{busy ? "Salvando…" : "Salvar compromisso"}</button>
          </form>
        </CleanSheet>
      ) : null}
      <div className="calendar-filter-bar">
        <button type="button" className="secondary" aria-expanded={showFilters}
          onClick={() => setShowFilters((value) => !value)}>
          <Filter size={16} /> {topicFilter === "all" ? "Filtrar por categoria" : "Filtro: " + (topics.find(t => t.id === topicFilter)?.name || "Outros")}
        </button>
        {topicFilter !== "all" ? (
          <button type="button" className="text-link" onClick={() => setTopicFilter("all")}>Limpar</button>
        ) : null}
      </div>
      {showFilters ? (
        <div className="calendar-topic-filters" role="group" aria-label="Filtrar por categoria">
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
          <details className="clean-calendar-legend">
            <summary>Legenda de cores</summary>
            <div className="calendar-legend topics-legend" aria-label="Legenda de cores">
            {topics.map((topic) => (
              <span key={topic.id}>
                <i className="topic-legend-dot" style={{ backgroundColor: topic.color }} /> {topic.name}
              </span>
            ))}
            <span><i className="topic-legend-dot" style={{ backgroundColor: TASK_CALENDAR_COLOR }} /> Responsabilidades</span>
            <span><i className="topic-legend-dot" style={{ backgroundColor: EXPENSE_CALENDAR_COLOR }} /> Contas</span>
            </div>
          </details>
        </section>
        <section className="panel">
          <div className="section-title">
            <h2>{dayLabel(selected)}</h2>
            <button
              className="icon-btn"
              aria-label="Adicionar compromisso nesta data"
              onClick={openNew}
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
                    <span className="calendar-repeat-tag"><Repeat2 size={12} /> {e.data.eventRepeat === "weekly" ? "Semanal" : e.data.eventRepeat === "monthly" ? "Mensal" : "Anual"}</span>
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
      <details className="clean-calendar-upcoming">
        <summary>Próximos compromissos <span className="clean-summary-count">{upcoming.length}</span></summary>
        <div className="panel clean-upcoming-content">
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
        <details className="clean-calendar-help">
          <summary>Sobre a exportação para outros calendários</summary>
          <p className="helper">
            Google Agenda abre um evento para você confirmar. O arquivo .ics pode
            ser importado em outros calendários. Alterações posteriores no Dengo
            não são sincronizadas automaticamente.
          </p>
        </details>
        </div>
      </details>
      <section className="calendar-categories" id="calendar-categories">
        <button type="button" className="secondary" aria-expanded={manageTopics}
          aria-controls="calendar-category-editor" onClick={() => setManageTopics((value) => !value)}>
          <Plus size={17} /> {manageTopics ? "Fechar categorias" : "Adicionar categoria"}
        </button>
        {manageTopics ? <div id="calendar-category-editor">
          <TopicManager key={topics.map((topic) => topic.id + topic.name + topic.color).join("|")}
            topics={topics} busy={busy} onSave={saveCalendarTopics} />
        </div> : null}
      </section>
      {preview ? <EventQuickView key={preview.id} occurrence={preview}
        onClose={() => setPreview(null)} /> : null}
    </Shell>
  );
}
