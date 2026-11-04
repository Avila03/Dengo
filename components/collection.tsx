"use client";
import { Fragment, useState, type FormEvent } from "react";
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
import { money, parseMoney, CATEGORIES } from "@/lib/finance";
import { makePurchaseExpense, plannedShoppingTotal, relatedShoppingExpense, shoppingStatus } from "@/lib/shopping";
import { PAYMENT_METHODS, type PayMethod } from "@/lib/payment-plans";
import { EntryAudit } from "./entry-audit";
import { DeleteButton } from "./ui";
import { useDengo } from "./provider";
import { filterResponsible, sortTaskEntries, taskSection, TASK_SECTION_LABELS, type ResponsibleFilter } from "@/lib/task-filters";
import {
  dayLabel,
  localToday,
  isOverdue,
  type Entry,
  type Draft,
} from "@/lib/model";
export function Collection({ kind, embedded = false }: { kind: "shopping" | "task"; embedded?: boolean }) {
  const { entries, names, memberSlot, busy, add, update, toggle, remove } = useDengo();
  const [formOpen, setFormOpen] = useState(false),
    [editing, setEditing] = useState<Entry | null>(null),
    [filter, setFilter] = useState("pending"),
    [query, setQuery] = useState(""),
    [responsible, setResponsible] = useState<ResponsibleFilter>("all"),
    [quickPurchaseId, setQuickPurchaseId] = useState<string | null>(null),
    [localError, setLocalError] = useState("");
  const isTask = kind === "task";
  const all = entries.filter((e) => e.kind === kind),
    pending = all.filter((e) => !e.done).length;
  const today = localToday();
  const overdue = isTask ? all.filter((e) => isOverdue(e, today)).length : 0;
  const filtered = all.filter(
    (e) =>
      (filter === "all" || (filter === "done" ? e.done : !e.done)) &&
      (!isTask || filterResponsible(e, responsible, names as [string, string], memberSlot)) &&
      e.title.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")),
  );
  const items = isTask ? sortTaskEntries(filtered, today) : filtered;
  const Icon = isTask ? ListChecks : ShoppingBag;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError("");
    const f = new FormData(event.currentTarget);
    let budget = editing?.data?.budget || 0;
    try {
      if (kind === "shopping") {
        const text = String(f.get("budget") || "").trim();
        budget = text ? parseMoney(text) : 0;
      }
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Valor previsto inválido.");
      return;
    }
    const draft: Draft = {
      kind,
      title: String(f.get("title") || "").trim(),
      detail: String(f.get("detail") || "").trim(),
      assignee: String(f.get("assignee") || "Nós dois"),
      due: String(f.get("due") || ""),
      done: editing?.done ?? false,
      data: {
        ...editing?.data,
        ...(isTask ? {} : { budget }),
        recurrence: String(f.get("recurrence") || "none") as
          "none" | "daily" | "weekly" | "monthly",
        alternate: f.get("alternate") === "on",
      },
    };
    if (await (editing ? update(editing, draft) : add(draft))) {
      setFormOpen(false);
      setEditing(null);
    } else setLocalError("Não foi possível salvar este registro. Tente novamente.");
  }
  async function registerPurchase(event: FormEvent<HTMLFormElement>, item: Entry) {
    event.preventDefault();
    setLocalError("");
    if (relatedShoppingExpense(item, entries)) {
      setLocalError("Esta compra já possui um gasto registrado.");
      return;
    }
    const form = new FormData(event.currentTarget);
    try {
      const draft = makePurchaseExpense(item, {
        amount: String(form.get("amount") || ""),
        payer: Number(form.get("payer") || 0) as 0 | 1,
        shareFirst: Number(form.get("share") || 5000) as 0 | 5000 | 10000,
        paid: form.get("paid") === "on",
        date: String(form.get("date") || localToday()),
        category: String(form.get("category") || "Mercado"),
        method: String(form.get("method") || "pix") as PayMethod,
        names: names as [string, string],
      });
      if (await add(draft)) setQuickPurchaseId(null);
      else setLocalError("Não foi possível registrar o gasto. Tente novamente.");
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Confira os dados da compra.");
    }
  }
  const content = (
    <>
      <section className={embedded ? "page-heading purchases-inner-heading" : "page-heading"}>
        <div>
          <span className="eyebrow">
            {isTask ? "CUIDADO QUE SE COMPARTILHA" : "DO QUE A GENTE PRECISA"}
          </span>
          {embedded && !isTask ? (
            <h2 className="shopping-inline-title">Nossa lista de compras</h2>
          ) : (
            <h1>
              {isTask ? "Compromissos" : "Nossa lista de compras"}
              <span className="rose">.</span>
            </h1>
          )}
          <p>
            {isTask
              ? "Tarefas a realizar, prazos e quem fica responsável por cada uma."
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
          {formOpen ? "Fechar" : isTask ? "Nova tarefa" : "Adicionar item"}
        </button>
      </section>
      <div className="list-summary">
        <Icon size={22} />
        <span>
          <strong>
            {pending} {isTask ? "compromissos pendentes" : "itens na lista"}
          </strong>{" "}
          · {all.length - pending} {isTask ? "concluídos" : "comprados"}
          {isTask && overdue ? <span className="task-overdue-summary"> · {overdue} atrasados</span> : null}
          {!isTask && plannedShoppingTotal(entries) ? (
            <span> · Previsão dos itens pendentes: {money(plannedShoppingTotal(entries))}</span>
          ) : null}
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
            {!isTask ? (
              <label>
                Valor previsto (R$) · opcional
                <input name="budget" inputMode="decimal" placeholder="Ex.: 49,90"
                  defaultValue={editing?.data?.budget
                    ? String(editing.data.budget / 100).replace(".", ",") : ""} />
              </label>
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
          {localError && !quickPurchaseId ? <p className="error" role="alert">{localError}</p> : null}
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
          {isTask ? (
            <label className="task-responsible">
              <span>Responsável</span>
              <select value={responsible} onChange={(event) => setResponsible(event.target.value as ResponsibleFilter)}>
                <option value="all">Todos</option>
                <option value="mine">Comigo · {names[memberSlot]}</option>
                <option value="partner">Com {names[1 - memberSlot]}</option>
                <option value="together">Nós dois</option>
              </select>
            </label>
          ) : null}
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
            {items.map((e, index) => {
              const linkedExpense = !isTask ? relatedShoppingExpense(e, entries) : undefined;
              const purchaseState = !isTask ? shoppingStatus(e, entries) : "planned";
              const section = isTask ? taskSection(e, today) : null;
              const previousSection = isTask && index > 0 ? taskSection(items[index - 1], today) : null;
              return (
                <Fragment key={e.id}>
                  {section && section !== previousSection ? (
                    <li className={"task-section-title" + (section === "overdue" ? " overdue" : "")}>
                      {TASK_SECTION_LABELS[section]}
                    </li>
                  ) : null}
                <li className={`entry ${e.done ? "done" : ""}${isTask && isOverdue(e, today) ? " task-entry-overdue" : ""}`}>
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
                      {!isTask ? (
                        <span className={"tag purchase-status " + purchaseState}>
                          {{ planned: "A comprar", bought: "Comprado sem gasto",
                            "payment-pending": "Pagamento pendente", paid: "Pago" }[purchaseState]}
                        </span>
                      ) : null}
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
                    {!isTask && e.data?.budget ? (
                      <p className="purchase-budget-line">Previsão: {money(e.data.budget)}</p>
                    ) : null}
                    {!isTask && linkedExpense?.data?.amount ? (
                      <p className="purchase-amount-line">Gasto: {money(linkedExpense.data.amount)}
                        {" · "}{linkedExpense.done ? "pago" : "a pagar"}
                      </p>
                    ) : null}
                    <EntryAudit entry={e} />
                  </div>
                  <div className="row-actions">
                    {!isTask ? (
                      linkedExpense ? (
                        <Link className="icon-btn" aria-label={"Ver gasto de " + e.title}
                          href="/compras?aba=gastos"><Wallet size={18} /></Link>
                      ) : (
                        <button type="button" className="icon-btn"
                          aria-label={"Registrar valor de " + e.title}
                          aria-expanded={quickPurchaseId === e.id}
                          onClick={() => {
                            setLocalError("");
                            setQuickPurchaseId((current) => current === e.id ? null : e.id);
                          }}>
                          <Wallet size={18} />
                        </button>
                      )
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
                  {!isTask && quickPurchaseId === e.id && !linkedExpense ? (
                    <form className="purchase-quick-form" onSubmit={(event) => void registerPurchase(event, e)}>
                      <div className="purchase-quick-heading">
                        <strong>Registrar compra · {e.title}</strong>
                        <button type="button" className="icon-btn" aria-label="Fechar registro"
                          onClick={() => setQuickPurchaseId(null)}><X size={17} /></button>
                      </div>
                      <div className="purchase-quick-fields">
                        <label>Valor pago ou a pagar (R$)
                          <input name="amount" required inputMode="decimal"
                            defaultValue={e.data?.budget
                              ? String(e.data.budget / 100).replace(".", ",") : ""}
                            placeholder="Ex.: 49,90" />
                        </label>
                        <label>Quem pagou ou vai pagar?
                          <select name="payer" defaultValue={names.indexOf(e.assignee) === 1 ? "1" : "0"}>
                            {names.map((name, index) => <option key={name} value={index}>{name}</option>)}
                          </select>
                        </label>
                        <label>Como dividir?
                          <select name="share" defaultValue="5000">
                            <option value="5000">50% para cada</option>
                            <option value="10000">100% para {names[0]}</option>
                            <option value="0">100% para {names[1]}</option>
                          </select>
                        </label>
                        <label>Categoria
                          <select name="category" defaultValue="Mercado">
                            {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                          </select>
                        </label>
                        <label>Forma de pagamento
                          <select name="method" defaultValue="pix">
                            {PAYMENT_METHODS.map(m => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                        </label>
                        <label>Data
                          <input name="date" type="date" defaultValue={localToday()} required />
                        </label>
                        <label className="checkbox-label purchase-paid-label">
                          <input type="checkbox" name="paid" defaultChecked /> Já foi pago
                        </label>
                      </div>
                      {localError ? <p className="error" role="alert">{localError}</p> : null}
                      <div className="purchase-quick-actions">
                        <button type="submit" className="primary" disabled={busy}>
                          <Check size={16} /> {busy ? "Salvando…" : "Salvar compra e gasto"}
                        </button>
                        <button type="button" className="secondary" onClick={() => setQuickPurchaseId(null)}>Cancelar</button>
                      </div>
                      <small>O item será marcado como comprado. O saldo do casal só considera gastos já pagos.</small>
                    </form>
                  ) : null}
                </li>
                </Fragment>
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
          : "Toque no ícone da carteira para registrar o valor, quem pagou e a divisão sem sair da lista."}
      </p>
    </>
  );
  return embedded ? content : <Shell>{content}</Shell>;
}
