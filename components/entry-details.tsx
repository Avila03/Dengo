"use client";
import { useState } from "react";
import { Check, Pencil } from "lucide-react";
import type { Entry } from "@/lib/model";
import { dayLabel } from "@/lib/model";
import { money } from "@/lib/finance";
import { paymentMethodLabel } from "@/lib/payment-plans";
import { useDengo } from "./provider";
import { CleanSheet } from "./clean-sheet";
import { DeleteButton } from "./ui";
import { EntryAudit } from "./entry-audit";

/** Tappable list titles open the same compact detail sheet in tasks and finances. */
export function EntryDetails({ entry, onClose, onEdit }: {
  entry: Entry;
  onClose: () => void;
  onEdit: (entry: Entry) => void;
}) {
  const { busy, update, remove, names } = useDengo();
  const [error, setError] = useState("");
  const financial = entry.kind === "expense" || entry.kind === "transfer";
  const completeLabel = entry.kind === "expense" ? "Marcar como pago" : entry.kind === "shopping" ? "Marcar como comprado" : "Concluir";
  async function complete() {
    setError("");
    if (await update(entry, {
      kind: entry.kind, title: entry.title, detail: entry.detail, assignee: entry.assignee,
      due: entry.due, data: entry.data, done: !entry.done,
    })) onClose();
    else setError("Não foi possível atualizar. Tente novamente.");
  }
  return <CleanSheet title={entry.title} onClose={onClose}>
    <div className="record-details">
      <span className="tag">{entry.done ? financial ? "Pago" : "Concluído" : "Pendente"}</span>
      {financial ? <strong className="money-value">{money(entry.data?.amount || 0)}</strong> : null}
      <dl>
        <div><dt>{financial ? "Quem paga" : "Responsável"}</dt><dd>{financial ? names[entry.data?.payer ?? 0] : entry.assignee}</dd></div>
        <div><dt>{financial ? "Data" : "Prazo"}</dt><dd>{dayLabel(entry.due)}</dd></div>
        {entry.data?.category ? <div><dt>Categoria</dt><dd>{entry.data.category}</dd></div> : null}
        {financial && entry.kind === "expense" ? <div><dt>Divisão</dt><dd>{names[0]}: {(entry.data?.shareFirst ?? 5000) / 100}% · {names[1]}: {100 - (entry.data?.shareFirst ?? 5000) / 100}%</dd></div> : null}
        {entry.data?.paymentMethod ? <div><dt>Pagamento</dt><dd>{paymentMethodLabel(entry.data.paymentMethod)}</dd></div> : null}
        {entry.data?.recurrence && entry.data.recurrence !== "none" ? <div><dt>Repetição</dt><dd>{{ daily: "Todo dia", weekly: "Toda semana", monthly: "Todo mês" }[entry.data.recurrence]}</dd></div> : null}
      </dl>
      {entry.detail ? <p>{entry.detail}</p> : null}
      <EntryAudit entry={entry} />
      {error ? <p className="error" role="alert">{error}</p> : null}
      <div className="record-detail-actions">
        {entry.kind !== "transfer" ? <button type="button" className="primary" disabled={busy} onClick={() => void complete()}>
          <Check size={17} /> {entry.done ? "Reabrir" : completeLabel}
        </button> : null}
        <button type="button" className="secondary" disabled={busy} onClick={() => onEdit(entry)}><Pencil size={17} /> Editar</button>
        <DeleteButton label={entry.title} disabled={busy} onDelete={() => void (async () => {
          if (await remove(entry)) onClose();
          else setError("Não foi possível excluir. Tente novamente.");
        })()} />
      </div>
    </div>
  </CleanSheet>;
}
