"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Plus, MapPin, ExternalLink, Pencil, CalendarDays, Check,
  Link2, MapPinned, Heart, FolderHeart, CalendarCheck2,
} from "lucide-react";
import { Shell } from "./shell";
import { CleanSheet } from "./clean-sheet";
import { EntryAudit } from "./entry-audit";
import { PageHeading, DeleteButton } from "./ui";
import { useDengo } from "./provider";
import { localToday, isDate, type Entry, type Draft } from "@/lib/model";
import { mapsUrl } from "@/lib/calendar";
import { googleMapsEmbedUrl, openStreetMapEmbedUrl, normalizePlaceLink, safePlaceLink } from "@/lib/places";
import { money, parseMoney } from "@/lib/finance";
import {
  placeCollection, placeCollections, filterPlaces,
  type PlaceStatus,
} from "@/lib/place-collections";

const CATEGORIES = [
  "Passeio", "Restaurante", "Café", "Bar", "Hamburgueria",
  "Pizzaria", "Padaria", "Viagem", "Natureza", "Outros",
];

function linkLabel(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "Abrir vídeo no TikTok";
    if (host === "maps.app.goo.gl" || host === "maps.google.com" ||
        host === "google.com" || host.endsWith(".google.com") ||
        host === "google.com.br" || host.endsWith(".google.com.br"))
      return "Abrir localização salva";
  } catch {
    // Registros antigos com URL inválida não devem ser mostrados como links.
  }
  return "Abrir link salvo";
}

function placeDraft(entry: Entry, changes: Partial<Entry>): Draft {
  return {
    kind: "place",
    title: entry.title,
    detail: entry.detail,
    assignee: entry.assignee,
    due: "",
    done: changes.done ?? entry.done,
    data: { ...entry.data, ...(changes.data || {}) },
  };
}

export function Places() {
  const { entries, busy, add, update, remove } = useDengo();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [status, setStatus] = useState<PlaceStatus>("want");
  const [collection, setCollection] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [error, setError] = useState("");
  const [visited, setVisited] = useState(false);
  const [mapOpen, setMapOpen] = useState<string | null>(null);
  const embedKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY || "";
  const all = entries.filter((entry) => entry.kind === "place");
  const collections = placeCollections(all);
  const list = filterPlaces(all, status, collection, favoritesOnly);
  const favoriteCount = all.filter((entry) => entry.data?.favorite).length;

  function startNew() {
    setVisited(false);
    setEditing(null);
    setError("");
    setOpen((current) => editing !== null ? true : !current);
  }

  function editPlace(entry: Entry) {
    setVisited(entry.done);
    setEditing(entry);
    setError("");
    setOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function savedMap(entry: Entry) {
    const data = entry.data;
    if (data?.osmPlaceId)
      return openStreetMapEmbedUrl(data.latitude, data.longitude);
    if (data?.googlePlaceId)
      return googleMapsEmbedUrl(data.googlePlaceId, embedKey);
    return "";
  }

  async function markVisited(entry: Entry) {
    const done = !entry.done;
    const next = placeDraft(entry, {
      done,
      data: {
        visitedAt: done ? entry.data?.visitedAt || localToday() : "",
      },
    });
    if (!(await update(entry, next))) setError("Não foi possível atualizar a visita.");
  }

  async function setFavorite(entry: Entry) {
    const next = placeDraft(entry, {
      data: { favorite: !entry.data?.favorite },
    });
    if (!(await update(entry, next))) setError("Não foi possível alterar o favorito.");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const budget = String(form.get("budget") || "").trim();
      const url = normalizePlaceLink(String(form.get("url") || ""));
      const title = String(form.get("title") || "").trim();
      const address = String(form.get("address") || "").trim();
      const collectionInput = String(form.get("placeCollection") || "").trim().replace(/\s+/g," ");
      const visited = form.get("visited") === "on";
      const dateInput = String(form.get("visitedAt") || "");
      if (!title || !address) throw new Error("Informe o nome e o endereço do lugar.");
      if (!collectionInput || collectionInput.length > 40)
        throw new Error("Dê um nome à coleção com até 40 caracteres.");
      if (dateInput && !isDate(dateInput)) throw new Error("Informe uma data de visita válida.");
      const draft: Draft = {
        kind: "place",
        title,
        detail: String(form.get("detail") || "").trim(),
        assignee: "Nós dois",
        due: "",
        done: visited,
        data: {
          ...editing?.data,
          address,
          category: String(form.get("category") || "Passeio"),
          placeCollection: collectionInput,
          favorite: form.get("favorite") === "on",
          visitedAt: visited ? (dateInput || editing?.data?.visitedAt || localToday()) : "",
          budget: budget ? parseMoney(budget) : 0,
          review: String(form.get("review") || "").trim(),
          url,
        },
      };
      if (await (editing ? update(editing, draft) : add(draft))) {
        setOpen(false);
        setEditing(null);
        setCollection("");
        setStatus(visited ? "visited" : "want");
      } else {
        setError("Não foi possível salvar este lugar. Tente novamente.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o lugar.");
    }
  }

  return (
    <Shell>
      <PageHeading
        eyebrow="NOVAS HISTÓRIAS PELO CAMINHO"
        title="Nossos lugares"
        description="Guardem dicas, restaurantes, viagens e lugares especiais em coleções do casal."
      >
        <button type="button" className="primary" onClick={startNew}>
          <Plus size={18} />
          {open && !editing ? "Fechar formulário" : "Adicionar local"}
        </button>
      </PageHeading>

      {open ? (
        <CleanSheet title={editing ? "Editar lugar" : "Adicionar local"}
          onClose={() => {setOpen(false);setEditing(null);setError("");}}>
        <form
          key={editing?.id || "new"}
          className="panel entry-form setup-note"
          onSubmit={(event) => void submit(event)}
        >
          <h2>{editing ? "Editar lugar" : "Adicionar um local"}</h2>
          <div className="form-grid">
            <label className="full">
              Nome do lugar
              <input name="title" required maxLength={120}
                defaultValue={editing?.title || ""}
                placeholder="Ex.: Espartano" />
            </label>
            <label className="full">
              Endereço ou cidade
              <input name="address" required maxLength={240}
                defaultValue={editing?.data?.address || ""}
                placeholder="Ex.: Porto Alegre, RS" />
            </label>
            <label>
              Tipo
              <select name="category" defaultValue={editing?.data?.category || "Passeio"}>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
            <label>
              Coleção
              <input name="placeCollection" list="place-collection-suggestions"
                required maxLength={40}
                defaultValue={placeCollection(editing?.data?.placeCollection)}
                placeholder="Ex.: Encontros ou Praia" />
              <datalist id="place-collection-suggestions">
                {collections.map((name) => <option value={name} key={name} />)}
              </datalist>
              <small>Escolha uma coleção ou digite uma nova. Ela será compartilhada com o casal.</small>
            </label>
            <details className="form-details full" open={editing ? true : undefined}>
              <summary>Link, orçamento e observação</summary>
              <div className="form-grid">
            <label>
              Orçamento previsto do casal (R$)
              <input name="budget" inputMode="decimal" placeholder="Ex.: 150,00"
                defaultValue={editing?.data?.budget
                  ? String(editing.data.budget / 100).replace(".", ",") : ""} />
            </label>
            <label className="full">
              Link do local
              <input name="url" type="url" inputMode="url" maxLength={3000}
                defaultValue={editing?.data?.url || ""}
                placeholder="https://maps.app.goo.gl/... ou https://www.tiktok.com/..." />
              <small>Cole um link do Google Maps, TikTok ou de outra página.</small>
            </label>
            <label className="full">
              Por que queremos ir?
              <input name="detail" maxLength={240} defaultValue={editing?.detail || ""} />
            </label>
              </div>
            </details>
            <label className="checkbox-label full">
              <input name="favorite" type="checkbox" defaultChecked={editing?.data?.favorite || false} />
              Adicionar aos favoritos
            </label>
            <label className="checkbox-label full">
              <input name="visited" type="checkbox" checked={visited} onChange={(event) => setVisited(event.target.checked)} />
              Já conhecemos
            </label>
            <div className="full" hidden={!visited}>
            <div className="form-grid">
            <label>
              Data da visita
              <input type="date" name="visitedAt" defaultValue={editing?.data?.visitedAt || ""} />
            </label>
            <label className="full">
              Nossa lembrança ou avaliação
              <input name="review" maxLength={240} defaultValue={editing?.data?.review || ""} />
            </label>
            </div>
            </div>
          </div>
          {error ? <p className="error" role="alert">{error}</p> : null}
          <div className="places-form-actions">
            <button type="submit" className="primary" disabled={busy}>
              {busy ? "Salvando…" : editing ? "Salvar alterações" : "Salvar lugar"}
            </button>
            <button type="button" className="secondary" onClick={() => {
              setOpen(false);
              setEditing(null);
              setError("");
            }}>
              Cancelar
            </button>
          </div>
        </form>
        </CleanSheet>
      ) : null}

      {all.length > 0 ? <section className="places-filter-panel" aria-label="Organizar lugares">
        <div className="places-status-row">
          {([
            ["want", "Queremos conhecer"],
            ["visited", "Já fomos"],
            ["all", "Todos"],
          ] as [PlaceStatus, string][]).map(([value,label]) => (
            <button key={value} type="button"
              aria-pressed={status === value}
              className={status === value ? "selected" : ""}
              onClick={() => setStatus(value)}>{label}</button>
          ))}
          <button type="button" aria-pressed={favoritesOnly}
            className={"places-favorite-filter" + (favoritesOnly ? " selected" : "")}
            onClick={() => { setFavoritesOnly(!favoritesOnly); setStatus("all"); }}>
            <Heart size={15} fill={favoritesOnly ? "currentColor" : "none"} />
            Favoritos {favoriteCount ? "(" + favoriteCount + ")" : ""}
          </button>
        </div>
        <details className="clean-place-collection-filter">
          <summary> {collection ? "Coleção: " + collection : "Filtrar por coleção"}</summary>
        <div className="places-collection-list" role="group" aria-label="Filtrar por coleção">
          <button type="button" aria-pressed={!collection}
            className={!collection ? "selected" : ""} onClick={() => setCollection("")}>
            Todas as coleções
          </button>
          {collections.map((name) => (
            <button key={name} type="button" aria-pressed={collection === name}
              className={collection === name ? "selected" : ""}
              onClick={() => setCollection(name)}>
              <FolderHeart size={14} /> {name}
            </button>
          ))}
        </div>
        </details>
      </section> : null}
      {error && !open ? <p className="error" role="alert">{error}</p> : null}

      {list.length ? (
        <div className="places-grid">
          {list.map((entry) => {
            const sharedUrl = safePlaceLink(entry.data?.url);
            const embedded = savedMap(entry);
            return (
              <article key={entry.id} className="panel place-card">
                <div className="place-card-top">
                  <span className="stat-icon sage"><MapPin /></span>
                  <div className="places-card-tags">
                    <span className="tag">{entry.data?.category || "Passeio"}</span>
                    <button type="button" className={"places-heart" + (entry.data?.favorite ? " is-favorite" : "")}
                      aria-pressed={!!entry.data?.favorite} disabled={busy}
                      aria-label={(entry.data?.favorite ? "Remover favorito " : "Favoritar ") + entry.title}
                      onClick={() => void setFavorite(entry)}>
                      <Heart size={19} fill={entry.data?.favorite ? "currentColor" : "none"} />
                    </button>
                  </div>
                </div>
                <span className="places-collection-name"><FolderHeart size={13} />
                  {placeCollection(entry.data?.placeCollection)}</span>
                <h2>{entry.title}</h2>
                <p>{entry.data?.address}</p>
                {entry.done ? <span className="clean-place-status">
                  <CalendarCheck2 size={14} /> Já fomos
                </span> : null}
                <div className="clean-place-quick-actions">
                  <Link href={"/calendario?origem=" + entry.id} className="clean-place-plan">
                    <CalendarDays size={16} /> Planejar
                  </Link>
                  <button type="button" className="clean-place-visited" disabled={busy}
                    aria-label={(entry.done ? "Voltar aos planos: " : "Marcar como visitado: ") + entry.title}
                    onClick={() => void markVisited(entry)}>
                    <Check size={15} /> {entry.done ? "Desfazer visita" : "Já fomos"}
                  </button>
                </div>
                <details className="clean-place-details">
                  <summary>Detalhes e links</summary>
                  <div className="clean-place-expanded">
                {entry.detail ? <p>{entry.detail}</p> : null}
                {entry.data?.budget ? <strong>Previsto: {money(entry.data.budget)}</strong> : null}
                {entry.done ? <p className="places-visited-label">
                  <CalendarCheck2 size={15} />
                  Visitado{entry.data?.visitedAt
                    ? " em " + new Date(entry.data.visitedAt + "T12:00:00").toLocaleDateString("pt-BR")
                    : ""}
                </p> : null}
                {entry.data?.review ? <p className="place-memory">{entry.data.review}</p> : null}
                {sharedUrl ? (
                  <a href={sharedUrl} target="_blank" rel="noopener noreferrer" className="secondary places-saved-link">
                    <Link2 size={16} /> {linkLabel(sharedUrl)} <ExternalLink size={15} />
                  </a>
                ) : null}
                {embedded ? (
                  <button type="button" className="secondary places-saved-link"
                    onClick={() => setMapOpen((current) => current === entry.id ? null : entry.id)}>
                    <MapPinned size={16} /> {mapOpen === entry.id ? "Ocultar mapa" : "Ver mapa"}
                  </button>
                ) : null}
                {embedded && mapOpen === entry.id ? (
                  <iframe title={"Mapa de " + entry.title} src={embedded}
                    className="places-map-iframe" loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
                ) : null}
                <a href={mapsUrl(entry.data?.address ? entry.title + ", " + entry.data.address : entry.title)}
                  className="secondary places-saved-link" target="_blank" rel="noopener noreferrer">
                  Abrir endereço no Google Maps <ExternalLink size={15} />
                </a>
                <EntryAudit entry={entry} />
                <div className="row-actions places-row-actions">
                  <button type="button" className="secondary" onClick={() => editPlace(entry)}>
                    <Pencil size={16} /> Editar lugar
                  </button>
                  <DeleteButton label={entry.title} disabled={busy}
                    onDelete={() => void remove(entry)} />
                </div>
                  </div>
                </details>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="clean-simple-empty" role="status">
          <MapPin size={21} />
          <div>
            <strong>{all.length ? "Nenhum lugar nesta seleção" : "Nenhum lugar salvo por enquanto"}</strong>
            <p>{all.length ? "Tente outra coleção ou um filtro diferente." :
              "Use “Adicionar local” para guardar seu primeiro lugar."}</p>
            {all.length > 0 ? <button type="button" className="text-link" onClick={() => {
              setCollection("");
              setFavoritesOnly(false);
              setStatus("all");
            }}>Mostrar todos</button> : null}
          </div>
        </section>
      )}
    </Shell>
  );
}
