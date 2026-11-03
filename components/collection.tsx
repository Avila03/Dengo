"use client";
import { useState, type FormEvent } from "react";
import {
  Plus,
  Check,
  Trash2,
  ShoppingBag,
  ListChecks,
  Search,
  X,
  Pencil,
} from "lucide-react";
import { Shell } from "./shell";
import { useDengo } from "./provider";
import { dayLabel, localToday, isOverdue, type Entry } from "@/lib/model";
export function Collection({ kind }: { kind: Entry["kind"] }) {
  const { entries, names, busy, add, toggle, remove } = useDengo();
  const [formOpen, setFormOpen] = useState(false),
    [filter, setFilter] = useState("pending"),
    [query, setQuery] = useState(""),
    [deleting, setDeleting] = useState<string | null>(null);
  const isTask = kind === "task";
  const all = entries.filter((e) => e.kind === kind),
    pending = all.filter((e) => !e.done).length;
  const items = all.filter(
    (e) =>
      (filter === "all" || (filter === "done" ? e.done : !e.done)) &&
      e.title
        .toLocaleLowerCase("pt-BR")
        .includes(query.toLocaleLowerCase("pt-BR")),
  );
  const Icon = isTask ? ListChecks : ShoppingBag;
  const today = localToday();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const title = String(f.get("title") || "").trim();
    if (!title) return;
    const ok = await add({
      kind,
      title,
      detail: String(f.get("detail") || "").trim(),
      assignee: String(f.get("assignee") || "Nós dois"),
      due: String(f.get("due") || ""),
      done: false,
    });
    if (ok) {
      form.reset();
      setFormOpen(false);
    }
  }
  return (
    <Shell>
      <section className="page-heading">
        <div>
          <span className="eyebrow">
            {isTask ? "CUIDADO QUE SE COMPARTILHA" : "DO QUE A GENTE PRECISA"}
          </span>
          <h1>
            {isTask ? "Responsabilidades" : "Nossa lista de compras"}
            <span className="rose">.</span>
          </h1>
          <p>
            {isTask
              ? "Combinados claros para uma rotina mais leve."
              : "Tudo no mesmo lugar, para não esquecer nada."}
          </p>
        </div>
        <button
          className="primary"
          aria-expanded={formOpen}
          aria-controls="new-entry"
          onClick={() => setFormOpen(!formOpen)}
        >
          {formOpen ? <X size={18} /> : <Plus size={18} />}{" "}
          {formOpen ? "Fechar" : isTask ? "Novo cuidado" : "Adicionar item"}
        </button>
      </section>
      <div className="list-summary">
        <Icon size={22} />
        <span>
          <strong>
            {pending} {isTask ? "cuidados pendentes" : "itens na lista"}
          </strong>{" "}
          · {all.length - pending} {isTask ? "concluídos" : "comprados"}
        </span>
      </div>
      {formOpen ? (
        <form id="new-entry" className="panel entry-form" onSubmit={submit}>
          <h2>{isTask ? "Um novo combinado" : "O que vamos comprar?"}</h2>
          <div className="form-grid">
            <label className="full">
              {isTask ? "Nome da tarefa" : "Nome do item"}
              <input
                name="title"
                autoFocus
                required
                maxLength={120}
                placeholder={
                  isTask ? "Ex.: Regar as plantas" : "Ex.: Café para a semana"
                }
              />
            </label>
            <label>
              {isTask ? "Quem vai cuidar?" : "Quem vai comprar?"}
              <select name="assignee">
                {["Nós dois", ...names].map((n, i) => (
                  <option key={`${n}-${i}`}>{n}</option>
                ))}
              </select>
            </label>
            {isTask ? (
              <label>
                Prazo opcional
                <input type="date" name="due" />
              </label>
            ) : null}
            <label className={isTask ? "full" : ""}>
              {isTask ? "Observação opcional" : "Quantidade ou observação"}
              <input
                name="detail"
                maxLength={240}
                placeholder={
                  isTask ? "Algum detalhe importante?" : "Ex.: 2 pacotes"
                }
              />
            </label>
          </div>
          <button className="primary" disabled={busy}>
            <Plus size={18} />
            {busy ? "Salvando…" : "Salvar"}
          </button>
        </form>
      ) : null}
      <section className="panel list-panel">
        <div className="list-toolbar">
          <div className="filters" aria-label="Filtrar lista">
            {[
              ["pending", isTask ? "Pendentes" : "Faltando"],
              ["done", isTask ? "Concluídos" : "Comprados"],
              ["all", "Todos"],
            ].map(([key, label]) => (
              <button
                key={key}
                aria-pressed={filter === key}
                className={filter === key ? "selected" : ""}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="search">
            <Search size={17} />
            <input
              aria-label="Buscar na lista"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar na lista"
            />
          </label>
        </div>
        {items.length ? (
          <ul className="entry-list">
            {items.map((e) => (
              <li className={`entry ${e.done ? "done" : ""}`} key={e.id}>
                <button
                  className={`check ${e.done ? "checked" : ""}`}
                  aria-label={`${e.done ? "Reabrir" : "Concluir"} ${e.title}`}
                  aria-pressed={e.done}
                  disabled={busy}
                  onClick={() => void toggle(e)}
                >
                  <Check size={16} />
                </button>
                <div className="entry-copy">
                  <strong>{e.title}</strong>
                  {e.detail ? <p>{e.detail}</p> : null}
                  <div className="entry-meta">
                    <span className="tag">{e.assignee}</span>
                    {isTask ? (
                      <span className={isOverdue(e, today) ? "overdue" : ""}>
                        {isOverdue(e, today) ? "Atrasado · " : ""}
                        {dayLabel(e.due)}
                      </span>
                    ) : null}
                  </div>
                </div>
                {deleting === e.id ? (
                  <div className="delete-confirm">
                    <span>Excluir item?</span>
                    <button
                      disabled={busy}
                      className="danger"
                      onClick={() => {
                        void remove(e);
                        setDeleting(null);
                      }}
                    >
                      Excluir
                    </button>
                    <button onClick={() => setDeleting(null)}>Cancelar</button>
                  </div>
                ) : (
                  <button
                    disabled={busy}
                    className="icon-btn delete"
                    onClick={() => setDeleting(e.id)}
                    aria-label={`Excluir ${e.title}`}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty large">
            <Icon size={35} />
            <h2>
              {query
                ? "Nenhum resultado encontrado."
                : filter === "done"
                  ? "Os cuidados feitos vão aparecer aqui."
                  : filter === "pending" && all.length
                    ? "Tudo em dia por aqui."
                    : isTask
                      ? "Vamos dividir os cuidados?"
                      : "Nossa lista começa com um item."}
            </h2>
            <p>
              {query
                ? "Tente buscar por outro nome."
                : isTask
                  ? "Adicione uma tarefa e combinem quem vai cuidar."
                  : "Adicione o que falta e marque conforme forem comprando."}
            </p>
            {!query ? (
              <button className="secondary" onClick={() => setFormOpen(true)}>
                <Pencil size={16} />
                {isTask ? "Criar tarefa" : "Adicionar item"}
              </button>
            ) : null}
          </div>
        )}
      </section>
      <p className="helper">
        {isTask
          ? "Dividir responsabilidades também é uma forma de carinho."
          : "Mudou de ideia? Você pode desmarcar um item comprado a qualquer momento."}
      </p>
    </Shell>
  );
}
