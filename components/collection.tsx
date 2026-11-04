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
import { RepeatFields } from "./repeat-fields";
import { EntryDetails } from "./entry-details";
import { Shell } from "./shell";
import { CleanSheet } from "./clean-sheet";
import { money, parseMoney, CATEGORIES } from "@/lib/finance";
import { makePurchaseExpense, relatedShoppingExpense, shoppingStatus } from "@/lib/shopping";
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
    [showSearch, setShowSearch] = useState(false),
    [responsible, setResponsible] = useState<ResponsibleFilter>("all"),
    [quickPurchaseId, setQuickPurchaseId] = useState<string | null>(null),
    [localError, setLocalError] = useState(""),
    [recurrence, setRecurrence] = useState<"none" | "daily" | "weekly" | "monthly">("none"),
    [preview, setPreview] = useState<Entry | null>(null);
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
  function editEntry(entry: Entry) {
    setEditing(entry); setRecurrence(entry.data?.recurrence || "none");
    setPreview(null); setLocalError(""); setFormOpen(true);
  }
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
      <section className={embedded ? "clean-embedded-collection-head" : "page-heading clean-task-heading"}>
        {!embedded ? (
          <div>
            <h1>{isTask ? "Responsabilidades" : "Lista de compras"}<span className="rose">.</span></h1>
            <p>{all.length === 0
              ? "Um lugar simples para organizar o que precisa ser feito."
              : pending + (isTask ? " pendentes" : " para comprar") +
                " · " + (all.length - pending) + (isTask ? " concluídas" : " comprados") +
                (isTask && overdue ? " · " + overdue + " atrasadas" : "")}</p>
          </div>
        ) : (
          all.length > 0 ? (
            <p className="clean-embedded-count" aria-live="polite">
              {pending} para comprar · {all.length-pending} comprados
            </p>
          ) : null
        )}
        <button type="button" className="primary clean-create-button"
          aria-expanded={formOpen} aria-controls="new-entry"
          onClick={() => {setFormOpen(!formOpen);setEditing(null);setRecurrence("none");setLocalError("");}}>
          {formOpen ? <X size={17}/> : <Plus size={17}/>}
          {formOpen ? "Fechar" : isTask ? "Nova responsabilidade" : "Adicionar item"}
        </button>
      </section>
      {formOpen ? (
        <CleanSheet title={editing ? "Editar " + editing.title : isTask ? "Nova responsabilidade" : "Adicionar item"}
          onClose={() => {setFormOpen(false);setEditing(null);}}>
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
              {isTask ? "Nome da responsabilidade" : "Nome do item"}
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
                <RepeatFields value={recurrence} onChange={setRecurrence} task alternate={editing?.data?.alternate} />
              </>
            ) : null}
            {!isTask ? (
              <label>
                Valor previsto (R$)
                <input name="budget" inputMode="decimal" placeholder="Ex.: 49,90"
                  defaultValue={editing?.data?.budget
                    ? String(editing.data.budget / 100).replace(".", ",") : ""} />
              </label>
            ) : null}
            <details className="form-details full" open={editing?.detail ? true : undefined}>
              <summary>{isTask ? "Observação" : "Quantidade ou observação"}</summary>
            <label className="full">
              {isTask ? "Observação" : "Quantidade ou observação"}
              <input
                name="detail"
                maxLength={240}
                defaultValue={editing?.detail}
                placeholder={
                  isTask ? "Algum detalhe importante?" : "Ex.: 2 pacotes"
                }
              />
            </label>
            </details>
          </div>
          {localError && !quickPurchaseId ? <p className="error" role="alert">{localError}</p> : null}
          <button className="primary" disabled={busy}>
            <Plus size={18} />
            {busy ? "Salvando…" : "Salvar"}
          </button>
        </form>
        </CleanSheet>
      ) : null}
      <section className={all.length ? "panel clean-list-panel" : "clean-list-empty-wrap"}>
        {all.length > 0 ? (
          <div className="clean-list-controls">
            <div className="filters clean-list-filters" role="group" aria-label="Filtrar lista">
              {[
                ["pending", isTask ? "Pendentes" : "Faltando"],
                ["done", isTask ? "Concluídas" : "Comprados"],
                ["all", "Todos"],
              ].map(([key, label]) => (
                <button type="button" key={key} aria-pressed={filter === key}
                  className={filter === key ? "selected" : ""}
                  onClick={() => setFilter(key)}>
                  {label}
                </button>
              ))}
            </div>
            <div className="clean-list-tools">
              <button type="button" className="clean-search-toggle"
                aria-label={showSearch || query ? "Ocultar busca" : "Buscar na lista"}
                aria-expanded={showSearch || Boolean(query)}
                onClick={() => {
                  if (showSearch || query) {setShowSearch(false);setQuery("");}
                  else setShowSearch(true);
                }}>
                {showSearch || query ? <X size={17}/> : <Search size={17}/>}
                <span>{showSearch || query ? "Fechar busca" : "Buscar"}</span>
              </button>
            </div>
            {showSearch || query ? (
              <label className="search clean-expanded-search">
                <Search size={16}/>
                <input type="search" aria-label="Buscar na lista"
                  value={query} onChange={event => setQuery(event.target.value)}
                  placeholder={isTask ? "Nome da responsabilidade" : "Nome do item"}
                  autoFocus />
              </label>
            ) : null}
          </div>
        ) : null}
        {isTask && all.length > 0 ? <div className="responsibility-filters" role="group" aria-label="Filtrar por responsável">
          {([["all", "Todas"], ["mine", "Minhas"], ["partner", "Da outra pessoa"], ["together", "Dos dois"]] as const).map(([key, label]) => (
            <button type="button" key={key} aria-pressed={responsible === key}
              className={responsible === key ? "selected" : ""} onClick={() => setResponsible(key)}>{label}</button>
          ))}
        </div> : null}
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
                    <button type="button" className="entry-title-button" aria-label={"Ver detalhes de " + e.title}
                      onClick={() => setPreview(e)}>{e.title}</button>
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
                          {isOverdue(e, today) ? "Atrasada · " : ""}
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
                  <div className="clean-entry-actions">
                    {!isTask ? (
                      linkedExpense ? (
                        <Link className="clean-entry-payment" aria-label={"Ver gasto de " + e.title}
                          href={"/compras?aba=gastos&registro=" + linkedExpense.id}><Wallet size={16} /> Ver gasto</Link>
                      ) : (
                        <button type="button" className="clean-entry-payment"
                          aria-label={"Registrar valor de " + e.title}
                          aria-expanded={quickPurchaseId === e.id}
                          onClick={() => {
                            setLocalError("");
                            setQuickPurchaseId((current) => current === e.id ? null : e.id);
                          }}>
                          <Wallet size={16} /> Registrar gasto
                        </button>
                      )
                    ) : null}
                    <details className="clean-item-menu">
                      <summary aria-label={"Mais ações para " + e.title}>Opções</summary>
                      <div className="row-actions">
                        <button type="button" className="secondary"
                          aria-label={`Editar ${e.title}`}
                          onClick={() => editEntry(e)}>
                          <Pencil size={16} /> Editar
                        </button>
                        <DeleteButton label={e.title} disabled={busy}
                          onDelete={() => void remove(e)} />
                      </div>
                    </details>
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
                        <details className="form-details full">
                          <summary>Divisão e pagamento</summary>
                          <div className="form-grid">
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
                          </div>
                        </details>
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
          <div className="clean-collection-empty" role="status">
            <Icon size={21} strokeWidth={1.7}/>
            <div>
              <strong>{!all.length
                ? isTask ? "Nenhuma responsabilidade por enquanto" : "Nenhum item na lista"
                : query ? "Nenhum resultado para essa busca"
                : filter === "done" ? isTask ? "Nenhuma responsabilidade concluída" : "Nenhum item comprado"
                : filter === "pending" ? isTask ? "Sem responsabilidades pendentes" : "Nada faltando por enquanto"
                : "Nada nesta seleção"}</strong>
              <p>{!all.length
                ? isTask ? "Use “Nova responsabilidade” para começar." : "Use “Adicionar item” para começar."
                : query ? "Tente outro nome."
                : "Se quiser, veja os outros itens da lista."}</p>
              {all.length > 0 && (filter !== "all" || query || responsible !== "all") ? (
                <button type="button" className="text-link"
                  onClick={() => {setFilter("all");setQuery("");setResponsible("all");}}>
                  Ver todos os registros
                </button>
              ) : null}
            </div>
          </div>
        )}
      </section>
      {preview ? <EntryDetails entry={entries.find((e) => e.id === preview.id) || preview}
        onClose={() => setPreview(null)} onEdit={editEntry} /> : null}
    </>
  );
  return embedded ? content : <Shell>{content}</Shell>;
}
