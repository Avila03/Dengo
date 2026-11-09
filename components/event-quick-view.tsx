"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Check, ChevronRight, Clock3, ExternalLink, MapPin, Pencil, Plus,
  Repeat2, Trash2,
} from "lucide-react";
import type { Draft, Entry, EventOccurrenceChanges } from "@/lib/model";
import { CleanSheet } from "./clean-sheet";
import { EventFields } from "./event-fields";
import { eventFormValues, eventDataFromForm } from "@/lib/event-form";
import { localToday, TOGETHER } from "@/lib/model";
import { useDengo } from "./provider";
import { eventDurationLabel } from "@/lib/calendar-anniversaries";
import { calendarTopics, calendarEntryColor, eventTopicLabel } from "@/lib/calendar-topics";
import {
  calendarDayDifference, eventRangeLabel,
  recurrenceSeries, recurringInstanceKey, splitFutureSeries, withOccurrenceOverride,
} from "@/lib/calendar-schedule";

type Scope = "once" | "future" | "all";
function draftFrom(entry: Entry): Draft {
  return {
    kind: entry.kind, title: entry.title, detail: entry.detail,
    assignee: entry.assignee, due: entry.due, done: entry.done, data: entry.data,
  };
}
/** Compact details and inline operations shared by Nosso dia and the full calendar. */
export function EventQuickView({
  occurrence, onClose,
}: {
  occurrence: Entry;
  onClose: () => void;
}) {
  const { entries, preferences, names, busy, add, update, remove, toggle } = useDengo();
  const topics = calendarTopics(preferences.calendarTopics);
  const source = recurrenceSeries(entries, occurrence);
  const recurring = source.kind === "event" &&
    ["weekly", "monthly", "yearly"].includes(source.data?.eventRepeat || "");
  const scheduled = occurrence.data?.eventOccurrenceDate || occurrence.due;
  const instanceKey = recurringInstanceKey(occurrence);
  const prep = entries.filter((e) =>
    ["task", "shopping"].includes(e.kind) && e.data?.eventInstanceKey === instanceKey);
  const linked = entries.find((e) =>
    (e.kind === "movie" || e.kind === "place") &&
    e.id === occurrence.data?.sourceId);

  const [editing, setEditing] = useState(false);
  const [scope, setScope] = useState<Scope>("once");
  const [form, setForm] = useState(() => eventFormValues(occurrence));
  const [deleting, setDeleting] = useState(false);
  const [deleteScope, setDeleteScope] = useState<Scope>("once");
  const [prepOpen, setPrepOpen] = useState(false);
  const [prepKind, setPrepKind] = useState<"task" | "shopping">("task");
  const [prepTitle, setPrepTitle] = useState("");
  const [prepAssignee, setPrepAssignee] = useState(TOGETHER);
  const [prepDue, setPrepDue] = useState(localToday());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function changeScope(next: Scope) {
    setScope(next);
    setForm(eventFormValues(next === "all" ? source : occurrence));
    setError("");
  }
  function makeDraft(): Draft {
    return {
      kind: "event", title: form.title.trim(), detail: form.detail.trim(),
      assignee: form.assignee, due: form.due, done: occurrence.done,
      data: eventDataFromForm(form, entries, scope === "all" ? source.data : occurrence.data),
    };
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const draft = makeDraft();
    if (!draft.title) { setError("Informe o título."); return; }
    if (draft.data?.endDate && draft.data.endDate < draft.due) {
      setError("A data final não pode anteceder a inicial."); return;
    }
    if (draft.data?.endTime && !draft.data.time) {
      setError("Informe o início antes do horário final."); return;
    }
    if (draft.data?.time && draft.data?.endTime &&
      (!draft.data.endDate || draft.data.endDate === draft.due) &&
      draft.data.endTime <= draft.data.time) {
      setError("A hora final deve ser posterior à inicial."); return;
    }
    if (draft.data?.endDate &&
      calendarDayDifference(draft.due, draft.data.endDate) > 60) {
      setError("O evento pode durar no máximo 61 dias."); return;
    }
    let ok = false;
    if (!recurring || scope === "all") {
      const revised = {
        ...draft,
        data: {
          ...draft.data,
          eventAnchorDate: source.data?.eventAnchorDate,
          eventRepeatUntil: source.data?.eventRepeatUntil,
          eventOverrides: source.data?.eventOverrides,
        },
      };
      ok = await update(source, revised);
    } else if (scope === "once") {
      const changes: EventOccurrenceChanges = {
        title: draft.title, detail: draft.detail, assignee: draft.assignee,
        due: draft.due, endDate: draft.data?.endDate,
        time: draft.data?.time, endTime: draft.data?.endTime,
        location: draft.data?.location, placeId: draft.data?.placeId, topicId: draft.data?.topicId,
        sourceId: draft.data?.sourceId, sourceKind: draft.data?.sourceKind,
      };
      const patched = withOccurrenceOverride(source, occurrence, changes);
      ok = await update(source, draftFrom(patched));
    } else {
      const pair = splitFutureSeries(source, occurrence, draft);
      // Create the new segment first to avoid losing future events on a failed insert.
      const created = await add(pair.future as Draft);
      if (created) ok = await update(source, draftFrom(pair.original));
      if (!ok && created) {
        setError("A nova série foi criada, mas não foi possível encerrar a anterior. Abra a agenda para revisar as duplicações.");
        return;
      }
    }
    if (ok) onClose();
    else setError("Não foi possível salvar. Confira os dados e tente novamente.");
  }
  async function deleteEvent() {
    setError("");
    if (!recurring || deleteScope === "all") {
      if (await remove(source)) onClose();
      else setError("Não foi possível excluir o evento. Tente novamente.");
      return;
    }
    if (deleteScope === "once") {
      const changed = withOccurrenceOverride(source, occurrence, { canceled: true });
      if (await update(source, draftFrom(changed))) onClose();
      else setError("Não foi possível remover essa ocorrência.");
      return;
    }
    const cutoff = scheduled;
    const exceptions = Object.fromEntries(
      Object.entries(source.data?.eventOverrides || {}).filter(([date]) => date < cutoff));
    const changed = {
      ...source,
      data: {...source.data, eventRepeatUntil: cutoff, eventOverrides: exceptions},
    };
    if (await update(source, draftFrom(changed))) onClose();
    else setError("Não foi possível interromper a série.");
  }
  async function addPreparation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const title = prepTitle.trim();
    if (!title) { setError("Dê um nome ao preparativo."); return; }
    const draft: Draft = {
      kind: prepKind,
      title,
      detail: "",
      assignee: prepAssignee,
      due: prepKind === "task" ? prepDue : "",
      done: false,
      data: { eventInstanceKey: instanceKey, recurrence: "none" },
    };
    if (await add(draft)) {
      setPrepTitle("");
      setNotice("Preparativo adicionado!");
      setPrepOpen(false);
    } else setError("Não foi possível adicionar o preparativo.");
  }
  async function complete() {
    setError("");
    const changed = recurring
      ? withOccurrenceOverride(source, occurrence, { done: !occurrence.done })
      : { ...source, done: !source.done };
    if (await update(source, draftFrom(changed))) onClose();
    else setError("Não foi possível atualizar este compromisso.");
  }
  const place = entries.find((e) => e.kind === "place" && e.id === occurrence.data?.placeId);
  const linkToItem = linked?.kind === "place" ? "/lugares" : "/filmes";
  return (
    <CleanSheet title={occurrence.title} onClose={onClose}>
      <div className="event-details-content">
        <div className="event-quick-head-title">
          <i className="topic-legend-dot" style={{ backgroundColor: calendarEntryColor(occurrence, topics) }} />
          <span>{eventTopicLabel(occurrence, topics)}</span>
          {recurring ? <span className="event-quick-repeat"><Repeat2 size={13} />
            {source.data?.eventRepeat === "weekly" ? "Semanal" : source.data?.eventRepeat === "monthly" ? "Mensal" : "Anual"}</span> : null}
        </div>
        <h2>{occurrence.title}</h2>
        <div className="event-quick-info">
          <p><Clock3 size={16} /> {eventRangeLabel(occurrence)}</p>
          {occurrence.data?.location ? <p><MapPin size={16} /> {occurrence.data.location}</p> : null}
          {occurrence.detail ? <p>{occurrence.detail}</p> : null}
          {eventDurationLabel(occurrence) ? (
            <p className="event-quick-anniversary">♥ {eventDurationLabel(occurrence)}</p>
          ) : null}
          <p>Com {occurrence.assignee.toLowerCase()}</p>
        </div>
        {place ? <Link className="secondary event-quick-link" href="/lugares">
          <MapPin size={15} /> {place.title}
        </Link> : null}
        {linked && linked.id !== place?.id ? <Link className="secondary event-quick-link" href={linkToItem}>
          <ExternalLink size={15} /> {linked.kind === "place" ? "Lugar salvo" : "Filme ou série"}: {linked.title}
        </Link> : null}
        <div className="event-quick-actions">
          <button type="button" className="secondary" disabled={busy} onClick={() => void complete()}>
            <Check size={16} /> {occurrence.done ? "Reabrir" : "Concluir"}
          </button>
          <button type="button" className="secondary" onClick={() => {
            setEditing(!editing); setDeleting(false); setError("");
          }}><Pencil size={16} /> {editing ? "Fechar edição" : "Editar"}</button>
          <button type="button" className="secondary" onClick={() => {
            setDeleting(!deleting); setEditing(false); setError("");
          }}><Trash2 size={16} /> {deleting ? "Cancelar" : "Excluir"}</button>
        </div>
        {editing ? (
          <form className="event-quick-edit entry-form" onSubmit={(e) => void save(e)}>
            {recurring ? <label>
              Aplicar alteração
              <select value={scope} onChange={(e) => changeScope(e.target.value as Scope)}>
                <option value="once">Somente este dia</option>
                <option value="future">Este dia e os próximos</option>
                <option value="all">Toda a série</option>
              </select>
            </label> : null}
            <EventFields key={scope} values={form} onChange={setForm} topics={topics}
              entries={entries} names={names} allowRepeat={!recurring || scope === "all"} />
            {error ? <p className="error" role="alert">{error}</p> : null}
            <button type="submit" className="primary" disabled={busy}>
              {busy ? "Salvando…" : "Salvar alterações"}
            </button>
          </form>
        ) : null}
        {error && !editing && !deleting && !prepOpen ? <p className="error" role="alert">{error}</p> : null}
        {deleting ? <div className="event-quick-confirm">
          {recurring ? <label>
            Excluir
            <select value={deleteScope} onChange={(e) => setDeleteScope(e.target.value as Scope)}>
              <option value="once">Somente este dia</option>
              <option value="future">Este e os próximos</option>
              <option value="all">Toda a série</option>
            </select>
          </label> : null}
          <p>Confirma a exclusão? {recurring && deleteScope === "once"
            ? "As próximas repetições continuarão normalmente."
            : recurring && deleteScope === "future"
              ? "As ocorrências anteriores serão mantidas."
              : "Esta ação exclui o evento."}</p>
          {error ? <p className="error" role="alert">{error}</p> : null}
          <button type="button" className="secondary event-quick-danger" disabled={busy} onClick={() => void deleteEvent()}>
            <Trash2 size={15} /> Confirmar exclusão
          </button>
        </div> : null}
        <div className="event-preparations">
          <div className="event-prep-head">
            <div>
              <h3>Preparativos</h3>
              <p>Compras e responsabilidades para esta data.</p>
            </div>
            <button type="button" className="secondary" onClick={() => setPrepOpen(!prepOpen)}>
              <Plus size={16} /> Preparar
            </button>
          </div>
          {prep.map((item) => <div className="event-prep-item" key={item.id}>
            <button type="button" className={"check" + (item.done ? " checked" : "")}
              aria-label={(item.done ? "Reabrir " : "Concluir ") + item.title}
              disabled={busy} onClick={() => void toggle(item)}><Check size={14} /></button>
            <span className={item.done ? "event-prep-done" : ""}>{item.title}</span>
            <Link href={item.kind === "shopping" ? "/compras" : "/compromissos"}
              className="text-link" aria-label={"Abrir " + item.title}><ChevronRight size={16} /></Link>
          </div>)}
          {!prep.length && !prepOpen ? <p className="event-prep-empty">Nenhum preparativo ainda.</p> : null}
          {prepOpen ? <form onSubmit={(e) => void addPreparation(e)} className="event-prep-form">
            <label>O que precisa fazer?
              <input required maxLength={120} value={prepTitle}
                onChange={(e) => setPrepTitle(e.target.value)}
                placeholder="Ex.: Reservar restaurante" />
            </label>
            <div className="event-quick-pair">
              <label>Tipo
                <select value={prepKind} onChange={(e) => setPrepKind(e.target.value as "task" | "shopping")}>
                  <option value="task">Responsabilidade</option>
                  <option value="shopping">Compra</option>
                </select>
              </label>
              <label>Responsável
                <select value={prepAssignee} onChange={(e) => setPrepAssignee(e.target.value)}>
                  {[TOGETHER,...names].map((name,i) => <option key={i} value={name}>{name}</option>)}
                </select>
              </label>
            </div>
            {prepKind === "task" ? <label>Prazo
              <input type="date" value={prepDue} onChange={(e) => setPrepDue(e.target.value)} />
            </label> : null}
            {error ? <p className="error" role="alert">{error}</p> : null}
            <button className="primary" disabled={busy}><Plus size={15} /> Adicionar preparativo</button>
          </form> : null}
          {notice ? <p className="notice" role="status">{notice}</p> : null}
        </div>
      </div>
    </CleanSheet>
  );
}
