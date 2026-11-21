"use client";
import { useRef, useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { passwordChangeMessage, passwordChangeProblem, MIN_PASSWORD } from "@/lib/password";
import { CleanSheet } from "./clean-sheet";
import { useDengo } from "./provider";

/**
 * Trocar a própria senha já dentro do app. Confirma a senha atual antes
 * (o Supabase também exige um login recente para mudar a senha).
 */
export function ChangePassword() {
  const { demo } = useDengo();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const lock = useRef(false);
  if (demo || !supabase) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || lock.current) return;
    const form = new FormData(event.currentTarget);
    const current = String(form.get("current") || "");
    const next = String(form.get("password") || "");
    const confirmation = String(form.get("confirmation") || "");
    const problem = passwordChangeProblem(current, next, confirmation);
    if (problem) { setError(problem); return; }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;
      if (!email) throw { message: "" };
      const check = await supabase.auth.signInWithPassword({ email, password: current });
      if (check.error) throw check.error;
      const { error: updateError } = await supabase.auth.updateUser({ password: next });
      if (updateError) throw updateError;
      setDone(true);
    } catch (cause) {
      setError(passwordChangeMessage(cause as { message?: string; code?: string }));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="secondary spaced" onClick={() => { setOpen(true); setError(""); setDone(false); }}>
        <KeyRound size={16} /> Trocar senha
      </button>
      {open ? (
        <CleanSheet title="Trocar senha" onClose={() => !busy && setOpen(false)}>
          {done ? (
            <div className="panel entry-form change-password">
              <h2>Senha trocada.</h2>
              <p>Na próxima vez que entrar, use a senha nova.</p>
              <button type="button" className="primary" onClick={() => setOpen(false)}>Fechar</button>
            </div>
          ) : (
            <form className="panel entry-form change-password" onSubmit={submit}>
              <label className="full">
                Senha atual
                <input name="current" type="password" autoComplete="current-password" required />
              </label>
              <label className="full">
                Nova senha
                <input name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} required />
              </label>
              <label className="full">
                Repita a nova senha
                <input name="confirmation" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} required />
              </label>
              <p className="helper">Pelo menos {MIN_PASSWORD} caracteres. Você continua conectado neste aparelho.</p>
              {error ? <p className="error" role="alert">{error}</p> : null}
              <button type="submit" className="primary" disabled={busy}>
                <KeyRound size={16} /> {busy ? "Trocando…" : "Trocar senha"}
              </button>
            </form>
          )}
        </CleanSheet>
      ) : null}
    </>
  );
}
