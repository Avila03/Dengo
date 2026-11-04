"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Check, ChevronRight, Clock3, ExternalLink, MapPin, Pencil, Plus,
  Repeat2, ShoppingBag, ListChecks, Trash2, X,
} from "lucide-react";
import type { Draft, Entry, EventOccurrenceChanges } from "@/lib/model";
import { localToday } from "@/lib/model";
import { useDengo } from "./provider";
import { eventDurationLabel } from "@/lib/calendar-anniversaries";
import { calendarTopics, calendarEntryColor, eventTopicLabel } from "@/lib/calendar-topics";
import {
  addCalendarDays, calendarDayDifference, eventFinish, eventRangeLabel,
  recurrenceSeries, recurringInstanceKey, splitFutureSeries, withOccurrenceOverride,
} from "@/lib/calendar-schedule";

type Scope = "once" | "future" | "all";
type FormValues = {
  title: string;
  due: string;
  endDate: string;
  time: string;
  endTime: string;
  location: string;
  detail: string;
  topicId: string;
  assignee: string;
  sourceId: string;
};

function draftFrom(entry: Entry): Draft {
  return {
    kind: entry.kind, title: entry.title, detail: entry.detail,
    assignee: entry.assignee, due: entry.due, done: entry.done, data: entry.data,
  };
}
function initialForm(entry: Entry): FormValues {
  return {
    title: entry.title,
    due: entry.due,
    endDate: entry.data?.endDate || "",
    time: entry.data?.time || "",
    endTime: entry.data?.endTime || "",
    location: entry.data?.location || "",
    detail: entry.detail,
    topicId: entry.data?.topicId || "outros",
    assignee: entry.assignee,
    sourceId: entry.data?.sourceKind && ["movie", "place"].includes(entry.data.sourceKind)
      ? entry.data.sourceId || "" : "",
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
    ["monthly", "yearly"].includes(source.data?.eventRepeat || "");
  const scheduled = occurrence.data?.eventOccurrenceDate || occurrence.due;
  const instanceKey = recurringInstanceKey(occurrence);
  const prep = entries.filter((e) =>
    ["task", "shopping"].includes(e.kind) && e.data?.eventInstanceKey === instanceKey);
  const linked = entries.find((e) =>
    (e.kind === "movie" || e.kind === "place") &&
    e.id === occurrence.data?.sourceId);
  const availableLinks = entries.filter((e) => e.kind === "movie" || e.kind === "place");
  const [editing, setEditing] = useState(false);
  const [scope, setScope] = useState<Scope>("once");
  const [form, setForm] = useState<FormValues>(() => initialForm(occurrence));
  const [deleting, setDeleting] = useState(false);
  const [deleteScope, setDeleteScope] = useState<Scope>("once");
  const [prepOpen, setPrepOpen] = useState(false);
  const [prepKind, setPrepKind] = useState<"task" | "shopping">("task");
  const [prepTitle, setPrepTitle] = useState("");
  const [prepAssignee, setPrepAssignee] = useState("Nós dois");
  const [prepDue, setPrepDue] = useState(localToday());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm((prior) => ({ ...prior, [key]: value }));
  }
  function changeScope(next: Scope) {
    setScope(next);
    setForm(initialForm(next === "all" ? source : occurrence));
    setError("");
  }
  function makeDraft(): Draft {
    const linkedEntry = availableLinks.find((e) => e.id === form.sourceId);
    return {
      kind: "event",
      title: form.title.trim(),
      detail: form.detail.trim(),
      assignee: form.assignee,
      due: form.due,
      done: false,
      data: {
        ...source.data,
        time: form.time,
        endTime: form.endTime,
        endDate: form.endDate,
        location: form.location.trim(),
        topicId: form.topicId,
        sourceId: linkedEntry?.id || "",
        sourceKind: linkedEntry?.kind,
      },
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
      const originalDate = source.due;
      const keepEnd = scope === "all" && source.due !== occurrence.due;
      const revised = {
        ...draft,
        due: keepEnd ? originalDate : draft.due,
        data: {
          ...draft.data,
          endDate: keepEnd && draft.data?.endDate
            ? addCalendarDays(originalDate,
                calendarDayDifference(draft.due, draft.data.endDate))
            : draft.data?.endDate,
          eventRepeat: source.data?.eventRepeat,
          eventCounter: source.data?.eventCounter,
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
        location: draft.data?.location, topicId: draft.data?.topicId,
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
      }
    }
    if (ok) onClose();
    else if (!error) setError("Não foi possível salvar. Confira os dados e tente novamente.");
  }
  async function deleteEvent() {
    setError("");
    if (!recurring || deleteScope === "all") {
      await remove(source);
      onClose();
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
  const linkToItem = linked?.kind === "place" ? "/lugares" : "/filmes";
  return (
    <div className="event-quick-backdrop" onClick={onClose} role="presentation">
      <section role="dialog" aria-modal="true" aria-label={"Detalhes de " + occurrence.title}
        className="event-quick-panel" onClick={(e) => e.stopPropagation()}>
        <div className="event-quick-head">
          <div className="event-quick-head-title">
            <i className="topic-legend-dot" style={{ backgroundColor: calendarEntryColor(occurrence, topics) }} />
            <span>{eventTopicLabel(occurrence, topics)}</span>
            {recurring ? <span className="event-quick-repeat"><Repeat2 size={13} />
              {source.data?.eventRepeat === "monthly" ? "Mensal" : "Anual"}</span> : null}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar detalhes">
            <X size={20} />
          </button>
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
        {linked ? <Link className="secondary event-quick-link" href={linkToItem}>
          <ExternalLink size={15} /> {linked.kind === "place" ? "Lugar salvo" : "Filme ou série"}: {linked.title}
        </Link> : null}
        <div className="event-quick-actions">
          <button type="button" className="secondary" onClick={() => {
            setEditing(!editing); setDeleting(false); setError("");
          }}><Pencil size={16} /> {editing ? "Fechar edição" : "Editar"}</button>
          <button type="button" className="secondary" onClick={() => {
            setDeleting(!deleting); setEditing(false); setError("");
          }}><Trash2 size={16} /> {deleting ? "Cancelar" : "Excluir"}</button>
        </div>
        {editing ? (
          <form className="event-quick-edit" onSubmit={(e) => void save(e)}>
            {recurring ? <label>
              Aplicar alteração
              <select value={scope} onChange={(e) => changeScope(e.target.value as Scope)}>
                <option value="once">Somente este dia</option>
                <option value="future">Este dia e os próximos</option>
                <option value="all">Toda a série</option>
              </select>
            </label> : null}
            <label>Nome
              <input required maxLength={120} value={form.title}
                onChange={(e) => setField("title", e.target.value)} />
            </label>
            <div className="event-quick-pair">
              <label>Início
                <input type="date" required value={form.due} onChange={(e) => setField("due", e.target.value)} />
              </label>
              <label>Fim (opcional)
                <input type="date" value={form.endDate} min={form.due}
                  onChange={(e) => setField("endDate", e.target.value)} />
              </label>
            </div>
            <div className="event-quick-pair">
              <label>Hora inicial
                <input type="time" value={form.time} onChange={(e) => setField("time", e.target.value)} />
              </label>
              <label>Hora final
                <input type="time" value={form.endTime} onChange={(e) => setField("endTime", e.target.value)} />
              </label>
            </div>
            <label>Tópico
              <select value={form.topicId} onChange={(e) => setField("topicId", e.target.value)}>
                {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
              </select>
            </label>
            <label>Participantes
              <select value={form.assignee} onChange={(e) => setField("assignee", e.target.value)}>
                {["Nós dois", ...names].map((name,i) => <option key={i} value={name}>{name}</option>)}
              </select>
            </label>
            <label>Vincular lugar, filme ou série
              <select value={form.sourceId} onChange={(e) => {
                setField("sourceId", e.target.value);
                const place = availableLinks.find((x) => x.id === e.target.value && x.kind === "place");
                if (place?.data?.address) setField("location", place.data.address);
              }}>
                <option value="">Sem vínculo</option>
                {availableLinks.map((entry) => <option key={entry.id} value={entry.id}>
                  {entry.kind === "place" ? "📍 " : "🎬 "}{entry.title}
                </option>)}
              </select>
            </label>
            <label>Local
              <input maxLength={240} value={form.location} onChange={(e) => setField("location", e.target.value)} />
            </label>
            <label>Observação
              <textarea rows={2} maxLength={240} value={form.detail} onChange={(e) => setField("detail", e.target.value)} />
            </label>
            {error ? <p className="error" role="alert">{error}</p> : null}
            <button type="submit" className="primary" disabled={busy}>
              {busy ? "Salvando…" : "Salvar alterações"}
            </button>
          </form>
        ) : null}
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
              <p>Compras e tarefas vinculadas a esta data.</p>
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
                  <option value="task">Tarefa</option>
                  <option value="shopping">Compra</option>
                </select>
              </label>
              <label>Responsável
                <select value={prepAssignee} onChange={(e) => setPrepAssignee(e.target.value)}>
                  {["Nós dois",...names].map((name,i) => <option key={i} value={name}>{name}</option>)}
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
      </section>
    </div>
  );
}
