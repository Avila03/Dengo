"use client";
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
import { Heart, LockKeyhole, LogIn } from "lucide-react";
import { supabase, demoMode } from "@/lib/supabase";
import { loadAllEntries } from "@/lib/records";
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
} from "@/lib/model";
type Context = {
  entries: Entry[];
  names: string[];
  preferences: Preferences;
  busy: boolean;
  error: string;
  demo: boolean;
  user: User | null;
  add: (d: Draft) => Promise<boolean>;
  update: (e: Entry, d: Draft) => Promise<boolean>;
  toggle: (e: Entry) => Promise<void>;
  remove: (e: Entry) => Promise<void>;
  savePreferences: (p: Preferences) => Promise<boolean>;
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
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [entries, setEntries] = useState<Entry[]>([]),
    [space, setSpace] = useState(""),
    [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFS),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false),
    identity = useRef<string | null>(null),
    sequence = useRef(0);
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
        setEntries([]);
        setSpace("");
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
      const membership = await supabase
        .from("memberships")
        .select("space_id")
        .eq("user_id", user.id)
        .single();
      if (request !== sequence.current) return;
      if (membership.error)
        throw new Error(
          "Sua conta ainda não está vinculada ao espaço do casal.",
        );
      const id = membership.data.space_id;
      const [items, home] = await Promise.all([
        loadAllEntries(supabase, id),
        supabase
          .from("spaces")
          .select("names,preferences")
          .eq("id", id)
          .single(),
      ]);
      if (request !== sequence.current) return;
      if (home.error)
        throw new Error("Não foi possível carregar os dados. Tente atualizar.");
      setSpace(id);
      setEntries(items);
      setPreferences({
        ...DEFAULT_PREFS,
        ...home.data.preferences,
        names: home.data.names,
      });
    } catch (e) {
      if (request === sequence.current) setError((e as Error).message);
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
    if (!next || list.some((i) => i.occurrence_from === entry.id)) return list;
    return [
      {
        ...next,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        occurrence_from: entry.id,
      },
      ...list,
    ];
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
        ...(space ? { space_id: space } : {}),
      };
      if (demoMode) {
        let list = readEntries(localStorage.getItem(STORAGE_KEY));
        if (d.kind === "expense" && d.data?.sourceId) {
          if (
            list.some(
              (i) =>
                i.kind === "expense" && i.data?.sourceId === d.data!.sourceId,
            )
          )
            throw new Error("Esta compra já tem uma despesa vinculada.");
          list = list.map((i) =>
            i.id === d.data!.sourceId ? { ...i, done: true } : i,
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
        const changed = { ...current, ...d };
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
        const next = done ? successor(current, preferences.names) : null;
        list = list.map((i) => (i.id === e.id ? { ...i, done } : i));
        if (next && !list.some((i) => i.occurrence_from === e.id))
          list.unshift({
            ...next,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            occurrence_from: e.id,
          });
        writeLocal(list);
      } else {
        const r = await supabase!.rpc("toggle_entry", { entry_id: e.id });
        if (r.error)
          throw new Error("Não foi possível concluir. Tente novamente.");
        await refresh();
      }
    });
  }
  async function remove(e: Entry) {
    await action(async () => {
      if (demoMode)
        writeLocal(
          readEntries(localStorage.getItem(STORAGE_KEY)).filter(
            (i) => i.id !== e.id,
          ),
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
    return action(async () => {
      if (
        p.names.some((n) => !n.trim() || n.length > 60) ||
        p.names[0].trim() === p.names[1].trim()
      )
        throw new Error(
          "Informe dois nomes diferentes, com até 60 caracteres.",
        );
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
        localStorage.setItem(PREFS_KEY, JSON.stringify(p));
        setPreferences(p);
      } else {
        const r = await supabase!
          .from("spaces")
          .update({
            names: p.names,
            preferences: { since: p.since, photo: p.photo, budgets: p.budgets },
          })
          .eq("id", space)
          .select("id")
          .single();
        if (r.error)
          throw new Error("Não foi possível salvar a personalização.");
        setPreferences(p);
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
        add,
        update,
        toggle,
        remove,
        savePreferences,
        refresh: () => void refresh(),
        signOut: () => {
          void supabase?.auth.signOut().then(({ error }) => {
            if (error) setError("Não foi possível sair.");
          });
        },
      }}
    >
      {children}
    </Data.Provider>
  );
}
function Login() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const { error } = await supabase!.auth.signInWithPassword({
        email: String(f.get("email")),
        password: String(f.get("password")),
      });
      if (error)
        setError("Não foi possível entrar. Confira seu e-mail e senha.");
    } catch {
      setError("Conexão indisponível. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login">
      <div className="brand">
        <Heart fill="currentColor" />
        dengo<span>um lugar para nós</span>
      </div>
      <form className="panel login-form" onSubmit={login}>
        <LockKeyhole />
        <h1>Que bom ter você aqui.</h1>
        <p>Entre para cuidar do cotidiano a dois.</p>
        <label>
          E-mail
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          Senha
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        {error ? (
          <p role="alert" className="error">
            {error}
          </p>
        ) : null}
        <button className="primary" disabled={busy}>
          <LogIn size={18} />
          {busy ? "Entrando…" : "Entrar no nosso espaço"}
        </button>
        <small>Espaço privado. Apenas contas autorizadas.</small>
      </form>
    </main>
  );
}
