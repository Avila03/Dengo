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
} from "lucide-react";
import { Shell } from "./shell";
import { PageHeading, DeleteButton } from "./ui";
import { useDengo } from "./provider";
import { type Entry, type Draft, localToday, dayLabel } from "@/lib/model";
import {
  calendarEntries,
  eventICS,
  googleCalendarUrl,
  downloadFile,
} from "@/lib/calendar";
const labels = {
  task: "Responsabilidade",
  expense: "Conta",
  event: "Compromisso",
};
export function Calendar() {
  const { entries, names, busy, add, update, remove } = useDengo();
  const search = useSearchParams();
  const router = useRouter();
  const source = entries.find((e) => e.id === search.get("origem"));
  const today = localToday();
  const [month, setMonth] = useState(today.slice(0, 7)),
    [selected, setSelected] = useState(today),
    [open, setOpen] = useState(!!source),
    [editing, setEditing] = useState<Entry | null>(null);
  const items = calendarEntries(entries);
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, m - 1, 1).getDay();
  const days = new Date(y, m, 0).getDate();
  const daily = items
    .filter((e) => e.due === selected)
    .sort((a, b) => (a.data?.time || "").localeCompare(b.data?.time || ""));
  const upcoming = items
    .filter((e) => e.due >= today && !e.done)
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
      if (search.has("origem"))
        router.replace("/calendario", { scroll: false });
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
        description="Compromissos, tarefas e contas no mesmo lugar."
      >
        <button
          className="primary"
          onClick={() => {
            setOpen(!open);
            setEditing(null);
          }}
        >
          <Plus size={18} />
          {open ? "Fechar" : "Novo compromisso"}
        </button>
      </PageHeading>
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
              const count = items.filter((e) => e.due === date).length;
              return (
                <button
                  key={date}
                  className={`calendar-day ${selected === date ? "selected" : ""} ${date === today ? "today" : ""}`}
                  aria-pressed={selected === date}
                  aria-label={`${dayLabel(date)}, ${count} registros`}
                  onClick={() => setSelected(date)}
                >
                  {i + 1}
                  {count ? <span className="calendar-dot" /> : null}
                </button>
              );
            })}
          </div>
          <div className="calendar-legend">
            <span>Compromissos</span>
            <span>Tarefas com prazo</span>
            <span>Contas e vencimentos</span>
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
              }}
            >
              <Plus />
            </button>
          </div>
          {daily.length ? (
            daily.map((e) => (
              <article className="agenda-item" key={e.id}>
                <span className="tag">
                  {labels[e.kind as keyof typeof labels]}
                  {e.done ? " · Concluído" : ""}
                </span>
                <h3>{e.title}</h3>
                <p>
                  {e.data?.time || "Dia inteiro"} · {e.assignee}
                </p>
                {e.data?.location ? <p>{e.data.location}</p> : null}
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
                        aria-label={`Editar ${e.title}`}
                        onClick={() => {
                          setEditing(e);
                          setOpen(true);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                      <DeleteButton
                        label={e.title}
                        disabled={busy}
                        onDelete={() => void remove(e)}
                      />
                    </>
                  ) : null}
                </div>
              </article>
            ))
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
