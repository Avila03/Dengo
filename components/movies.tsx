"use client";
import { useState, useEffect, type FormEvent } from "react";
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
  TrendingUp,
  Star,
  LoaderCircle,
} from "lucide-react";
import { Shell } from "./shell";
import { EntryAudit } from "./entry-audit";
import { PageHeading, DeleteButton } from "./ui";
import { useDengo } from "./provider";
import { supabase } from "@/lib/supabase";
import type { Entry, Draft } from "@/lib/model";
import type { MovieResult } from "@/lib/movies";
export function Movies() {
  const { entries, names, memberSlot, busy, add, update, toggle, remove } = useDengo();
  const [open, setOpen] = useState(false),
    [editing, setEditing] = useState<Entry | null>(null),
    [results, setResults] = useState<MovieResult[]>([]),
    [searching, setSearching] = useState(false),
    [error, setError] = useState(""),
    [filter, setFilter] = useState("want"),
    [picked, setPicked] = useState(""),
    [catalogMode, setCatalogMode] = useState<"trending" | "popular" | "search">("trending"),
    [catalogType, setCatalogType] = useState<"movie" | "tv">("movie"),
    [searchTerm, setSearchTerm] = useState(""),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [hasMore, setHasMore] = useState(false),
    [addingId, setAddingId] = useState<number | null>(null),
    [catalogNotice, setCatalogNotice] = useState("");
  const all = entries.filter((e) => e.kind === "movie");
  const list = all.filter((e) =>
    filter === "watched"
      ? e.done
      : filter === "common"
        ? !e.done && e.data?.interestFirst && e.data?.interestSecond
        : !e.done,
  );
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setSearching(true);
    setError("");
    if (page === 1) setResults([]);
    async function loadCatalog() {
      try {
        const { data } = supabase
          ? await supabase.auth.getSession()
          : { data: { session: null } };
        if (!active) return;
        const params = new URLSearchParams({
          mode: catalogMode,
          type: catalogType,
          page: String(page),
          ...(catalogMode === "search" ? { q: query } : {}),
        });
        const response = await fetch(`/api/movies?${params}`, {
          headers: data.session
            ? { Authorization: `Bearer ${data.session.access_token}` }
            : {},
          signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Não foi possível consultar o catálogo.");
        if (!active) return;
        const incoming: MovieResult[] = body.results;
        setResults((current) => page === 1
          ? incoming
          : [...current, ...incoming.filter((item) =>
              !current.some((saved) => saved.id === item.id && saved.mediaType === item.mediaType))]);
        setHasMore(page < body.totalPages && incoming.length > 0);
        if (!incoming.length && page === 1)
          setError("Nenhum título encontrado. Tente outro nome ou categoria.");
      } catch (e) {
        if (active && !controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Não foi possível acessar o catálogo.");
      } finally {
        if (active) setSearching(false);
      }
    }
    void loadCatalog();
    return () => { active = false; controller.abort(); };
  }, [catalogMode, catalogType, query, page]);

  function showCatalog(mode: "trending" | "popular", type = catalogType) {
    setResults([]);
    setHasMore(false);
    setPage(1);
    setCatalogMode(mode);
    setCatalogType(type);
    setCatalogNotice("");
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = searchTerm.trim();
    if (term.length < 2 || term.length > 120) {
      setError("Informe de 2 a 120 caracteres.");
      return;
    }
    setResults([]);
    setHasMore(false);
    setPage(1);
    setQuery(term);
    setCatalogMode("search");
    setCatalogNotice("");
  }

  async function saveResult(r: MovieResult) {
    setAddingId(r.id);
    setCatalogNotice("");
    const success = await add({
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
        interestFirst: memberSlot === 0,
        interestSecond: memberSlot === 1,
      },
    });
    if (success) setCatalogNotice(`${r.title} entrou na lista de vocês! Você já está marcado(a) como interessado(a).`);
    setAddingId(null);
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
      <section className="catalog-intro panel">
        <div>
          <span className="eyebrow">DESCUBRAM JUNTOS</span>
          <h2>O que vamos assistir?</h2>
          <p>Encontrem filmes e séries, salvem os favoritos e descubram o que os dois querem ver.</p>
        </div>
        <div className="catalog-stats">
          <span><strong>{all.filter((e) => !e.done).length}</strong> na lista</span>
          <span><strong>{all.filter((e) => e.done).length}</strong> assistidos</span>
        </div>
      </section>
      <form className="panel catalog-search" onSubmit={search}>
        <label>
          Buscar no catálogo
          <input
            name="q"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            required
            minLength={2}
            maxLength={120}
            placeholder="Um filme, uma série, uma história…"
          />
        </label>
        <label>
          Tipo
          <select
            name="type"
            value={catalogType}
            onChange={(event) => {
              const next = event.target.value as "movie" | "tv";
              if (catalogMode === "search" && query) {
                setResults([]);
                setHasMore(false);
                setPage(1);
                setCatalogType(next);
              } else showCatalog(catalogMode === "search" ? "trending" : catalogMode, next);
            }}
          >
            <option value="movie">Filmes</option>
            <option value="tv">Séries</option>
          </select>
        </label>
        <button disabled={searching} className="primary">
          <Search size={17} />
          Pesquisar
        </button>
      </form>
      <div className="catalog-toolbar">
        <div className="filters" aria-label="Explorar títulos">
          <button type="button" className={catalogMode === "trending" ? "selected" : ""}
            aria-pressed={catalogMode === "trending"}
            onClick={() => showCatalog("trending")}>
            <TrendingUp size={16} /> Em alta
          </button>
          <button type="button" className={catalogMode === "popular" ? "selected" : ""}
            aria-pressed={catalogMode === "popular"}
            onClick={() => showCatalog("popular")}>
            <Star size={16} /> Populares
          </button>
          {catalogMode === "search" ? (
            <button type="button" className="selected" aria-pressed="true"
              onClick={() => showCatalog("trending")}>
              <Search size={16} /> Busca: {query.slice(0, 22)} ×
            </button>
          ) : null}
        </div>
        <span className="catalog-source">Catálogo por TMDB</span>
      </div>
      {error ? <div role="status" className="notice">{error}</div> : null}
      {catalogNotice ? <div role="status" className="notice"><Heart size={17} /> {catalogNotice}</div> : null}
      {searching && page === 1 ? (
        <section className="panel empty" role="status"><LoaderCircle size={24} className="catalog-loading" /><p>Descobrindo histórias…</p></section>
      ) : null}
      {results.length ? (
        <section className="catalog-results">
          <div className="section-title">
            <h2>{catalogMode === "search" ? "Resultados para vocês" : catalogMode === "popular" ? "Títulos populares" : "Em alta nesta semana"}</h2>
            <span>{catalogType === "tv" ? "Séries" : "Filmes"}</span>
          </div>
          <div className="movie-grid">
            {results.map((r) => {
              const saved = all.some(
                (e) => e.data?.tmdbId === r.id && e.data?.mediaType === r.mediaType,
              );
              return (
                <article key={`${r.mediaType}-${r.id}`} className="movie-card">
                  {r.poster ? (
                    <img src={r.poster} alt={`Pôster de ${r.title}`}
                      width={180} height={270} loading="lazy" />
                  ) : (
                    <div className="poster-placeholder"><Clapperboard /></div>
                  )}
                  <div className="movie-copy">
                    <h3>{r.title}</h3>
                    <div className="catalog-card-meta">
                      {r.year ? <span className="tag">{r.year}</span> : null}
                      {r.rating != null && r.rating > 0 ? <span className="tag"><Star size={13} /> {r.rating.toFixed(1)} TMDB</span> : null}
                    </div>
                    <p>{r.overview || "Sinopse ainda não disponível em português."}</p>
                    <button type="button" className="secondary"
                      disabled={busy || saved || addingId === r.id}
                      onClick={() => void saveResult(r)}>
                      {saved ? <><Check size={16} /> Na nossa lista</> :
                        addingId === r.id ? "Salvando…" : <><Plus size={16} /> Adicionar à lista</>}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          {hasMore ? (
            <div className="catalog-load-more">
              <button type="button" className="secondary" disabled={searching}
                onClick={() => setPage((value) => value + 1)}>
                {searching ? "Carregando…" : "Ver mais títulos"}
              </button>
            </div>
          ) : null}
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
                <EntryAudit entry={e} />
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
