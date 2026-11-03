"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type FormEvent,
} from "react";
import type { User } from "@supabase/supabase-js";
import { Heart, LockKeyhole, LogIn } from "lucide-react";
import { supabase, demoMode } from "@/lib/supabase";
import { Entry, readEntries, STORAGE_KEY } from "@/lib/model";
type Draft = Omit<Entry, "id" | "created_at" | "space_id">;
type Context = {
  entries: Entry[];
  names: string[];
  busy: boolean;
  error: string;
  demo: boolean;
  add: (draft: Draft) => Promise<boolean>;
  toggle: (entry: Entry) => Promise<void>;
  remove: (entry: Entry) => Promise<void>;
  refresh: () => void;
  signOut: () => void;
};
const Data = createContext<Context | null>(null);
export function useDengo() {
  const value = useContext(Data);
  if (!value) throw new Error("DengoProvider ausente");
  return value;
}
export function DengoProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [entries, setEntries] = useState<Entry[]>([]),
    [space, setSpace] = useState(""),
    [names, setNames] = useState(["Eu", "Meu amor"]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const locked = useRef(false);
  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (active) {
        setUser(data.session?.user ?? null);
        if (error) setError("Não foi possível recuperar a sessão.");
        setReady(true);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setEntries([]);
      setSpace("");
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  const refresh = useCallback(async () => {
    setError("");
    if (demoMode) {
      try {
        setEntries(readEntries(localStorage.getItem(STORAGE_KEY)));
      } catch (e) {
        setError((e as Error).message);
      }
      return;
    }
    if (!supabase || !user) return;
    const membership = await supabase
      .from("memberships")
      .select("space_id")
      .eq("user_id", user.id)
      .single();
    if (membership.error) {
      setError(
        "Sua conta ainda não foi vinculada ao espaço do casal. Confira a configuração do Dengo.",
      );
      return;
    }
    const spaceId = membership.data.space_id;
    setSpace(spaceId);
    const [items, home] = await Promise.all([
      supabase
        .from("entries")
        .select("*")
        .eq("space_id", spaceId)
        .order("created_at", { ascending: false }),
      supabase.from("spaces").select("names").eq("id", spaceId).single(),
    ]);
    if (items.error || home.error) {
      setError("Não foi possível carregar os dados. Tente atualizar.");
      return;
    }
    setEntries(items.data as Entry[]);
    setNames(home.data.names);
  }, [user]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!demoMode) return;
    const listener = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) void refresh();
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, [refresh]);
  async function mutate(
    action: "add" | "toggle" | "remove",
    value: Draft | Entry,
  ) {
    if (locked.current) return false;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      if (!demoMode && (!supabase || !user || !space))
        throw new Error("Aguarde o carregamento do espaço do casal.");
      const entry =
        action === "add"
          ? ({
              ...value,
              id: crypto.randomUUID(),
              created_at: new Date().toISOString(),
              ...(space ? { space_id: space } : {}),
            } as Entry)
          : (value as Entry);
      if (demoMode) {
        const latest = readEntries(localStorage.getItem(STORAGE_KEY));
        const next =
          action === "add"
            ? [entry, ...latest]
            : action === "remove"
              ? latest.filter((e) => e.id !== entry.id)
              : latest.map((e) =>
                  e.id === entry.id ? { ...e, done: !e.done } : e,
                );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setEntries(next);
      } else {
        const result =
          action === "add"
            ? await supabase!
                .from("entries")
                .insert(entry)
                .select("id")
                .single()
            : action === "remove"
              ? await supabase!
                  .from("entries")
                  .delete()
                  .eq("id", entry.id)
                  .select("id")
                  .single()
              : await supabase!
                  .from("entries")
                  .update({ done: !entry.done })
                  .eq("id", entry.id)
                  .select("id")
                  .single();
        if (result.error)
          throw new Error(
            "Não foi possível salvar. Seus dados na tela foram mantidos.",
          );
        await refresh();
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
      return false;
    } finally {
      locked.current = false;
      setBusy(false);
    }
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
        <p>
          O acesso privado ainda precisa ser configurado. Nenhum dado pessoal
          está disponível nesta página.
        </p>
      </div>
    );
  if (supabase && !user) return <Login />;
  return (
    <Data.Provider
      value={{
        entries,
        names,
        busy,
        error,
        demo: demoMode,
        add: (d) => mutate("add", d),
        toggle: async (e) => {
          await mutate("toggle", e);
        },
        remove: async (e) => {
          await mutate("remove", e);
        },
        refresh: () => void refresh(),
        signOut: () => {
          void supabase?.auth.signOut().then(({ error }) => {
            if (error) setError("Não foi possível sair. Tente novamente.");
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
