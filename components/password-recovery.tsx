"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Heart, LockKeyhole, ArrowLeft, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function PasswordRecovery() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    if (!supabase) {
      setChecking(false);
      return;
    }
    void supabase.auth.getUser().then(({ data }) => {
      if (live) {
        setAuthenticated(Boolean(data.user));
        setChecking(false);
      }
    }).catch(() => { if (live) setChecking(false); });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!live) return;
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setAuthenticated(Boolean(session?.user));
        setChecking(false);
      }
      if (event === "SIGNED_OUT") setAuthenticated(false);
    });
    return () => { live = false; data.subscription.unsubscribe(); };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || busy || !authenticated) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmation = String(form.get("confirmation") || "");
    if (password.length < 8 || password !== confirmation) {
      setError("A senha precisa ter pelo menos 8 caracteres e ser igual nos dois campos.");
      return;
    }
    setBusy(true);
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) setError("Não foi possível redefinir. Solicite um novo link e tente novamente.");
    else {
      setDone(true);
      await supabase.auth.signOut();
    }
    setBusy(false);
  }

  return (
    <main className="login">
      <div className="brand"><Heart fill="currentColor" /> dengo<span>um lugar para nós</span></div>
      <section className="panel login-form">
        {done ? <ShieldCheck size={32} /> : <LockKeyhole size={32} />}
        <h1>{done ? "Senha atualizada!" : "Uma nova senha para você."}</h1>
        {done ? <p>Seu acesso foi atualizado. Entre novamente com a nova senha.</p>
          : checking ? <p>Verificando seu link com segurança…</p>
          : !authenticated ? <p>O link não está válido ou expirou. Volte ao login e solicite outro e-mail de recuperação.</p>
          : <form className="entry-form" onSubmit={submit}>
              <p>Crie uma nova senha de acesso à sua conta pessoal.</p>
              <label>Nova senha<input name="password" type="password" minLength={8} autoComplete="new-password" required /></label>
              <label>Confirme a nova senha<input name="confirmation" type="password" minLength={8} autoComplete="new-password" required /></label>
              {error ? <p role="alert" className="error">{error}</p> : null}
              <button className="primary" disabled={busy}>{busy ? "Atualizando…" : "Salvar nova senha"}</button>
            </form>}
        <button type="button" className="secondary" onClick={() => router.replace("/")}>
          <ArrowLeft size={16} /> Voltar ao Dengo
        </button>
      </section>
    </main>
  );
}
