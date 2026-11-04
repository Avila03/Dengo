"use client";
import { useState, type FormEvent } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { type CalendarTopic, validateCalendarTopics } from "@/lib/calendar-topics";

export function TopicManager({
  topics, busy, onSave,
}: {
  topics: CalendarTopic[];
  busy: boolean;
  onSave: (value: CalendarTopic[]) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<CalendarTopic[]>(topics);
  const [name, setName] = useState("");
  const [newColor, setNewColor] = useState("#d87fa1");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function change(index: number, patch: Partial<CalendarTopic>) {
    setDraft((previous) => previous.map((topic, i) => i === index ? { ...topic, ...patch } : topic));
    setNotice("");
  }
  function addTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    try {
      const candidate = [
        ...draft,
        { id: "tema_" + crypto.randomUUID().replaceAll("-", "").slice(0, 18), name: name.trim(), color: newColor },
      ];
      validateCalendarTopics(candidate);
      setDraft(candidate);
      setName("");
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível criar o tópico.");
    }
  }
  async function save() {
    setNotice("");
    try {
      const next = draft.map((t) => ({ ...t, name: t.name.trim() }));
      validateCalendarTopics(next);
      setError("");
      if (await onSave(next)) setNotice("Tópicos salvos para os dois.");
      else setError("Não foi possível salvar. Tente novamente.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar.");
    }
  }

  return (
    <section className="panel topic-editor" aria-label="Editar tópicos do calendário">
      <div className="section-title">
        <div>
          <span className="eyebrow">PERSONALIZAR A AGENDA</span>
          <h2>Nossos tópicos</h2>
          <p>Escolham os nomes e cores. Os dois veem as mesmas alterações.</p>
        </div>
      </div>
      <div className="topic-editor-list">
        {draft.map((topic, i) => (
          <div className="topic-editor-row" key={topic.id}>
            <input type="color" value={topic.color}
              onChange={(event) => change(i, { color: event.target.value })}
              aria-label={"Cor de " + topic.name} title={"Cor de " + topic.name} />
            <input type="text" value={topic.name} maxLength={30}
              aria-label={"Nome do tópico " + (i + 1)}
              onChange={(event) => change(i, { name: event.target.value })} />
            <button type="button" className="icon-btn" disabled={busy || draft.length === 1}
              onClick={() => {
                setDraft((current) => current.filter((t) => t.id !== topic.id));
                setNotice("");
              }}
              aria-label={"Remover tópico " + topic.name}>
              <Trash2 size={17} />
            </button>
          </div>
        ))}
      </div>
      <form className="topic-new-form" onSubmit={addTopic}>
        <label>
          Novo tópico
          <input type="text" value={name} maxLength={30}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Aniversário" required />
        </label>
        <label className="topic-new-color">
          Cor
          <input type="color" value={newColor} onChange={(event) => setNewColor(event.target.value)}
            aria-label="Cor do novo tópico" />
        </label>
        <button type="submit" className="secondary" disabled={!name.trim()}>
          <Plus size={17} /> Criar
        </button>
      </form>
      {error ? <p className="error" role="alert">{error}</p> : null}
      {notice ? <p className="notice" role="status">{notice}</p> : null}
      <button type="button" className="primary" disabled={busy} onClick={() => void save()}>
        <Save size={17} /> {busy ? "Salvando…" : "Salvar tópicos"}
      </button>
      <p className="helper">Ao excluir um tópico, os eventos já registrados continuam salvos; eles passam a usar a cor de Outros.</p>
    </section>
  );
}
