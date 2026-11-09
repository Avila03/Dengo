"use client";
import { Brand } from "./brand";
import { useState, useEffect, useRef, type FormEvent } from "react";
import {
  Heart,
  Plus,
  Link2,
  ArrowRight,
  LogOut,
  Users,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { invitationCode } from "@/lib/lobby";
import { personNameError } from "@/lib/model";
import { useDengo } from "./provider";
import { LeaveCouple } from "./leave-couple";
export function Lobby({
  loading,
  onEnter,
}: {
  loading: boolean;
  onEnter: () => void;
}) {
  const {
    user,
    spaceId,
    memberCount,
    memberSlot,
    preferences,
    demo,
    error,
    refresh,
    signOut,
  } = useDengo();
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join" | null>(null),
    [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [localError, setLocalError] = useState("");
  const lock = useRef(false);
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("convite");
    if (c) {
      setCode(c);
      setMode("join");
    }
  }, []);
  async function run(fn: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setLocalError("");
    try {
      await fn();
    } catch (e) {
      setLocalError((e as Error).message);
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    await run(async () => {
      const nameError = personNameError(String(f.get("name") || ""));
      if (nameError) throw new Error(nameError);
      const rpc = mode === "create" ? "create_couple" : "join_couple";
      const params =
        mode === "create"
          ? {
              p_space_name: String(f.get("title") || "").trim(),
              p_person_name: String(f.get("name") || "").trim(),
            }
          : {
              p_code: invitationCode(code),
              p_person_name: String(f.get("name") || "").trim(),
            };
      const { error } = await supabase!.rpc(rpc, params);
      if (error)
        throw new Error(
          error.message || "Não foi possível configurar o casal.",
        );
      setCode("");
      setMode(null);
      router.replace("/");
      refresh();
    });
  }
  return (
    <main className="lobby">
      <header className="lobby-header">
        <Brand tagline />
        <button className="secondary" onClick={signOut} disabled={demo}>
          <LogOut size={16} />
          Sair da conta
        </button>
      </header>
      <section className="lobby-heading">
        <span className="eyebrow">SEU LOGIN, NOSSO COTIDIANO</span>
        <h1>
          {spaceId ? "Um espaço para vocês." : "A nossa história começa aqui."}
        </h1>
        <p>
          {demo
            ? "Esta prévia funciona só neste navegador. O lobby com convite exige login e banco conectado."
            : `Você entrou como ${user?.email || "uma conta pessoal"}. Cada pessoa mantém seu próprio acesso.`}
        </p>
      </section>
      {error || localError ? (
        <div role="alert" className="error">
          {localError || error}
          <button onClick={refresh}>
            <RefreshCw size={15} />
            Atualizar
          </button>
        </div>
      ) : null}
      {demo ? (
        <section className="panel">
          <h2>Conheça o espaço demonstrativo.</h2>
          <p>Sem convite ou compartilhamento entre aparelhos nesta prévia.</p>
          <button className="primary" onClick={onEnter}>
            Abrir demonstração <ArrowRight size={17} />
          </button>
        </section>
      ) : loading ? (
        <section className="panel empty" role="status">
          <Heart />
          <p>Buscando seu espaço…</p>
        </section>
      ) : spaceId ? (
        <section className="panel couple-room">
          <div className="couple-room-top">
            {preferences.photo ? (
              <img
                src={preferences.photo}
                alt="Foto do casal"
                width={100}
                height={100}
              />
            ) : (
              <div className="room-hearts">
                <Heart fill="currentColor" />
                <Heart />
              </div>
            )}
            <div>
              <span className="tag">
                <Users size={13} />
                {memberCount}/2 pessoas
              </span>
              <h2>{preferences.title}</h2>
              <p>
                {memberCount === 2
                  ? preferences.names.join(" & ")
                  : `${preferences.names[memberSlot] ?? preferences.names[0]} · aguardando seu par`}
              </p>
            </div>
          </div>
          <button className="primary" onClick={onEnter}>
            Entrar no espaço do casal <ArrowRight size={18} />
          </button>
          <p className="helper">
            Compras, finanças, tarefas, calendário, filmes e lugares ficam
            compartilhados entre vocês.
          </p>
          <button type="button" className="secondary" onClick={() => {
            onEnter(); router.push("/configuracoes#casal");
          }}><Users size={16} /> Participantes e convite</button>
          <LeaveCouple />
        </section>
      ) : (
        <>
          <div className="lobby-options">
            <button
              className={`panel lobby-option ${mode === "create" ? "chosen" : ""}`}
              onClick={() => {
                setMode("create");
                setLocalError("");
              }}
              aria-pressed={mode === "create"}
            >
              <span className="stat-icon blush">
                <Plus />
              </span>
              <h2>Criar nosso espaço</h2>
              <p>Dê um nome ao cantinho de vocês e convide seu par.</p>
              <ArrowRight size={20} />
            </button>
            <button
              className={`panel lobby-option ${mode === "join" ? "chosen" : ""}`}
              onClick={() => {
                setMode("join");
                setLocalError("");
              }}
              aria-pressed={mode === "join"}
            >
              <span className="stat-icon sage">
                <Link2 />
              </span>
              <h2>Entrar por convite</h2>
              <p>Seu par já criou o espaço? Cole o código ou link recebido.</p>
              <ArrowRight size={20} />
            </button>
          </div>
          {mode ? (
            <form className="panel lobby-form" onSubmit={submit}>
              <h2>
                {mode === "create"
                  ? "Qual vai ser o nosso cantinho?"
                  : "Vamos compartilhar a rotina?"}
              </h2>
              <label>
                Como você quer ser chamado neste espaço?
                <input
                  name="name"
                  required
                  maxLength={60}
                  autoComplete="nickname"
                  defaultValue={String(
                    user?.user_metadata?.display_name || "",
                  ).slice(0, 60)}
                />
              </label>
              {mode === "create" ? (
                <label>
                  Nome do espaço do casal
                  <input
                    name="title"
                    required
                    maxLength={80}
                    placeholder="Ex.: Nosso cantinho"
                  />
                </label>
              ) : (
                <>
                  <label>
                    Código ou link do convite
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      required
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </label>
                  <p>
                    Ao entrar, vocês passam a compartilhar todos os registros do
                    espaço. Confira com seu par se este é o convite correto.
                  </p>
                </>
              )}
              <button disabled={busy} className="primary">
                {busy
                  ? "Preparando…"
                  : mode === "create"
                    ? "Criar espaço do casal"
                    : "Aceitar convite e entrar"}
                <ArrowRight size={17} />
              </button>
            </form>
          ) : null}
        </>
      )}
      <footer>
        Uma conta para cada um. Uma vida organizada em conjunto.{" "}
        <Heart size={13} />
      </footer>
    </main>
  );
}
