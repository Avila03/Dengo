"use client";
import { useState, useRef, type FormEvent } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Clapperboard,
  Shuffle,
  CalendarDays,
  Check,
  Pencil,
  Heart,
} from "lucide-react";
import { Shell } from "./shell";
import { PageHeading, DeleteButton } from "./ui";
import { useDengo } from "./provider";
import { supabase } from "@/lib/supabase";
import type { Entry, Draft } from "@/lib/model";
import type { MovieResult } from "@/lib/movies";
export function Movies() {
  const { entries, names, busy, add, update, toggle, remove } = useDengo();
  const [open, setOpen] = useState(false),
    [editing, setEditing] = useState<Entry | null>(null),
    [results, setResults] = useState<MovieResult[]>([]),
    [searching, setSearching] = useState(false),
    [error, setError] = useState(""),
    [filter, setFilter] = useState("want"),
    [picked, setPicked] = useState("");
  const searchingRef = useRef(false);
  const all = entries.filter((e) => e.kind === "movie");
  const list = all.filter((e) =>
    filter === "watched"
      ? e.done
      : filter === "common"
        ? !e.done && e.data?.interestFirst && e.data?.interestSecond
        : !e.done,
  );
  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (searchingRef.current) return;
    searchingRef.current = true;
    setSearching(true);
    setError("");
    setResults([]);
    const f = new FormData(event.currentTarget);
    try {
      const { data } = supabase
        ? await supabase.auth.getSession()
        : { data: { session: null } };
      const r = await fetch(
        "/api/movies?" +
          new URLSearchParams({
            q: String(f.get("q")),
            type: String(f.get("type")),
          }),
        {
          headers: data.session
            ? { Authorization: `Bearer ${data.session.access_token}` }
            : {},
        },
      );
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || "Não foi possível buscar.");
      setResults(body.results);
      if (!body.results.length)
        setError("Nenhum título encontrado. Tente outro nome.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      searchingRef.current = false;
      setSearching(false);
    }
  }
  async function saveResult(r: MovieResult) {
    await add({
      kind: "movie",
      title: r.title,
      detail: "",
      assignee: "Nós dois",
      due: "",
      done: false,
      data: {
        mediaType: r.mediaType,
        tmdbId: r.id,
        poster: r.poster,
        overview: r.overview,
        year: r.year,
        interestFirst: false,
        interestSecond: false,
      },
    });
  }
  async function manual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const draft: Draft = {
      kind: "movie",
      title: String(f.get("title") || "").trim(),
      detail: String(f.get("detail") || ""),
      assignee: "Nós dois",
      due: "",
      done: f.get("watched") === "on",
      data: {
        ...editing?.data,
        mediaType: String(f.get("type")) as "movie" | "tv",
        interestFirst: f.get("first") === "on",
        interestSecond: f.get("second") === "on",
        ratingFirst: Number(f.get("ratingFirst")) || undefined,
        ratingSecond: Number(f.get("ratingSecond")) || undefined,
      },
    };
    if (await (editing ? update(editing, draft) : add(draft))) {
      setOpen(false);
      setEditing(null);
    }
  }
  function random() {
    const common = all.filter(
      (e) => !e.done && e.data?.interestFirst && e.data?.interestSecond,
    );
    if (!common.length) {
      setPicked(
        "Marquem o interesse dos dois em pelo menos um título para sortear.",
      );
      return;
    }
    setPicked(
      `Nossa escolha: ${common[Math.floor(Math.random() * common.length)].title}`,
    );
  }
  return (
    <Shell>
      <PageHeading
        eyebrow="O PRÓXIMO SÓ MAIS UM"
        title="Filmes & séries"
        description="Uma lista de histórias que vocês querem viver no sofá."
      >
        <button
          className="primary"
          onClick={() => {
            setOpen(!open);
            setEditing(null);
          }}
        >
          <Plus size={18} />
          {open ? "Fechar" : "Adicionar manualmente"}
        </button>
      </PageHeading>
      <form className="panel catalog-search" onSubmit={search}>
        <label>
          Buscar título
          <input
            name="q"
            required
            minLength={2}
            maxLength={120}
            placeholder="Qual história vamos assistir?"
          />
        </label>
        <label>
          Tipo
          <select name="type">
            <option value="movie">Filmes</option>
            <option value="tv">Séries</option>
          </select>
        </label>
        <button disabled={searching} className="primary">
          <Search size={17} />
          {searching ? "Buscando…" : "Buscar no TMDB"}
        </button>
      </form>
      {error ? (
        <div role="status" className="notice">
          {error}
        </div>
      ) : null}
      {results.length ? (
        <section className="panel setup-note">
          <h2>Resultados do catálogo</h2>
          <div className="movie-grid">
            {results.map((r) => {
              const saved = all.some(
                (e) =>
                  e.data?.tmdbId === r.id && e.data?.mediaType === r.mediaType,
              );
              return (
                <article key={r.id} className="movie-card">
                  {r.poster ? (
                    <img
                      src={r.poster}
                      alt={`Pôster de ${r.title}`}
                      width={180}
                      height={270}
                      loading="lazy"
                    />
                  ) : (
                    <div className="poster-placeholder">
                      <Clapperboard />
                    </div>
                  )}
                  <div className="movie-copy">
                    <h3>{r.title}</h3>
                    <span className="tag">{r.year || "Sem ano"}</span>
                    <p>{r.overview || "Sinopse não disponível."}</p>
                    <button
                      className="secondary"
                      disabled={busy || saved}
                      onClick={() => void saveResult(r)}
                    >
                      {saved ? "Na nossa lista" : "Quero na nossa lista"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
      {open ? (
        <form
          key={editing?.id || "new"}
          className="panel entry-form setup-note"
          onSubmit={manual}
        >
          <h2>{editing ? "Editar nossa escolha" : "Adicionar um título"}</h2>
          <div className="form-grid">
            <label className="full">
              Título
              <input
                name="title"
                required
                maxLength={120}
                defaultValue={editing?.title}
              />
            </label>
            <label>
              Tipo
              <select
                name="type"
                defaultValue={editing?.data?.mediaType || "movie"}
              >
                <option value="movie">Filme</option>
                <option value="tv">Série</option>
              </select>
            </label>
            <label className="checkbox-label">
              <input
                name="watched"
                type="checkbox"
                defaultChecked={editing?.done}
              />
              Já assistimos
            </label>
            <label className="checkbox-label">
              <input
                name="first"
                type="checkbox"
                defaultChecked={editing?.data?.interestFirst}
              />
              {names[0]} quer assistir
            </label>
            <label className="checkbox-label">
              <input
                name="second"
                type="checkbox"
                defaultChecked={editing?.data?.interestSecond}
              />
              {names[1]} quer assistir
            </label>
            <label>
              Nota de {names[0]} (1 a 10)
              <input
                name="ratingFirst"
                type="number"
                min="1"
                max="10"
                step="0.5"
                defaultValue={editing?.data?.ratingFirst}
              />
            </label>
            <label>
              Nota de {names[1]} (1 a 10)
              <input
                name="ratingSecond"
                type="number"
                min="1"
                max="10"
                step="0.5"
                defaultValue={editing?.data?.ratingSecond}
              />
            </label>
            <label className="full">
              Comentário opcional
              <input
                name="detail"
                maxLength={240}
                defaultValue={editing?.detail}
              />
            </label>
          </div>
          <button className="primary" disabled={busy}>
            {busy ? "Salvando…" : "Salvar título"}
          </button>
        </form>
      ) : null}
      <div className="section-title spaced">
        <div className="filters">
          {[
            ["want", "Queremos assistir"],
            ["common", "Interesse dos dois"],
            ["watched", "Já assistimos"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={filter === key ? "selected" : ""}
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <button className="secondary" onClick={random}>
          <Shuffle size={17} />
          Escolhe para nós
        </button>
      </div>
      {picked ? (
        <div className="notice" role="status">
          <Heart size={17} />
          {picked}
        </div>
      ) : null}
      {list.length ? (
        <div className="movie-grid">
          {list.map((e) => (
            <article className="panel movie-card" key={e.id}>
              {e.data?.poster ? (
                <img
                  src={e.data.poster}
                  alt={`Pôster de ${e.title}`}
                  width={180}
                  height={270}
                  loading="lazy"
                />
              ) : (
                <div className="poster-placeholder">
                  <Clapperboard size={35} />
                  <span>{e.data?.mediaType === "tv" ? "Série" : "Filme"}</span>
                </div>
              )}
              <div className="movie-copy">
                <h3>{e.title}</h3>
                <p className="movie-overview">
                  {e.data?.overview ||
                    e.detail ||
                    "Uma história para compartilhar."}
                </p>
                <div className="entry-meta">
                  <span className="tag">
                    {e.data?.interestFirst
                      ? `${names[0]} quer`
                      : "Sem interesse marcado"}
                  </span>
                  {e.data?.interestSecond ? (
                    <span className="tag">{names[1]} quer</span>
                  ) : null}
                </div>
                {e.done ? (
                  <p>
                    {names[0]}: {e.data?.ratingFirst || "—"} · {names[1]}:{" "}
                    {e.data?.ratingSecond || "—"}
                  </p>
                ) : null}
                <div className="row-actions">
                  <button
                    className="icon-btn"
                    disabled={busy}
                    aria-label={`${e.done ? "Reabrir" : "Marcar assistido"} ${e.title}`}
                    onClick={() => void toggle(e)}
                  >
                    <Check size={18} />
                  </button>
                  <button
                    className="icon-btn"
                    aria-label={`Editar ${e.title}`}
                    onClick={() => {
                      setEditing(e);
                      setOpen(true);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    <Pencil size={17} />
                  </button>
                  <Link
                    className="icon-btn"
                    aria-label={`Agendar ${e.title}`}
                    href={`/calendario?origem=${e.id}`}
                  >
                    <CalendarDays size={18} />
                  </Link>
                  <DeleteButton
                    label={e.title}
                    disabled={busy}
                    onDelete={() => void remove(e)}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="panel empty large">
          <Clapperboard size={35} />
          <h2>Nossa próxima sessão começa aqui.</h2>
          <p>Busquem um título ou adicionem manualmente.</p>
        </section>
      )}
      <div className="tmdb-credit">
        <a
          href="https://www.themoviedb.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img src="/tmdb.svg" alt="TMDB" width={100} height={14} />
        </a>
        <p>
          This product uses the TMDB API but is not endorsed or certified by
          TMDB.
        </p>
      </div>
    </Shell>
  );
}
