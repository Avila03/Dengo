"use client";
import { useRef, useState } from "react";
import { DoorOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { leaveCoupleMessage, vacantSlot } from "@/lib/lobby";
import { CleanSheet } from "./clean-sheet";
import { useDengo } from "./provider";

/**
 * Sair do casal. Os registros ficam com quem permanece; a última pessoa só sai
 * confirmando a exclusão do espaço, digitando o nome dele.
 */
export function LeaveCouple() {
  const { demo, memberCount, memberSlot, preferences, refresh } = useDengo();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  if (demo || !supabase) return null;

  const alone = memberCount <= 1;
  // Quem permanece ocupa o lugar que não é o seu.
  const partnerName = preferences.names[vacantSlot(memberSlot)];
  const title = preferences.title.trim();
  const confirmed = !alone || typed.trim().toLowerCase() === title.toLowerCase();

  async function leave() {
    if (!supabase || lock.current || !confirmed) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.rpc("leave_couple", { p_delete_space: alone });
      if (error) throw new Error(leaveCoupleMessage(error));
      setOpen(false);
      router.replace("/");
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : leaveCoupleMessage({}));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="secondary spaced" onClick={() => { setOpen(true); setTyped(""); setError(""); }}>
        <DoorOpen size={16} /> {alone ? "Sair e apagar o espaço" : "Sair do casal"}
      </button>
      {open ? (
        <CleanSheet title={alone ? "Apagar o espaço e sair" : "Sair do casal"} onClose={() => !busy && setOpen(false)}>
          <div className="panel entry-form leave-couple">
            {alone ? (
              <>
                <h2>Você é a única pessoa neste espaço.</h2>
                <p>
                  Ao sair, o espaço <strong>{title}</strong> e todos os registros (agenda, responsabilidades,
                  financeiro, lugares e filmes) serão apagados para sempre. Não há como desfazer.
                </p>
                <label className="full">
                  Para confirmar, digite o nome do espaço
                  <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" placeholder={title} />
                </label>
              </>
            ) : (
              <>
                <h2>Sair do espaço {title}?</h2>
                <p>
                  Você perde o acesso aos registros do casal em todos os seus aparelhos. Tudo continua com{" "}
                  <strong>{partnerName}</strong>, que poderá convidar outra pessoa.
                </p>
                <p className="helper">
                  Para voltar, será preciso um novo convite. Sua conta continua existindo e pode criar ou entrar em outro casal.
                </p>
              </>
            )}
            {error ? <p className="error" role="alert">{error}</p> : null}
            <div className="form-grid">
              <button type="button" className="secondary" disabled={busy} onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button type="button" className="primary" disabled={busy || !confirmed} onClick={() => void leave()}>
                <DoorOpen size={16} />
                {busy ? "Saindo…" : alone ? "Apagar e sair" : "Sair do casal"}
              </button>
            </div>
          </div>
        </CleanSheet>
      ) : null}
    </>
  );
}
