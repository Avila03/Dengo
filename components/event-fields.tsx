"use client";
import { useId, useState } from "react";
import { TOGETHER, type Entry } from "@/lib/model";
import type { CalendarTopic } from "@/lib/calendar-topics";
import { EVENT_REPEAT_LABELS, type EventFormValues } from "@/lib/event-form";

/** One field layout for new events and changes to saved occurrences. */
export function EventFields({ values, onChange, topics, entries, names, allowRepeat = true }: {
  values: EventFormValues;
  onChange: (next: EventFormValues) => void;
  topics: CalendarTopic[];
  entries: Entry[];
  names: string[];
  allowRepeat?: boolean;
}) {
  const id = useId();
  const [multiDay, setMultiDay] = useState(Boolean(values.endDate));
  const places = entries.filter((e) => e.kind === "place");
  const selectedTopic = topics.find((topic) => topic.id === values.topicId);
  const set = <K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) =>
    onChange({ ...values, [key]: value });
  return <div className="event-fields">
    <div className="form-grid">
      <label className="full">Título
        <input required maxLength={120} value={values.title}
          onChange={(e) => set("title", e.target.value)} placeholder="O que vamos fazer?" />
      </label>
      <label>Data
        <input type="date" required value={values.due} onChange={(e) => set("due", e.target.value)} />
      </label>
      <label>Horário
        <input type="time" value={values.time} onChange={(e) => set("time", e.target.value)} />
      </label>
      <label className="full">Categoria
        <span className="topic-select">
          <i className="topic-legend-dot" style={{ backgroundColor: selectedTopic?.color || topics[0]?.color }} />
          <select value={selectedTopic?.id || "outros"} onChange={(e) => set("topicId", e.target.value)}>
            {!selectedTopic ? <option value={values.topicId}>Outros</option> : null}
            {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
          </select>
        </span>
      </label>
    </div>
    {allowRepeat ? <section className="form-repetition">
      <label className="checkbox-label">
        <input type="checkbox" checked={values.repeat !== "none"} aria-controls={id + "-repeat"}
          onChange={(e) => set("repeat", e.target.checked ? "weekly" : "none")} />
        Repetir
      </label>
      {values.repeat !== "none" ? <div id={id + "-repeat"} className="form-revealed">
        <label>Frequência
          <select value={values.repeat} onChange={(e) => set("repeat", e.target.value as EventFormValues["repeat"])}>
            {(["weekly", "monthly", "yearly"] as const).map((repeat) =>
              <option key={repeat} value={repeat}>{EVENT_REPEAT_LABELS[repeat]}</option>)}
          </select>
        </label>
        {values.repeat !== "weekly" ? <details className="form-details" open={values.counter !== "off" || undefined}>
          <summary>Contagem de tempo</summary>
          <label>Mostrar desde a primeira data
            <select value={values.counter} onChange={(e) => set("counter", e.target.value as EventFormValues["counter"])}>
              <option value="off">Não mostrar contagem</option>
              <option value="elapsed">Tempo decorrido</option>
              <option value="together">Tempo juntos</option>
              <option value="age">Idade</option>
            </select>
          </label>
        </details> : null}
      </div> : <span className="form-toggle-hint">Não repetir</span>}
    </section> : null}
    <details className="form-details" open={multiDay || undefined}>
      <summary>Duração</summary>
      <label className="checkbox-label">
        <input type="checkbox" checked={multiDay} aria-controls={id + "-end"}
          onChange={(e) => { setMultiDay(e.target.checked); if (!e.target.checked) set("endDate", ""); }} />
        Dura mais de um dia
      </label>
      {multiDay ? <label id={id + "-end"}>Data de término
        <input type="date" required min={values.due} value={values.endDate}
          onChange={(e) => set("endDate", e.target.value)} />
      </label> : null}
    </details>
    <details className="form-details" open={values.placeId || values.location || values.detail || values.assignee !== TOGETHER ? true : undefined}>
      <summary>Participantes, local e observação</summary>
      <div className="form-grid">
        <label className="full">Participantes
          <select value={values.assignee} onChange={(e) => set("assignee", e.target.value)}>
            {[TOGETHER, ...names].map((name, i) => <option key={i}>{name}</option>)}
          </select>
        </label>
        <label className="full">Local
          <select value={values.placeId} onChange={(e) => onChange({ ...values, placeId: e.target.value, location: "" })}>
            <option value="">Sem local</option>
            {values.placeId && !places.some((p) => p.id === values.placeId)
              ? <option value={values.placeId}>Local salvo anteriormente</option> : null}
            {places.map((place) => <option key={place.id} value={place.id}>{place.title}</option>)}
          </select>
        </label>
        {!places.length ? <p className="helper full">Cadastre um local na aba Lugares para selecioná-lo aqui.</p> : null}
        {!values.placeId && values.location ? <p className="helper full">Local registrado: {values.location} <button type="button" className="text-link" onClick={() => set("location", "")}>Remover</button></p> : null}
        <label className="full">Observação
          <textarea rows={2} maxLength={240} value={values.detail} onChange={(e) => set("detail", e.target.value)} />
        </label>
      </div>
    </details>
  </div>;
}
