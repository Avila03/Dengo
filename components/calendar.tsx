"use client";
import { useState, useEffect, useRef, type CSSProperties, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Repeat2, Settings2 } from "lucide-react";
import { Shell } from "./shell";
import { CleanSheet } from "./clean-sheet";
import { EventFields } from "./event-fields";
import { eventDataFromForm, type EventFormValues } from "@/lib/event-form";
import { EventQuickView } from "./event-quick-view";
import { MonthGrid } from "./month-grid";
import { calendarTopics } from "@/lib/calendar-topics";
import { useDengo } from "./provider";
import { type Entry, type Draft, TOGETHER, localToday, isDate, validateDraft, penOf } from "@/lib/model";
import { calendarEntries } from "@/lib/calendar";
import { eventDurationLabel } from "@/lib/calendar-anniversaries";
import {
  calendarCategories, categoryOf, dayEntries, dayTimeLabel, daysAwayLabel,
  nextDates, upcomingGroups, visibleEntries,
} from "@/lib/calendar-view";

const KIND_LABEL: Record<string, string> = { task: "Combinado", expense: "Conta", event: "Compromisso" };
const WEEKDAY_SHORT = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const MONTH_SHORT = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const longDay = (date: string) => new Intl.DateTimeFormat("pt-BR", {
  weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
}).format(new Date(date + "T12:00:00Z"));

export function Calendar() {
  const { entries, names, busy, add, preferences } = useDengo();
  const search = useSearchParams();
  const router = useRouter();
  const source = entries.find((e) => e.id === search.get("origem"));
  const topics = calendarTopics(preferences.calendarTopics);
  const categories = calendarCategories(topics);
  const today = localToday();
  const wantedDate = search.get("data");
  const initialDate = wantedDate && isDate(wantedDate) ? wantedDate : today;
  const [month, setMonth] = useState(initialDate.slice(0, 7)),
    [selected, setSelected] = useState(initialDate),
    [view, setView] = useState<"month" | "upcoming">("month"),
    [hidden, setHidden] = useState<Set<string>>(() => new Set()),
    [open, setOpen] = useState(!!source || search.get("novo") === "1"),
    [formError, setFormError] = useState(""),
    [form, setForm] = useState<EventFormValues>(() => newForm(initialDate)),
    [preview, setPreview] = useState<Entry | null>(null);

  // Filtra os registros de origem (inclusive assinaturas e parcelas, que geram as contas);
  // recorrências e parcelas são projetadas depois, dentro de cada consulta.
  const shown = visibleEntries(entries, topics, hidden);
  const daily = dayEntries(selected, shown);
  const upcomingNext = nextDates(shown, today, 3).map((n) => n.entry);
  const groups = upcomingGroups(shown, today);

  const notificationOpened = useRef(false);
  const notificationEvent = search.get("evento");
  useEffect(() => {
    if (notificationOpened.current || !notificationEvent) return;
    const entry = calendarEntries(entries, { from: initialDate, to: initialDate })
      .find((item) => item.id === notificationEvent && item.kind === "event");
    if (entry) { notificationOpened.current = true; setPreview(entry); }
  }, [entries, notificationEvent, initialDate]);
  // Link antigo "Editar categorias" do calendário: hoje elas ficam nas Configurações.
  useEffect(() => {
    if (search.get("topicos") === "1") router.replace("/configuracoes#categorias");
  }, [search, router]);

  function newForm(date: string): EventFormValues {
    return {
      title: source?.kind === "movie" ? `Assistir: ${source.title}` : source?.title || "",
      due: date, endDate: "", endTime: "", time: "", detail: "", assignee: TOGETHER,
      placeId: source?.kind === "place" ? source.id : "", location: "",
      topicId: source?.kind === "movie" ? "filmes" : source?.kind === "place" ? "passeio" : topics[0].id,
      repeat: "none", counter: "off",
    };
  }
  function openNew() { setForm(newForm(selected)); setFormError(""); setOpen(true); }
  function goTo(date: string) { setSelected(date); setMonth(date.slice(0, 7)); setView("month"); }
  function shift(n: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + n, 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setMonth(next);
    setSelected(next === today.slice(0, 7) ? today : `${next}-01`);
  }
  function toggleCategory(id: string) {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const draft: Draft = {
      kind: "event", title: form.title.trim(), detail: form.detail.trim(),
      due: form.due, assignee: form.assignee, done: false,
      data: eventDataFromForm(form, entries, { sourceId: source?.id || "", sourceKind: source?.kind }),
    };
    try { validateDraft(draft); }
    catch (cause) { setFormError(cause instanceof Error ? cause.message : "Confira os dados."); return; }
    if (await add(draft)) {
      setOpen(false);
      if (search.has("origem") || search.has("novo"))
        router.replace("/calendario?data=" + draft.due, { scroll: false });
      goTo(draft.due);
    } else setFormError("Não foi possível salvar. Confira as datas e tente novamente.");
  }

  const row = (e: Entry, date: string, left: ReactNode, badge?: ReactNode) => {
    const category = categoryOf(e, topics);
    const recurring = e.kind === "event" && e.data?.eventRepeat && e.data.eventRepeat !== "none";
    const content = <>
      {left}
      <span className="agenda-line-bar" style={{ "--bar": category.color } as CSSProperties} aria-hidden="true" />
      <span className="agenda-line-copy">
        <strong className={e.done ? "is-done" : ""}>{e.title}</strong>
        <small>
          {e.kind === "event" ? category.name : KIND_LABEL[e.kind]}
          {recurring ? <> · <Repeat2 size={11} aria-hidden="true" /> repete</> : null}
          {eventDurationLabel(e) ? " · " + eventDurationLabel(e) : ""}
          {e.data?.location ? " · " + e.data.location : ""}
          {e.done ? " · concluído" : ""}
        </small>
        {badge}
      </span>
      <span className="pen-name" data-pen={penOf(e.assignee, names)}>{e.assignee}</span>
    </>;
    return e.kind === "event"
      ? <button type="button" key={e.id + e.due + date} className="agenda-line"
          aria-label={"Ver detalhes de " + e.title} onClick={() => setPreview(e)}>{content}</button>
      : <Link key={e.id + e.due + date} className="agenda-line"
          href={e.kind === "task" ? "/compromissos" : "/compras?aba=pagamentos"}>{content}</Link>;
  };

  return (
    <Shell>
      <section className="page-heading calendar-heading">
        <div>
          <span className="eyebrow">TEMPO PARA O QUE IMPORTA</span>
          <h1>Nosso calendário<span className="rose">.</span></h1>
        </div>
        <button type="button" className="primary round-add" aria-label="Novo compromisso" onClick={openNew}>
          <Plus size={22} />
        </button>
      </section>
      {open ? (
        <CleanSheet title="Novo compromisso" onClose={() => setOpen(false)}>
          <form className="panel entry-form" onSubmit={submit}>
            <EventFields values={form} onChange={setForm} topics={topics} entries={entries} names={names} />
            {formError ? <p className="error" role="alert">{formError}</p> : null}
            <button className="primary" disabled={busy}>{busy ? "Salvando…" : "Salvar compromisso"}</button>
          </form>
        </CleanSheet>
      ) : null}

      <div className="clean-list-filters calendar-views" role="group" aria-label="Visualização">
        <button type="button" className={view === "month" ? "selected" : ""} aria-pressed={view === "month"}
          onClick={() => setView("month")}>Mês</button>
        <button type="button" className={view === "upcoming" ? "selected" : ""} aria-pressed={view === "upcoming"}
          onClick={() => setView("upcoming")}>Próximos</button>
      </div>
      <div className="calendar-chips" role="group" aria-label="Mostrar categorias">
        {categories.map((c) => {
          const on = !hidden.has(c.id);
          return (
            <button type="button" key={c.id} aria-pressed={on} className={"calendar-chip" + (on ? "" : " is-off")}
              style={{ "--chip": c.color } as CSSProperties} onClick={() => toggleCategory(c.id)}>
              <i aria-hidden="true" />{c.name}
            </button>
          );
        })}
        <Link href="/configuracoes#categorias" className="calendar-chip calendar-chip-edit" aria-label="Editar categorias e cores">
          <Settings2 size={14} aria-hidden="true" /> editar
        </Link>
      </div>

      {view === "month" ? <>
        <section className="next-dates" aria-labelledby="next-dates-title">
          <div className="next-dates-head">
            <h2 id="next-dates-title">Próximas datas</h2>
            <button type="button" className="text-link" onClick={() => setView("upcoming")}>ver todas</button>
          </div>
          {upcomingNext.length ? (
            <div className="next-dates-list">
              {upcomingNext.map((e) => {
                const days = Math.round((Date.parse(e.due + "T12:00:00Z") - Date.parse(today + "T12:00:00Z")) / 86400000);
                const color = categoryOf(e, topics).color;
                return (
                  <button type="button" key={e.id + e.due} className="next-date"
                    style={{ "--bar": color } as CSSProperties}
                    aria-label={`${e.title}, ${longDay(e.due)}, ${daysAwayLabel(days)}`}
                    onClick={() => goTo(e.due)}>
                    <span className="next-date-day"><b>{Number(e.due.slice(-2))}</b>{MONTH_SHORT[Number(e.due.slice(5, 7)) - 1]}</span>
                    <span className="next-date-title">{e.title}</span>
                    <span className="next-date-when">{daysAwayLabel(days)}</span>
                  </button>
                );
              })}
            </div>
          ) : <p className="calendar-handnote">nada marcado pela frente</p>}
        </section>

        <MonthGrid month={month} entries={shown} topics={topics} today={today} selected={selected}
          onSelect={setSelected} onShift={shift} />

        <section className="agenda-day" aria-labelledby="agenda-day-title">
          <div className="agenda-day-head">
            <h2 id="agenda-day-title">{selected === today ? "Hoje, " : ""}{longDay(selected)}</h2>
            <button type="button" className="text-link" onClick={openNew}><Plus size={15} /> marcar</button>
          </div>
          {daily.length ? daily.map((e) => row(e, selected,
            <span className="agenda-line-time">{dayTimeLabel(e, selected)}</span>))
            : <p className="calendar-handnote">dia livre por aqui</p>}
        </section>
      </> : (
        <section className="agenda-upcoming" aria-label="Próximos compromissos">
          {groups.length ? groups.map((group) => (
            <div key={group.title} className="agenda-group">
              <h2>{group.title}</h2>
              {group.items.map((e) => {
                const day = e.due < today ? today : e.due;
                const away = Math.round((Date.parse(e.due + "T12:00:00Z") - Date.parse(today + "T12:00:00Z")) / 86400000);
                const special = e.kind === "event" &&
                  ((e.data?.eventCounter && e.data.eventCounter !== "off") || (e.data?.endDate || "") > e.due);
                return row(e, day,
                  <span className="agenda-line-date">
                    <small>{WEEKDAY_SHORT[new Date(day + "T12:00:00Z").getUTCDay()]}</small>
                    <b>{Number(day.slice(-2))}</b>
                  </span>,
                  special && away > 0 ? <span className="calendar-stamp">faltam {away} {away === 1 ? "dia" : "dias"}</span> : null);
              })}
            </div>
          )) : <p className="calendar-handnote">nenhum plano pela frente</p>}
          <p className="helper calendar-export-note">
            Para levar um compromisso ao Google Agenda ou a outro calendário, abra-o e use as opções de exportação.
          </p>
        </section>
      )}
      {preview ? <EventQuickView key={preview.id + preview.due} occurrence={preview}
        onClose={() => setPreview(null)} /> : null}
    </Shell>
  );
}
