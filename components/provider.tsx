"use client";
import { currentPushSubscription, disconnectPush, PUSH_OWNER_KEY } from "@/lib/push-client";
import { completeTaskChildren, cloneSubtasks, withoutEntryAndChildren } from "@/lib/couple-planning";
import { Brand } from "./brand";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import type { FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { Heart, LockKeyhole, LogIn, KeyRound, ArrowLeft } from "lucide-react";
import { usePathname } from "next/navigation";
import { PasswordRecovery } from "./password-recovery";
import { AppearanceProvider } from "./appearance-provider";
import { supabase, demoMode } from "@/lib/supabase";
import { Lobby } from "./lobby";
import { syncEntries } from "@/lib/entry-sync";
import { type CalendarTopic, validateCalendarTopics } from "@/lib/calendar-topics";
import {
  Entry,
  Draft,
  Preferences,
  DEFAULT_PREFS,
  STORAGE_KEY,
  PREFS_KEY,
  readEntries,
  validateDraft,
  successor,
  coupleNamesError,
} from "@/lib/model";
type Context = {
  entries: Entry[];
  names: string[];
  preferences: Preferences;
  busy: boolean;
  error: string;
  demo: boolean;
  user: User | null;
  spaceId: string;
  memberCount: number;
  memberSlot: number;
  openLobby: () => void;
  add: (d: Draft) => Promise<boolean>;
  update: (e: Entry, d: Draft) => Promise<boolean>;
  toggle: (e: Entry) => Promise<void>;
  remove: (e: Entry) => Promise<boolean>;
  savePreferences: (p: Preferences) => Promise<boolean>;
  saveCalendarTopics: (topics: CalendarTopic[]) => Promise<boolean>;
  refresh: () => void;
  signOut: () => void;
};
const Data = createContext<Context | null>(null);
export function useDengo() {
  const v = useContext(Data);
  if (!v) throw new Error("DengoProvider ausente");
  return v;
}
export function DengoProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [entries, setEntries] = useState<Entry[]>([]),
    [space, setSpace] = useState(""),
    [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFS),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [membershipLoaded, setMembershipLoaded] = useState(false),
    [memberCount, setMemberCount] = useState(0),
    [memberSlot, setMemberSlot] = useState(0),
    [lobbyOpen, setLobbyOpen] = useState(true);
  useEffect(() => {
    if (!ready || demoMode) return;
    let owner: string | null = null;
    try { owner = localStorage.getItem(PUSH_OWNER_KEY); } catch {}
    if (owner && owner !== user?.id) {
      void currentPushSubscription().then((subscription) => subscription?.unsubscribe()).catch(() => {});
      try { localStorage.removeItem(PUSH_OWNER_KEY); } catch {}
    }
  }, [ready, user?.id]);
  const lock = useRef(false),
    identity = useRef<string | null>(null),
    sequence = useRef(0),
    // Última cópia confirmada pelo servidor, base da sincronização incremental.
    synced = useRef<{ space: string; entries: Entry[] }>({ space: "", entries: [] });
  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    let live = true;
    const accept = (u: User | null) => {
      if (!live) return;
      if (identity.current !== u?.id) {
        sequence.current++;
        synced.current = { space: "", entries: [] };
        setEntries([]);
        setSpace("");
        setMembershipLoaded(false);
        setLobbyOpen(true);
        setMemberCount(0);
        setPreferences(DEFAULT_PREFS);
      }
      identity.current = u?.id ?? null;
      setUser(u);
      setReady(true);
    };
    supabase.auth
      .getSession()
      .then(({ data }) => accept(data.session?.user ?? null))
      .catch(() => {
        if (live) {
          setError("Não foi possível recuperar a sessão.");
          setReady(true);
        }
      });
    const { data } = supabase.auth.onAuthStateChange((_e, s) =>
      accept(s?.user ?? null),
    );
    return () => {
      live = false;
      data.subscription.unsubscribe();
    };
  }, []);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    setError("");
    try {
      if (demoMode) {
        setEntries(readEntries(localStorage.getItem(STORAGE_KEY)));
        const raw = localStorage.getItem(PREFS_KEY);
        if (raw) {
          const p = JSON.parse(raw);
          if (Array.isArray(p.names) && p.names.length === 2)
            setPreferences({ ...DEFAULT_PREFS, ...p });
        }
        return;
      }
      if (!supabase || !user) return;
      const { data: home, error: homeError } =
        await supabase.rpc("couple_summary");
      if (request !== sequence.current) return;
      if (homeError)
        throw new Error("Não foi possível abrir o lobby. Tente atualizar.");
      if (!home) {
        synced.current = { space: "", entries: [] };
        setSpace("");
        setMemberCount(0);
        setMembershipLoaded(true);
        return;
      }
      const base = synced.current.space === home.space_id ? synced.current.entries : [];
      const items = await syncEntries(supabase, home.space_id, base);
      if (request !== sequence.current) return;
      synced.current = { space: home.space_id, entries: items };
      setSpace(home.space_id);
      setMemberSlot(home.slot);
      setMemberCount(home.members);
      setEntries(items);
      setPreferences({
        ...DEFAULT_PREFS,
        ...home.preferences,
        names: home.names,
      });
      setMembershipLoaded(true);
    } catch (e) {
      if (request === sequence.current) {
        setError((e as Error).message);
        setMembershipLoaded(true);
      }
    }
  }, [user]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    const storage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === PREFS_KEY) void refresh();
    };
    const focus = () => void refresh();
    if (demoMode) window.addEventListener("storage", storage);
    window.addEventListener("focus", focus);
    return () => {
      window.removeEventListener("storage", storage);
      window.removeEventListener("focus", focus);
    };
  }, [refresh]);
  useEffect(() => {
    if (!supabase || !space || !user) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const changed = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void refresh(), 200);
    };
    const channel = supabase
      .channel(`dengo-${space}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "entries",
          filter: `space_id=eq.${space}`,
        },
        changed,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "spaces",
          filter: `id=eq.${space}`,
        },
        changed,
      )
      .subscribe();
    return () => {
      clearTimeout(timer);
      void supabase!.removeChannel(channel);
    };
  }, [space, user, refresh]);
  async function action(fn: () => Promise<void>) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (!demoMode && (!supabase || !user || !space))
        throw new Error("Aguarde o carregamento do espaço do casal.");
      await fn();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function appendSuccessor(list: Entry[], entry: Entry) {
    const next = entry.done ? successor(entry, preferences.names) : null;
    const completed = completeTaskChildren(list, entry);
    if (!next || list.some((i) => i.occurrence_from === entry.id)) return completed;
    const following: Entry = {
      ...next, id: crypto.randomUUID(), created_at: new Date().toISOString(),
      created_by_slot: 0, updated_by_slot: 0, updated_at: new Date().toISOString(), occurrence_from: entry.id,
    };
    return [following, ...cloneSubtasks(completed, entry, following), ...completed];
  }

  function writeLocal(next: Entry[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setEntries(next);
  }
  async function add(d: Draft) {
    if (d.data?.recurrence === "monthly" && d.due)
      d = { ...d, data: { ...d.data, repeatAnchor: Number(d.due.slice(-2)) } };
    return action(async () => {
      validateDraft(d);
      const e: Entry = {
        ...d,
        title: d.title.trim(),
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...(demoMode
          ? {
              created_by_slot: 0 as const,
              updated_by_slot: 0 as const,
              updated_at: new Date().toISOString(),
            }
          : {}),
        ...(space ? { space_id: space } : {}),
      };
      if (demoMode) {
        let list = readEntries(localStorage.getItem(STORAGE_KEY));
        if (d.kind === "subtask" && !list.some(parent => parent.id === d.data?.parentId && parent.kind === "task" && !parent.done))
          throw new Error("Reabra a responsabilidade antes de adicionar passos.");
        if (d.kind === "saving" && !list.some(goal => goal.id === d.data?.goalId && goal.kind === "goal"))
          throw new Error("Esta meta não está disponível.");
        if (d.kind === "expense" && d.data?.sourceId) {
          if (
            list.some(
              (i) =>
                i.kind === "expense" && i.data?.sourceId === d.data!.sourceId,
            )
          )
            throw new Error("Esta compra já tem uma despesa vinculada.");
          list = list.map((i) =>
            i.id === d.data!.sourceId
              ? {
                  ...i,
                  done: true,
                  updated_by_slot: 0 as const,
                  updated_at: new Date().toISOString(),
                }
              : i,
          );
        }
        if (
          e.kind === "movie" &&
          e.data?.tmdbId &&
          list.some(
            (i) =>
              i.kind === "movie" &&
              i.data?.tmdbId === e.data?.tmdbId &&
              i.data?.mediaType === e.data?.mediaType,
          )
        )
          throw new Error("Este título já está na nossa lista.");
        writeLocal(appendSuccessor([e, ...list], e));
      } else {
        const r =
          d.kind === "expense" && d.data?.sourceId
            ? await supabase!.rpc("convert_purchase", { new_entry: e })
            : await supabase!.from("entries").insert(e);
        if (r.error)
          throw new Error(
            "Não foi possível adicionar. Confira os dados e tente novamente.",
          );
        await refresh();
      }
    });
  }
  async function update(e: Entry, d: Draft) {
    if (
      d.data?.recurrence === "monthly" &&
      d.due &&
      (d.due !== e.due || e.data?.recurrence !== "monthly")
    )
      d = { ...d, data: { ...d.data, repeatAnchor: Number(d.due.slice(-2)) } };
    return action(async () => {
      validateDraft(d);
      if (demoMode) {
        const list = readEntries(localStorage.getItem(STORAGE_KEY));
        const current = list.find((i) => i.id === e.id);
        if (!current) throw new Error("Registro não encontrado.");
        const changed = {
          ...current,
          ...d,
          updated_by_slot: 0 as const,
          updated_at: new Date().toISOString(),
        };
        const changedList = list.map((i) => (i.id === e.id ? changed : i));
        writeLocal(
          !current.done && d.done
            ? appendSuccessor(changedList, changed)
            : changedList,
        );
      } else {
        const r = await supabase!
          .from("entries")
          .update(d)
          .eq("id", e.id)
          .select("id")
          .single();
        if (r.error) throw new Error("Não foi possível editar o registro.");
        await refresh();
      }
    });
  }
  async function toggle(e: Entry) {
    await action(async () => {
      if (demoMode) {
        let list = readEntries(localStorage.getItem(STORAGE_KEY));
        const current = list.find((i) => i.id === e.id);
        if (!current) throw new Error("Registro não encontrado.");
        const done = !current.done;
        list = list.map((i) =>
          i.id === e.id
            ? {
                ...i,
                done,
                updated_by_slot: 0 as const,
                updated_at: new Date().toISOString(),
              }
            : i,
        );
        const changed = list.find(item => item.id === e.id)!;
        writeLocal(appendSuccessor(list, changed));
      } else {
        const r = await supabase!.rpc("toggle_entry", { entry_id: e.id });
        if (r.error)
          throw new Error("Não foi possível concluir. Tente novamente.");
        await refresh();
      }
    });
  }
  async function remove(e: Entry) {
    return action(async () => {
      if (demoMode)
        writeLocal(
          withoutEntryAndChildren(readEntries(localStorage.getItem(STORAGE_KEY)), e.id),
        );
      else {
        const r = await supabase!
          .from("entries")
          .delete()
          .eq("id", e.id)
          .select("id")
          .single();
        if (r.error) throw new Error("Não foi possível excluir.");
        await refresh();
      }
    });
  }
  async function savePreferences(p: Preferences) {
    const nextPrefs: Preferences = { ...preferences, ...p, calendarTopics: preferences.calendarTopics };
    return action(async () => {
      const namesError = coupleNamesError(p.names);
      if (namesError) throw new Error(namesError);
      if (!p.title.trim() || p.title.length > 80)
        throw new Error("Informe um nome para o espaço com até 80 caracteres.");
      if (p.photo && !p.photo.startsWith("data:image/jpeg;base64,"))
        throw new Error("Formato de foto inválido.");
      if (p.photo.length > 400000)
        throw new Error("A foto ficou muito grande. Tente outra imagem.");
      if (demoMode) {
        const list = readEntries(localStorage.getItem(STORAGE_KEY));
        writeLocal(
          list.map((e) => ({
            ...e,
            assignee:
              e.assignee === preferences.names[0]
                ? p.names[0]
                : e.assignee === preferences.names[1]
                  ? p.names[1]
                  : e.assignee,
          })),
        );
        localStorage.setItem(PREFS_KEY, JSON.stringify(nextPrefs));
        setPreferences(nextPrefs);
      } else {
        const r = await supabase!
          .from("spaces")
          .update({
            names: p.names,
            preferences: {
              title: p.title,
              since: p.since,
              photo: p.photo,
              budgets: p.budgets,
              calendarTopics: preferences.calendarTopics,
            },
          })
          .eq("id", space)
          .select("id")
          .single();
        if (r.error)
          throw new Error("Não foi possível salvar a personalização.");
        setPreferences(nextPrefs);
      }
    });
  }
  async function saveCalendarTopics(topics: CalendarTopic[]) {
    return action(async () => {
      validateCalendarTopics(topics);
      const normalized = topics.map((t) => ({
        id: t.id, name: t.name.trim(), color: t.color.toLowerCase(),
      }));
      const next: Preferences = { ...preferences, calendarTopics: normalized };
      if (demoMode) {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
        setPreferences(next);
      } else {
        const r = await supabase!.from("spaces")
          .update({
            preferences: {
              title: preferences.title,
              since: preferences.since,
              photo: preferences.photo,
              budgets: preferences.budgets,
              calendarTopics: normalized,
            },
          })
          .eq("id", space)
          .select("id")
          .single();
        if (r.error) throw new Error("Não foi possível salvar os categorias do calendário.");
        setPreferences(next);
      }
    });
  }
  if (!ready)
    return (
      <div className="gate">
        <Heart />
        <p>Preparando nosso cantinho…</p>
      </div>
    );
  if (!supabase && !demoMode)
    return (
      <div className="gate">
        <Heart />
        <h1>O Dengo está quase pronto.</h1>
        <p>O acesso privado ainda precisa ser configurado.</p>
      </div>
    );
  if (pathname === "/redefinir-senha") return <PasswordRecovery />;
  if (supabase && !user) return <Login />;
  return (
    <Data.Provider
      value={{
        entries,
        names: preferences.names,
        preferences,
        busy,
        error,
        demo: demoMode,
        user,
        spaceId: space,
        memberCount,
        memberSlot,
        openLobby: () => setLobbyOpen(true),
        add,
        update,
        toggle,
        remove,
        savePreferences,
        saveCalendarTopics,
        refresh: () => void refresh(),
        signOut: () => {
          void (async () => {
            try { await disconnectPush(); } catch { /* An expired device is removed on the next delivery. */ }
            const result = await supabase?.auth.signOut();
            if (result?.error) setError("Não foi possível sair.");
          })();
        },
      }}
    >
      <AppearanceProvider user={user} demo={demoMode}>
      {(!demoMode && (lobbyOpen || !space)) || (demoMode && lobbyOpen) ? (
        <Lobby
          loading={!membershipLoaded}
          onEnter={() => setLobbyOpen(false)}
        />
      ) : (
        children
      )}
      </AppearanceProvider>
    </Data.Provider>
  );
}
function Login() {
  const [signup, setSignup] = useState(false),
    [recovery, setRecovery] = useState(false),
    [existingAccount, setExistingAccount] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    setExistingAccount(false);
    const f = new FormData(event.currentTarget);
    const email = String(f.get("email") || "").trim(),
      password = String(f.get("password") || "");
    try {
      if (recovery) {
        const { error } = await supabase!.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/redefinir-senha`,
        });
        if (error) throw new Error("Não foi possível solicitar o link. Tente novamente mais tarde.");
        setMessage("Se existir uma conta com esse e-mail, enviaremos um link para redefinir a senha. Confira também a pasta de spam.");
      } else if (signup) {
        const { data, error } = await supabase!.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: String(f.get("name") || "").trim() },
          },
        });
        if (error) {
          if (
            error.code === "user_already_exists" ||
            /already registered/i.test(error.message)
          ) {
            setExistingAccount(true);
            throw new Error(
              "Este e-mail já tem uma conta no Dengo. Entre com sua senha ou recupere o acesso.",
            );
          }
          throw new Error(
            "Não foi possível criar a conta. Confira os dados ou tente novamente.",
          );
        }
        if (!data.session) {
          setExistingAccount(true);
          throw new Error(
            "Não foi possível iniciar a sessão. Se já usou esse e-mail antes, tente entrar ou recuperar a senha.",
          );
        }
      } else {
        const { error } = await supabase!.auth.signInWithPassword({
          email,
          password,
        });
        if (error)
          throw new Error(
            "Não foi possível entrar. Confira seu e-mail e senha ou use 'Esqueci minha senha' para recuperar o acesso.",
          );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login">
      <Brand tagline />
      <form
        key={signup ? "signup" : recovery ? "recovery" : "login"}
        className="panel login-form"
        onSubmit={submit}
      >
        {!recovery ? <div className="filters">
          <button
            type="button"
            aria-pressed={!signup}
            className={!signup ? "selected" : ""}
            onClick={() => {
              setSignup(false);
              setRecovery(false);
              setError("");
              setMessage("");
            }}
          >
            Entrar
          </button>
          <button
            type="button"
            aria-pressed={signup}
            className={signup ? "selected" : ""}
            onClick={() => {
              setSignup(true);
              setRecovery(false);
              setError("");
              setMessage("");
            }}
          >
            Criar minha conta
          </button>
        </div> : null}
        <LockKeyhole />
        <h1>{recovery ? "Vamos recuperar seu acesso." : signup ? "Seu acesso, só seu." : "Que bom ter você aqui."}</h1>
        <p>
          {recovery ? "Informe seu e-mail para receber um link seguro de redefinição." : signup
            ? "Seu cadastro é imediato, sem confirmação de e-mail. Depois, crie o espaço do casal ou aceite um convite."
            : "Entre na sua conta e escolha o espaço do casal."}
        </p>
        {signup ? (
          <label>
            Seu nome
            <input
              name="name"
              required
              maxLength={60}
              autoComplete="nickname"
            />
          </label>
        ) : null}
        <label>
          E-mail
          <input name="email" type="email" autoComplete="username" required />
        </label>
        {!recovery ? <label>
          Senha
          <input
            name="password"
            type="password"
            autoComplete={signup ? "new-password" : "current-password"}
            minLength={signup ? 8 : undefined}
            required
          />
          {signup ? <small>Use pelo menos 8 caracteres.</small> : null}
        </label> : null}
        {!signup && !recovery ? (
          <button type="button" className="text-link" onClick={() => {setRecovery(true);setError("");setMessage("");}}>
            <KeyRound size={15} /> Esqueci minha senha
          </button>
        ) : null}
        {error ? (
          <p role="alert" className="error">
            {error}
          </p>
        ) : null}
        {message ? (
          <p role="status" className="notice">
            {message}
          </p>
        ) : null}
        {signup && existingAccount ? (
          <div className="form-grid">
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setSignup(false);
                setExistingAccount(false);
                setError("");
              }}
            >
              <LogIn size={16} /> Entrar com minha conta
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setSignup(false);
                setRecovery(true);
                setExistingAccount(false);
                setError("");
              }}
            >
              <KeyRound size={16} /> Recuperar senha
            </button>
          </div>
        ) : null}
        <button className="primary" disabled={busy}>
          <LogIn size={18} />
          {busy
            ? "Aguarde…"
            : recovery ? "Enviar link de recuperação"
            : signup
              ? "Criar minha conta"
              : "Entrar na minha conta"}
        </button>
        {recovery ? (
          <button type="button" className="secondary" onClick={() => {setRecovery(false);setError("");setMessage("");}}>
            <ArrowLeft size={16} /> Voltar ao login
          </button>
        ) : (
          <small>Cada pessoa tem seu login. Os dados só são compartilhados ao criar ou entrar em um casal.</small>
        )}
      </form>
    </main>
  );
}
