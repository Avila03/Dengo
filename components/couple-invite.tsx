"use client";
import { useRef, useState } from "react";
import { Copy, Link2, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useDengo } from "./provider";

/** The invitation is managed only in the couple settings, with the existing RPC. */
export function CoupleInvite() {
  const { demo, memberCount, memberSlot } = useDengo();
  const [invite, setInvite] = useState<{ code: string; expires_at: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const lock = useRef(false);
  const url = invite && typeof window !== "undefined"
    ? `${window.location.origin}/?convite=${invite.code}` : "";
  async function generate() {
    if (!supabase || lock.current) return;
    lock.current = true; setBusy(true); setError(""); setCopied(false);
    try {
      const { data, error } = await supabase.rpc("create_couple_invite");
      if (error) throw new Error(error.message || "Não foi possível gerar o convite.");
      setInvite(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível gerar o convite.");
    } finally { lock.current = false; setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setError(""); }
    catch { setError("Selecione o link abaixo para copiar manualmente."); }
  }
  return <section className="panel couple-invite" aria-label="Convite do casal">
    <h3><Users size={18} /> Convite</h3>
    {demo ? <p>O convite fica disponível ao entrar com sua conta.</p>
      : memberCount >= 2 ? <p>Os dois participantes já estão no lobby.</p>
      : memberSlot !== 0 ? <p>Quem criou o lobby pode gerar o convite.</p>
      : <>
        <p>Compartilhe com seu par. O link pode ser usado uma vez e expira em sete dias.</p>
        <button type="button" className="secondary" disabled={busy} onClick={() => void generate()}>
          <Link2 size={16} /> {busy ? "Gerando…" : invite ? "Gerar novo convite" : "Gerar convite"}
        </button>
        {invite ? <div className="invite-link">
          <label>Link para compartilhar
            <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
          </label>
          <button type="button" className="primary" onClick={() => void copy()}>
            <Copy size={16} /> {copied ? "Copiado" : "Copiar link"}
          </button>
          <small>Válido até {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(invite.expires_at))}. Um novo convite invalida o anterior.</small>
        </div> : null}
      </>}
    {error ? <p className="error" role="alert">{error}</p> : null}
  </section>;
}
