"use client";
import type { Entry } from "@/lib/model";
import { authorName } from "@/lib/lobby";
import { useDengo } from "./provider";
export function EntryAudit({ entry }: { entry: Entry }) {
  const { names } = useDengo();
  const creator = authorName(entry.created_by_slot, names);
  const updated = entry.updated_at ? new Date(entry.updated_at) : null;
  return (
    <details className="entry-audit">
      <summary>
        {entry.created_by_slot === 0 || entry.created_by_slot === 1
          ? `Adicionado por ${creator}`
          : "Autoria anterior não registrada"}
      </summary>
      <span>
        {updated && !Number.isNaN(updated.valueOf())
          ? `Última alteração por ${authorName(entry.updated_by_slot, names)} em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(updated)}`
          : "Sem alterações registradas."}
      </span>
    </details>
  );
}
