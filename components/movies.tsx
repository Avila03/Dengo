"use client";
import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import {
  Plus, Search, Clapperboard, Shuffle, CalendarDays, Check, Pencil,
  Heart, TrendingUp, Star, LoaderCircle, ListVideo, Play, BookOpen,
} from "lucide-react";
import { Shell } from "./shell";
import { CleanSheet } from "./clean-sheet";
import { EntryAudit } from "./entry-audit";
import { PageHeading, DeleteButton } from "./ui";
import { useDengo } from "./provider";
import { supabase } from "@/lib/supabase";
import { TOGETHER, type Entry, type Draft } from "@/lib/model";
import type { MovieResult } from "@/lib/movies";
import {
  mediaStatus, mediaCounters, filterSavedMedia, mediaProgressLabel,
  withMediaStatus, WATCH_STATUS_LABELS, type WatchStatus, type MediaFilter,
} from "@/lib/media-progress";

export function Movies() {
  const { entries, names, memberSlot, busy, add, update, remove } = useDengo();
  const [open, setOpen] = useState(false),
    [editing, setEditing] = useState<Entry | null>(null),
    [mediaType, setMediaType] = useState<"movie" | "tv">("movie"),
    [watchState, setWatchState] = useState<WatchStatus>("not_started"),
    [formError, setFormError] = useState(""),
    [results, setResults] = useState<MovieResult[]>([]),
    [searching, setSearching] = useState(false),
    [error, setError] = useState(""),
    [filter, setFilter] = useState<MediaFilter>("pending"),
    [picked, setPicked] = useState(""),
    [catalogMode, setCatalogMode] = useState<"trending" | "popular" | "search">("trending"),
    [catalogType, setCatalogType] = useState<"movie" | "tv">("movie"),
    [searchTerm, setSearchTerm] = useState(""),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [hasMore, setHasMore] = useState(false),
    [addingId, setAddingId] = useState<number | null>(null),
    [catalogNotice, setCatalogNotice] = useState("");

  const all = entries.filter((entry) => entry.kind === "movie");
  const counters = mediaCounters(entries);
  const list = filterSavedMedia(entries, filter);

  function scrollToSaved() {
    document.getElementById("nossa-lista")?.scrollIntoView({
      behavior: "smooth", block: "start",
    });
  }
  function selectSaved(next: MediaFilter) {
    setFilter(next);
    scrollToSaved();
  }
  function beginManual(entry: Entry | null) {
    const shouldClose = open && editing?.id === entry?.id;
    if (shouldClose) {
      setOpen(false);
      setEditing(null);
      return;
    }
    setEditing(entry);
    setMediaType(entry?.data?.mediaType || "movie");
    setWatchState(entry ? mediaStatus(entry) : "not_started");
    setFormError("");
    setOpen(true);
    window.requestAnimationFrame(() =>
      document.getElementById("media-entry-form")?.scrollIntoView({
        behavior: "smooth", block: "start",
      })
    );
  }
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

  async function saveResult(result: MovieResult) {
    setAddingId(result.id);
    setCatalogNotice("");
    const success = await add({
      kind: "movie",
      title: result.title,
      detail: "",
      assignee: TOGETHER,
      due: "",
      done: false,
      data: {
        mediaType: result.mediaType,
        tmdbId: result.id,
        poster: result.poster,
        overview: result.overview,
        year: result.year,
        watchStatus: "not_started",
        interestFirst: memberSlot === 0,
        interestSecond: memberSlot === 1,
      },
    });
    if (success) {
      setCatalogNotice(result.title + " foi adicionado à nossa lista!");
      setFilter("pending");
      scrollToSaved();
    }
    setAddingId(null);
  }

  async function manual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const form = new FormData(event.currentTarget);
    const seasonText = String(form.get("season") || "").trim();
    const episodeText = String(form.get("episode") || "").trim();
    const draft: Draft = {
      kind: "movie",
      title: String(form.get("title") || "").trim(),
      detail: editing?.detail || "",
      assignee: TOGETHER,
      due: "",
      done: watchState === "watched",
      data: {
        ...editing?.data,
        mediaType,
        watchStatus: watchState,
        currentSeason: mediaType === "tv" && seasonText ? Number(seasonText) : undefined,
        currentEpisode: mediaType === "tv" && episodeText ? Number(episodeText) : undefined,
        interestFirst: form.get("first") === "on",
        interestSecond: form.get("second") === "on",
        ratingFirst: Number(form.get("ratingFirst")) || undefined,
        ratingSecond: Number(form.get("ratingSecond")) || undefined,
        mediaFeedback: String(form.get("feedback") ?? editing?.data?.mediaFeedback ?? "").trim(),
      },
    };
    if (mediaType === "tv" && watchState === "watching" &&
        (!draft.data?.currentSeason || !draft.data.currentEpisode)) {
      setFormError("Informe a temporada e o episódio atuais.");
      return;
    }
    if (await (editing ? update(editing, draft) : add(draft))) {
      setOpen(false);
      setEditing(null);
      selectSaved(watchState === "watched" ? "watched" : "pending");
    } else {
      setFormError("Não foi possível salvar. Verifique os dados e tente novamente.");
    }
  }

  async function quickStatus(entry: Entry, status: WatchStatus) {
    if (status === mediaStatus(entry)) return;
    const success = await update(entry, withMediaStatus(entry, status));
    if (!success) setCatalogNotice("Não foi possível atualizar o status.");
  }
  async function quickProgress(event: FormEvent<HTMLFormElement>, entry: Entry) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const season = Number(form.get("season"));
    const episode = Number(form.get("episode"));
    if (!Number.isInteger(season) || !Number.isInteger(episode) ||
        season < 1 || episode < 1 || season > 999 || episode > 999) {
      setCatalogNotice("Informe uma temporada e um episódio entre 1 e 999.");
      return;
    }
    const next: Draft = {
      kind: "movie",
      title: entry.title,
      detail: entry.detail,
      assignee: entry.assignee,
      due: entry.due,
      done: false,
      data: { ...entry.data, watchStatus: "watching",
        currentSeason: season, currentEpisode: episode },
    };
    if (await update(entry, next)) setCatalogNotice("Progresso atualizado: " + entry.title);
    else setCatalogNotice("Não foi possível atualizar o episódio.");
  }
  function random() {
    const common = all.filter((entry) => mediaStatus(entry) !== "watched" &&
      entry.data?.interestFirst && entry.data?.interestSecond);
    if (!common.length) {
      setPicked("Marquem o interesse dos dois em pelo menos um título para sortear.");
      return;
    }
    setPicked("Nossa escolha: " + common[Math.floor(Math.random() * common.length)].title);
  }

  return (
    <Shell>
      <PageHeading
        eyebrow="O PRÓXIMO SÓ MAIS UM"
        title="Filmes & séries"
        description="Tudo que queremos assistir, estamos acompanhando e já vimos."
      >
        <button type="button" className="primary" onClick={() => beginManual(null)}>
          <Plus size={18} /> {open && !editing ? "Fechar" : "Adicionar manualmente"}
        </button>
      </PageHeading>

      {all.length > 0 ? <section className="clean-media-toolbar" aria-label="Resumo de filmes e séries">
        <div className="catalog-stats">
          <button type="button" onClick={() => selectSaved("pending")}
            aria-label={"Abrir " + counters.pending + " títulos na lista"}>
            <strong>{counters.pending}</strong><span>Na lista</span>
          </button>
          <button type="button" onClick={() => selectSaved("watching")}
            aria-label={"Abrir " + counters.watching + " títulos assistindo"}>
            <strong>{counters.watching}</strong><span>Assistindo</span>
          </button>
          <button type="button" onClick={() => selectSaved("watched")}
            aria-label={"Abrir " + counters.watched + " títulos assistidos"}>
            <strong>{counters.watched}</strong><span>Assistidos</span>
          </button>
        </div>
      </section> : null}

      {open ? (
        <CleanSheet title={editing ? "Editar " + editing.title : "Adicionar título"}
          onClose={() => {setOpen(false);setEditing(null);setFormError("");}}>
        <form key={editing?.id || "new"} id="media-entry-form"
          className="panel entry-form media-editor" onSubmit={(event) => void manual(event)}>
          <h2>{editing ? "Editar " + editing.title : "Adicionar um título"}</h2>
          <div className="form-grid">
            <label className="full">Nome do filme ou série
              <input name="title" required maxLength={120}
                defaultValue={editing?.title || ""} />
            </label>
            <label>Tipo
              <select name="type" value={mediaType}
                onChange={(event) => setMediaType(event.target.value as "movie" | "tv")}>
                <option value="movie">Filme</option>
                <option value="tv">Série</option>
              </select>
            </label>
            <label>Nosso acompanhamento
              <select name="watchStatus" value={watchState}
                onChange={(event) => setWatchState(event.target.value as WatchStatus)}>
                <option value="not_started">Não assistiu</option>
                <option value="watching">Assistindo</option>
                <option value="watched">Assistido</option>
              </select>
            </label>
            {mediaType === "tv" && watchState !== "not_started" ? (
              <>
                <label>Temporada atual
                  <input name="season" type="number" inputMode="numeric" min={1} max={999} step={1}
                    required={watchState === "watching"}
                    defaultValue={editing?.data?.currentSeason || (watchState === "watching" ? 1 : undefined)} />
                </label>
                <label>Episódio atual
                  <input name="episode" type="number" inputMode="numeric" min={1} max={999} step={1}
                    required={watchState === "watching"}
                    defaultValue={editing?.data?.currentEpisode || (watchState === "watching" ? 1 : undefined)} />
                </label>
              </>
            ) : null}
            <label className="checkbox-label">
              <input name="first" type="checkbox"
                defaultChecked={editing?.data?.interestFirst || false} />
              {names[0]} quer assistir
            </label>
            <label className="checkbox-label">
              <input name="second" type="checkbox"
                defaultChecked={editing?.data?.interestSecond || false} />
              {names[1]} quer assistir
            </label>
            {watchState === "watched" ? (
              <>
                <label>Nota de {names[0]} (1 a 10)
                  <input name="ratingFirst" type="number" min={1} max={10} step={0.5}
                    defaultValue={editing?.data?.ratingFirst ?? ""} />
                </label>
                <label>Nota de {names[1]} (1 a 10)
                  <input name="ratingSecond" type="number" min={1} max={10} step={0.5}
                    defaultValue={editing?.data?.ratingSecond ?? ""} />
                </label>
              </>
            ) : null}
            {watchState !== "not_started" ? (
              <label className="full">Nosso feedback
                <textarea name="feedback" maxLength={800} rows={3}
                  defaultValue={editing?.data?.mediaFeedback ?? editing?.detail ?? ""}
                  placeholder="O que achamos? Momentos favoritos, críticas ou lembranças..." />
              </label>
            ) : null}
          </div>
          {formError ? <p role="alert" className="error">{formError}</p> : null}
          <div className="media-editor-actions">
            <button type="submit" className="primary" disabled={busy}>
              <Check size={17} /> {busy ? "Salvando…" : "Salvar título"}
            </button>
            <button type="button" className="secondary" onClick={() => {
              setOpen(false); setEditing(null); setFormError("");
            }}>Cancelar</button>
          </div>
        </form>
        </CleanSheet>
      ) : null}

      <section className="saved-media-section" id="nossa-lista" aria-label="Nossa lista de filmes e séries">
        <div className="saved-media-heading">
          <div>
            <span className="eyebrow">O QUE GUARDAMOS PARA NÓS</span>
            <h2>Nossa lista <span className="rose">.</span></h2>
            <p>Escolham um status, atualizem episódios e registrem o que acharam.</p>
          </div>
          <span className="saved-media-total">{all.length} {all.length === 1 ? "título salvo" : "títulos salvos"}</span>
        </div>
        {all.length > 0 ? <div className="saved-media-filters" role="group" aria-label="Filtrar títulos salvos">
          {([
            ["pending", "Na lista"],
            ["watching", "Assistindo"],
            ["not_started", "Não assistiu"],
            ["watched", "Assistidos"],
            ["common", "Interesse dos dois"],
            ["all", "Todos"],
          ] as [MediaFilter,string][]).map(([key,label]) => (
            <button key={key} type="button" className={filter === key ? "selected" : ""}
              aria-pressed={filter === key} onClick={() => setFilter(key)}>
              {label}
            </button>
          ))}
          <button className="secondary media-random" type="button" onClick={random}>
            <Shuffle size={16} /> Sortear
          </button>
        </div> : null}
        {picked ? <p className="notice" role="status"><Heart size={16}/>{picked}</p> : null}
        {catalogNotice ? <p className="notice" role="status"><Heart size={16}/>{catalogNotice}</p> : null}
        {list.length ? (
          <div className="movie-grid saved-media-grid">
            {list.map((entry) => {
              const status = mediaStatus(entry);
              const feedback = entry.data?.mediaFeedback ?? entry.detail;
              return (
                <article className="panel movie-card saved-media-card" key={entry.id}>
                  {entry.data?.poster ? (
                    <img src={entry.data.poster} alt={"Pôster de " + entry.title}
                      width={150} height={225} loading="lazy" />
                  ) : (
                    <div className="poster-placeholder"><Clapperboard size={30} />
                      <span>{entry.data?.mediaType === "tv" ? "Série" : "Filme"}</span>
                    </div>
                  )}
                  <div className="movie-copy">
                    <div className="saved-media-card-head">
                      <span className="tag">{entry.data?.mediaType === "tv" ? "Série" : "Filme"}</span>
                      {entry.data?.year ? <span className="tag">{entry.data.year}</span> : null}
                    </div>
                    <h3>{entry.title}</h3>
                    <label className="saved-media-status">
                      <span>Status</span>
                      <select aria-label={"Status de " + entry.title} value={status} disabled={busy}
                        onChange={(event) => void quickStatus(entry,event.target.value as WatchStatus)}>
                        <option value="not_started">Não assistiu</option>
                        <option value="watching">Assistindo</option>
                        <option value="watched">Assistido</option>
                      </select>
                    </label>
                    {entry.data?.mediaType === "tv" && status === "watching" ? (
                      <form className="saved-media-progress"
                        key={entry.id + "-" + (entry.data.currentSeason || 1) + "-" + (entry.data.currentEpisode || 1)}
                        onSubmit={(event) => void quickProgress(event,entry)}>
                        <div className="saved-media-progress-title"><Play size={13} />
                          Episódio atual
                        </div>
                        <div className="saved-media-progress-fields">
                          <label>Temporada
                            <input type="number" name="season" min={1} max={999} step={1}
                              inputMode="numeric" required defaultValue={entry.data?.currentSeason || 1} />
                          </label>
                          <label>Episódio
                            <input type="number" name="episode" min={1} max={999} step={1}
                              inputMode="numeric" required defaultValue={entry.data?.currentEpisode || 1} />
                          </label>
                          <button type="submit" className="secondary" disabled={busy}>Salvar</button>
                        </div>
                      </form>
                    ) : entry.data?.mediaType === "tv" && mediaProgressLabel(entry) ? (
                      <span className="saved-media-progress-tag">{mediaProgressLabel(entry)}</span>
                    ) : null}
                    {entry.data?.interestFirst || entry.data?.interestSecond ? (
                      <p className="saved-media-interest">
                        {[
                          entry.data.interestFirst ? names[0] : "",
                          entry.data.interestSecond ? names[1] : "",
                        ].filter(Boolean).join(" e ")} quer assistir
                      </p>
                    ) : null}
                    {status === "watched" && (entry.data?.ratingFirst || entry.data?.ratingSecond) ? (
                      <p className="saved-media-ratings">
                        <Star size={14} /> {names[0]}: {entry.data?.ratingFirst || "—"} ·
                        {" "}{names[1]}: {entry.data?.ratingSecond || "—"}
                      </p>
                    ) : null}
                    {status !== "not_started" && feedback ? (
                      <div className="saved-media-feedback">
                        <strong>Nosso feedback</strong>
                        <p>{feedback}</p>
                      </div>
                    ) : null}
                    <details className="clean-media-details">
                      <summary><Pencil size={14} /> Avaliação e opções</summary>
                      <div className="clean-media-expanded">
                        <EntryAudit entry={entry} />
                        <div className="row-actions">
                      <button type="button" className="secondary saved-media-edit"
                        onClick={() => beginManual(entry)}>
                        <Pencil size={15} /> Editar / avaliar
                      </button>
                      <Link className="icon-btn" aria-label={"Agendar " + entry.title}
                        href={"/calendario?origem=" + entry.id}>
                        <CalendarDays size={17} />
                      </Link>
                      <DeleteButton label={entry.title} disabled={busy} onDelete={() => void remove(entry)} />
                        </div>
                      </div>
                    </details>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <section className="clean-simple-empty" role="status">
            <BookOpen size={21}/>
            <div>
              <strong>{all.length ? "Nenhum título neste filtro" : "Nossa lista está vazia"}</strong>
              <p>{all.length ? "Os outros títulos continuam disponíveis." :
                "Descubra filmes e séries pelo catálogo abaixo, ou adicione um título manualmente."}</p>
              {all.length ? <button type="button" className="text-link"
                onClick={() => setFilter("all")}>Ver todos os títulos</button> : null}
            </div>
          </section>
        )}
      </section>

      <details id="descobrir-filmes" className="media-discover clean-discover"
        aria-label="Descobrir novos títulos" key={all.length ? "saved" : "empty"} open={!all.length}>
        <summary><span><Search size={18} /> Descobrir filmes e séries</span>
          <span>Pesquisar no catálogo</span></summary>
        <div className="clean-discover-content">
        <form className="panel catalog-search" onSubmit={search}>
          <label>Buscar no catálogo
            <input name="q" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)}
              required minLength={2} maxLength={120} placeholder="Um filme, uma série, uma história…" />
          </label>
          <label>Tipo
            <select name="type" value={catalogType} onChange={(event) => {
              const next = event.target.value as "movie" | "tv";
              if (catalogMode === "search" && query) {
                setResults([]); setHasMore(false); setPage(1); setCatalogType(next);
              } else showCatalog(catalogMode === "search" ? "trending" : catalogMode, next);
            }}>
              <option value="movie">Filmes</option><option value="tv">Séries</option>
            </select>
          </label>
          <button type="submit" className="primary" disabled={searching}>
            <Search size={17} /> Pesquisar
          </button>
        </form>
        <div className="catalog-toolbar">
          <div className="filters" aria-label="Explorar títulos">
            <button type="button" className={catalogMode === "trending" ? "selected" : ""}
              aria-pressed={catalogMode === "trending"} onClick={() => showCatalog("trending")}>
              <TrendingUp size={16} /> Em alta
            </button>
            <button type="button" className={catalogMode === "popular" ? "selected" : ""}
              aria-pressed={catalogMode === "popular"} onClick={() => showCatalog("popular")}>
              <Star size={16} /> Populares
            </button>
            {catalogMode === "search" ? (
              <button type="button" className="selected" aria-pressed={true}
                onClick={() => showCatalog("trending")}>
                <Search size={16} /> Busca: {query.slice(0,22)} ×
              </button>
            ) : null}
          </div>
          <span className="catalog-source">Catálogo por TMDB</span>
        </div>
        {error ? <div role="status" className="notice">{error}</div> : null}
        {searching && page === 1 ? (
          <section className="panel empty" role="status">
            <LoaderCircle size={24} className="catalog-loading" /><p>Descobrindo histórias…</p>
          </section>
        ) : null}
        {results.length ? (
          <section className="catalog-results">
            <div className="section-title">
              <h2>{catalogMode === "search" ? "Resultados para vocês" :
                catalogMode === "popular" ? "Títulos populares" : "Em alta nesta semana"}</h2>
              <span>{catalogType === "tv" ? "Séries" : "Filmes"}</span>
            </div>
            <div className="movie-grid">
              {results.map((result) => {
                const saved = all.find((entry) => entry.data?.tmdbId === result.id &&
                  entry.data?.mediaType === result.mediaType);
                return (
                  <article key={result.mediaType + "-" + result.id} className="movie-card">
                    {result.poster ? <img src={result.poster} alt={"Pôster de " + result.title}
                      width={180} height={270} loading="lazy" /> :
                      <div className="poster-placeholder"><Clapperboard /></div>}
                    <div className="movie-copy">
                      <h3>{result.title}</h3>
                      <div className="catalog-card-meta">
                        {result.year ? <span className="tag">{result.year}</span> : null}
                        {result.rating != null && result.rating > 0 ? (
                          <span className="tag"><Star size={13} /> {result.rating.toFixed(1)} TMDB</span>
                        ) : null}
                      </div>
                      <p>{result.overview || "Sinopse ainda não disponível em português."}</p>
                      <button type="button" className="secondary" disabled={busy || (!saved && addingId === result.id)}
                        onClick={() => saved ? selectSaved("all") : void saveResult(result)}>
                        {saved ? <><Check size={16} /> Ver na nossa lista</> :
                          addingId === result.id ? "Salvando…" : <><Plus size={16} /> Adicionar à lista</>}
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
        </div>
      </details>

      <div className="tmdb-credit">
        <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer">
          <img src="/tmdb.svg" alt="TMDB" width={100} height={14}/>
        </a>
        <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
      </div>
    </Shell>
  );
}
