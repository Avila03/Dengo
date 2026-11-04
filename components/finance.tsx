"use client";
import { useState, type FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Plus,
  Wallet,
  ArrowLeftRight,
  Pencil,
  Check,
  Repeat2,
} from "lucide-react";
import { Shell } from "./shell";
import { EntryAudit } from "./entry-audit";
import { PageHeading, DeleteButton } from "./ui";
import { useDengo } from "./provider";
import { type Entry, type Draft, localToday, dayLabel } from "@/lib/model";
import { PAYMENT_METHODS, paymentMethodLabel, isPlan, type PayMethod } from "@/lib/payment-plans";
import {
  balance,
  monthlySummary,
  parseMoney,
  money,
  CATEGORIES,
} from "@/lib/finance";
export function Finance({ embedded = false }: { embedded?: boolean }) {
  const { entries, names, preferences, busy, add, update, toggle, remove } =
    useDengo();
  const query = useSearchParams();
  const router = useRouter();
  const source = entries.find(
    (e) => e.id === query.get("compra") && e.kind === "shopping",
  );
  const linked = source
    ? entries.some(
        (e) => e.kind === "expense" && e.data?.sourceId === source.id,
      )
    : false;
  const [form, setForm] = useState<"expense" | "transfer" | null>(
      query.has("compra") ? "expense" : null,
    ),
    [editing, setEditing] = useState<Entry | null>(null),
    [month, setMonth] = useState(localToday().slice(0, 7)),
    [localError, setLocalError] = useState("");
  const totalBalance = balance(entries);
  const summary = monthlySummary(entries, month);
  const list = entries
    .filter(
      (e) =>
        ["expense", "transfer"].includes(e.kind) && !isPlan(e) && e.due.startsWith(month),
    )
    .sort((a, b) => b.due.localeCompare(a.due));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError("");
    const f = new FormData(event.currentTarget);
    try {
      const kind = form === "transfer" ? "transfer" : "expense";
      const draft: Draft = {
        kind,
        title:
          kind === "transfer"
            ? "Acerto entre nós"
            : String(f.get("title") || "").trim(),
        detail: String(f.get("detail") || ""),
        assignee: names[Number(f.get("payer"))],
        due: String(f.get("due") || localToday()),
        done: kind === "transfer" || f.get("paid") === "on",
        data: {
          ...editing?.data,
          amount: parseMoney(String(f.get("amount"))),
          payer: Number(f.get("payer")) as 0 | 1,
          shareFirst:
            kind === "transfer"
              ? 5000
              : Math.round(Number(f.get("share")) * 100),
          category: String(f.get("category") || "Outros"),
          paymentMethod: String(f.get("method") || editing?.data?.paymentMethod || "pix") as PayMethod,
          paymentPaidAt: kind==="expense" && f.get("paid")==="on"
            ? String(f.get("paymentDate") || localToday()) : undefined,
          recurrence:
            kind === "expense"
              ? (String(f.get("recurrence") || "none") as "none" | "monthly")
              : "none",
          ...(editing?.data?.sourceId
            ? { sourceId: editing.data.sourceId }
            : source && !linked && !editing
              ? { sourceId: source.id }
              : {}),
        },
      };
      const ok = editing ? await update(editing, draft) : await add(draft);
      if (ok) {
        setEditing(null);
        setForm(null);
        if (query.has("compra")) router.replace("/compras?aba=gastos", { scroll: false });
      }
    } catch (e) {
      setLocalError((e as Error).message);
    }
  }
  const content = (
    <>
      <PageHeading
        eyebrow="CONTAS CLARAS, VIDA MAIS LEVE"
        title={embedded ? "Extrato e acertos" : "Nossas finanças"}
        description="Despesas, pagamentos, divisões e acertos associados às compras e aos planos de vocês."
      >
        <button
          className="primary"
          onClick={() => {
            setForm(form ? null : "expense");
            setEditing(null);
          }}
        >
          <Plus size={18} />
          {form ? "Fechar" : "Nova despesa"}
        </button>
      </PageHeading>
      <div className="two-columns">
        <section className="panel balance-card">
          <span className="eyebrow">ACERTO ENTRE VOCÊS · TODO O HISTÓRICO</span>
          <Wallet />
          <h2>
            {totalBalance === 0
              ? "Tudo equilibrado."
              : `${names[totalBalance > 0 ? 1 : 0]} deve a ${names[totalBalance > 0 ? 0 : 1]}`}
          </h2>
          <strong className="money-value">
            {money(Math.abs(totalBalance))}
          </strong>
          <p>
            Considera despesas pagas e acertos registrados. Contas futuras não
            entram no saldo.
          </p>
          <button
            className="secondary"
            onClick={() => {
              setForm("transfer");
              setEditing(null);
            }}
          >
            <ArrowLeftRight size={16} />
            Registrar um acerto
          </button>
        </section>
        <section className="panel">
          <label>
            Mês de referência
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </label>
          <span className="eyebrow spaced">DESPESAS PAGAS NO MÊS</span>
          <strong className="money-value">{money(summary.total)}</strong>
          <p>
            {list.filter((e) => e.kind === "expense" && !e.done).length} contas
            ainda não pagas neste mês
          </p>
        </section>
      </div>
      {form ? (
        <form
          key={`${form}-${editing?.id || source?.id || "new"}`}
          className="panel entry-form"
          onSubmit={submit}
        >
          <h2>
            {editing
              ? "Editar registro"
              : form === "transfer"
                ? "Registrar dinheiro devolvido"
                : "Uma despesa do casal"}
          </h2>
          {source && !editing ? (
            <p>
              {linked
                ? "Esta compra já possui uma despesa. Edite o registro existente para corrigir valores."
                : `Compra vinculada: ${source.title}. Ao salvar, o item será marcado como comprado.`}
            </p>
          ) : null}
          <div className="form-grid">
            {form === "expense" ? (
              <label className="full">
                Descrição
                <input
                  name="title"
                  required
                  maxLength={120}
                  defaultValue={editing?.title || source?.title || ""}
                />
              </label>
            ) : null}
            <label>
              Valor em reais
              <input
                name="amount"
                inputMode="decimal"
                required
                placeholder="Ex.: 123,45"
                defaultValue={
                  editing?.data?.amount
                    ? String(editing.data.amount / 100).replace(".", ",")
                    : form === "transfer" && totalBalance
                      ? String(Math.abs(totalBalance) / 100).replace(".", ",")
                      : ""
                }
              />
            </label>
            <label>
              {form === "transfer"
                ? "Quem devolveu o dinheiro?"
                : "Quem pagou ou vai pagar?"}
              <select
                name="payer"
                defaultValue={
                  editing?.data?.payer ??
                  (form === "transfer" && totalBalance > 0 ? 1 : 0)
                }
              >
                {names.map((n, i) => (
                  <option key={i} value={i}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Forma de pagamento
              <select name="method" defaultValue={editing?.data?.paymentMethod || "pix"}>
                {PAYMENT_METHODS.map((method)=>(
                  <option key={method.value} value={method.value}>{method.label}</option>
                ))}
              </select>
            </label>
            <label>
              {form === "transfer"
                ? "Data do acerto"
                : "Data do gasto ou vencimento"}
              <input
                name="due"
                type="date"
                required
                defaultValue={editing?.due || localToday()}
              />
            </label>
            {form === "expense" ? (
              <>
                <label>
                  Categoria
                  <select
                    name="category"
                    defaultValue={editing?.data?.category || "Mercado"}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Parte de {names[0]} (%)
                  <input
                    name="share"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    required
                    defaultValue={(editing?.data?.shareFirst ?? 5000) / 100}
                  />
                  <small>
                    O restante fica para {names[1]}. Use 50 para dividir
                    igualmente.
                  </small>
                </label>
                <label>
                  Repetição
                  <select
                    name="recurrence"
                    defaultValue={editing?.data?.recurrence || "none"}
                  >
                    <option value="none">Não repetir</option>
                    <option value="monthly">Mensal</option>
                  </select>
                  <small>
                    Ao marcar como paga, criamos a próxima conta pendente.
                  </small>
                </label>
                <label>
                  Data em que pagou
                  <input type="date" name="paymentDate"
                    defaultValue={editing?.data?.paymentPaidAt || localToday()}/>
                </label>
                <label className="checkbox-label full">
                  <input
                    name="paid"
                    type="checkbox"
                    defaultChecked={editing ? editing.done : true}
                  />
                  Esta despesa já foi paga
                </label>
              </>
            ) : null}
            <label className="full">
              Observação opcional
              <input
                name="detail"
                maxLength={240}
                defaultValue={editing?.detail}
              />
            </label>
          </div>
          {localError ? (
            <p role="alert" className="error">
              {localError}
            </p>
          ) : null}
          <button
            className="primary"
            disabled={busy || !!(source && linked && !editing)}
          >
            {busy ? "Salvando…" : "Salvar registro"}
          </button>
        </form>
      ) : null}
      <section className="panel">
        <div className="section-title">
          <h2>Movimentações do mês</h2>
          <span className="tag">{list.length} registros</span>
        </div>
        {list.length ? (
          <ul className="entry-list">
            {list.map((e) => (
              <li key={e.id} className="entry">
                <span
                  className={`stat-icon ${e.kind === "transfer" ? "sage" : "blush"}`}
                >
                  {e.kind === "transfer" ? (
                    <ArrowLeftRight size={19} />
                  ) : (
                    <Wallet size={19} />
                  )}
                </span>
                <div className="entry-copy">
                  <strong>{e.title}</strong>
                  <p>
                    {dayLabel(e.due)} ·{" "}
                    {e.kind === "transfer"
                      ? `${names[e.data?.payer ?? 0]} devolveu dinheiro`
                      : `${names[e.data?.payer ?? 0]} · ${e.data?.category}`}
                  </p>
                  <div className="entry-meta">
                    <span className="tag">
                      {e.kind === "transfer"
                        ? "Acerto"
                        : e.done
                          ? "Pago"
                          : "Pendente"}
                    </span>
                    {e.data?.paymentMethod ? (
                      <span className="tag">{paymentMethodLabel(e.data.paymentMethod)}</span>
                    ):null}
                    {e.data?.paymentPlanId ? <span className="tag">Programado</span>:null}
                    {e.data?.recurrence === "monthly" ? (
                      <span className="tag">
                        <Repeat2 size={12} />
                        Mensal
                      </span>
                    ) : null}
                  </div>
                  <EntryAudit entry={e} />
                </div>
                <strong>{money(e.data?.amount || 0)}</strong>
                <div className="row-actions">
                  {e.kind === "expense" && !e.done ? (
                    <button
                      disabled={busy}
                      className="icon-btn"
                      aria-label={`Marcar ${e.title} como paga`}
                      onClick={() => void toggle(e)}
                    >
                      <Check size={18} />
                    </button>
                  ) : null}
                  <button
                    className="icon-btn"
                    aria-label={`Editar ${e.title}`}
                    onClick={() => {
                      setEditing(e);
                      setForm(e.kind === "transfer" ? "transfer" : "expense");
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
            ))}
          </ul>
        ) : (
          <div className="empty">
            <Wallet />
            <h3>Nenhuma movimentação neste mês.</h3>
            <p>Comecem pelo próximo gasto compartilhado.</p>
          </div>
        )}
      </section>
      <section className="panel setup-note">
        <h2>Orçamento por categoria</h2>
        <p>
          Defina os limites mensais em Nosso espaço. Aqui aparecem os gastos
          pagos do mês selecionado.
        </p>
        <div className="budget-grid">
          {CATEGORIES.map((c) => {
            const spent = summary.categories[c] || 0,
              limit = preferences.budgets[c] || 0;
            return (
              <div key={c}>
                <div className="budget-heading">
                  <strong>{c}</strong>
                  <span>
                    {money(spent)}
                    {limit ? ` / ${money(limit)}` : ""}
                  </span>
                </div>
                {limit ? (
                  <progress
                    max={limit}
                    value={Math.min(spent, limit)}
                    aria-label={`Orçamento de ${c}`}
                  />
                ) : (
                  <small>Sem limite definido</small>
                )}
                {limit && spent > limit ? (
                  <small className="overdue">
                    {money(spent - limit)} acima do orçamento
                  </small>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
  return embedded ? content : <Shell>{content}</Shell>;
}
