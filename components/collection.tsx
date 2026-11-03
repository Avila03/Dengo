"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Plus,
  Check,
  ShoppingBag,
  ListChecks,
  Search,
  X,
  Pencil,
  Repeat2,
  Wallet,
} from "lucide-react";
import { Shell } from "./shell";
import { DeleteButton } from "./ui";
import { useDengo } from "./provider";
import {
  dayLabel,
  localToday,
  isOverdue,
  type Entry,
  type Draft,
} from "@/lib/model";
export function Collection({ kind }: { kind: "shopping" | "task" }) {
  const { entries, names, busy, add, update, toggle, remove } = useDengo();
  const [formOpen, setFormOpen] = useState(false),
    [editing, setEditing] = useState<Entry | null>(null),
    [filter, setFilter] = useState("pending"),
    [query, setQuery] = useState("");
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
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const draft: Draft = {
      kind,
      title: String(f.get("title") || "").trim(),
      detail: String(f.get("detail") || "").trim(),
      assignee: String(f.get("assignee") || "Nós dois"),
      due: String(f.get("due") || ""),
      done: editing?.done ?? false,
      data: {
        ...editing?.data,
        recurrence: String(f.get("recurrence") || "none") as
          "none" | "daily" | "weekly" | "monthly",
        alternate: f.get("alternate") === "on",
      },
    };
    if (await (editing ? update(editing, draft) : add(draft))) {
      setFormOpen(false);
      setEditing(null);
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
          onClick={() => {
            setFormOpen(!formOpen);
            setEditing(null);
          }}
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
        <form
          key={editing?.id || "new"}
          id="new-entry"
          className="panel entry-form"
          onSubmit={submit}
        >
          <h2>
            {editing
              ? "Editar registro"
              : isTask
                ? "Um novo combinado"
                : "O que vamos comprar?"}
          </h2>
          <div className="form-grid">
            <label className="full">
              {isTask ? "Nome da tarefa" : "Nome do item"}
              <input
                name="title"
                autoFocus
                required
                maxLength={120}
                defaultValue={editing?.title}
                placeholder={
                  isTask ? "Ex.: Regar as plantas" : "Ex.: Café para a semana"
                }
              />
            </label>
            <label>
              {isTask ? "Quem vai cuidar?" : "Quem vai comprar?"}
              <select
                name="assignee"
                defaultValue={editing?.assignee || "Nós dois"}
              >
                {["Nós dois", ...names].map((n, i) => (
                  <option key={`${n}-${i}`}>{n}</option>
                ))}
              </select>
            </label>
            {isTask ? (
              <>
                <label>
                  Data inicial ou prazo
                  <input type="date" name="due" defaultValue={editing?.due} />
                </label>
                <label>
                  Repetição
                  <select
                    name="recurrence"
                    defaultValue={editing?.data?.recurrence || "none"}
                  >
                    <option value="none">Não repetir</option>
                    <option value="daily">Diária</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensal</option>
                  </select>
                </label>
                <label className="checkbox-label">
                  <input
                    name="alternate"
                    type="checkbox"
                    defaultChecked={editing?.data?.alternate}
                  />
                  Alternar responsável a cada repetição
                </label>
                <p className="helper full">
                  Concluir uma tarefa repetida cria a próxima ocorrência. Para
                  alternar, escolha uma das duas pessoas como responsável. Ao
                  editar, a alteração vale para esta ocorrência; as já criadas
                  ficam preservadas.
                </p>
              </>
            ) : null}
            <label className="full">
              {isTask ? "Observação opcional" : "Quantidade ou observação"}
              <input
                name="detail"
                maxLength={240}
                defaultValue={editing?.detail}
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
            {items.map((e) => {
              const linked = entries.some(
                (i) => i.kind === "expense" && i.data?.sourceId === e.id,
              );
              return (
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
                      {e.data?.recurrence && e.data.recurrence !== "none" ? (
                        <span className="tag">
                          <Repeat2 size={12} />
                          {
                            {
                              daily: "Diária",
                              weekly: "Semanal",
                              monthly: "Mensal",
                            }[e.data.recurrence]
                          }
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="row-actions">
                    {!isTask ? (
                      <Link
                        className="icon-btn"
                        aria-label={
                          linked
                            ? "Ver finanças"
                            : `Registrar despesa de ${e.title}`
                        }
                        href={linked ? "/financas" : `/financas?compra=${e.id}`}
                      >
                        <Wallet size={18} />
                      </Link>
                    ) : null}
                    <button
                      className="icon-btn"
                      aria-label={`Editar ${e.title}`}
                      onClick={() => {
                        setEditing(e);
                        setFormOpen(true);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      <Pencil size={17} />
                    </button>
                    <DeleteButton
                      label={e.title}
                      disabled={busy}
                      onDelete={() => void remove(e)}
                    />
                  </div>
                </li>
              );
            })}
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
              <button
                className="secondary"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
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
          : "O botão de carteira transforma uma compra em despesa sem preencher a descrição novamente."}
      </p>
    </Shell>
  );
}
