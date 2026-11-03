"use client";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Plus,
  MapPin,
  ExternalLink,
  Pencil,
  CalendarDays,
  Check,
  Search,
  MapPinned,
  LoaderCircle,
} from "lucide-react";
import { Shell } from "./shell";
import { EntryAudit } from "./entry-audit";
import { PageHeading, DeleteButton } from "./ui";
import { useDengo } from "./provider";
import type { Entry, Draft } from "@/lib/model";
import { mapsUrl } from "@/lib/calendar";
import { googleMapsEmbedUrl, googlePlaceMapsUrl, openStreetMapEmbedUrl, type PlaceSearchResult, type OpenStreetMapPlace } from "@/lib/places";
import { supabase } from "@/lib/supabase";
import { money, parseMoney } from "@/lib/finance";
export function Places() {
  const { entries, busy, add, update, toggle, remove } = useDengo();
  const [open, setOpen] = useState(false),
    [editing, setEditing] = useState<Entry | null>(null),
    [filter, setFilter] = useState("want"),
    [error, setError] = useState(""),
    [term, setTerm] = useState(""),
    [city, setCity] = useState(""),
    [results, setResults] = useState<PlaceSearchResult[]>([]),
    [searchError, setSearchError] = useState(""),
    [searching, setSearching] = useState(false),
    [selectedPlace, setSelectedPlace] = useState<PlaceSearchResult | null>(null),
    [mapOpen, setMapOpen] = useState<string | null>(null);
  const searchLock = useRef(false);
  const embedKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY || "";
  const isOSM = (place: PlaceSearchResult): place is OpenStreetMapPlace =>
    "source" in place && place.source === "openstreetmap";
  const savedMap = (entry: Entry) =>
    entry.data?.osmPlaceId
      ? openStreetMapEmbedUrl(entry.data.latitude, entry.data.longitude)
      : googleMapsEmbedUrl(entry.data?.googlePlaceId, embedKey);
  const all = entries.filter((e) => e.kind === "place");
  const list = all.filter((e) => (filter === "visited" ? e.done : !e.done));
  async function searchPlace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (searchLock.current) return;
    searchLock.current = true;
    setSearching(true);
    setSearchError("");
    setResults([]);
    try {
      const { data } = supabase
        ? await supabase.auth.getSession()
        : { data: { session: null } };
      const query = new URLSearchParams({ q: term.trim() });
      if (city.trim()) query.set("city", city.trim());
      const response = await fetch("/api/places?" + query.toString(), {
        headers: data.session ? { Authorization: "Bearer " + data.session.access_token } : {},
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível pesquisar lugares.");
      const incoming: PlaceSearchResult[] = Array.isArray(body.results) ? body.results : [];
      setResults(incoming);
      if (!incoming.length) setSearchError("Nenhum local encontrado. Tente informar a cidade.");
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Não foi possível pesquisar lugares.");
    } finally {
      searchLock.current = false;
      setSearching(false);
    }
  }
  function choosePlace(place: PlaceSearchResult) {
    const existing = all.find((entry) => isOSM(place) ? entry.data?.osmPlaceId === place.id : entry.data?.googlePlaceId === place.id);
    setEditing(existing || null);
    setSelectedPlace(existing ? null : place);
    setOpen(true);
    setError("");
    if (existing) setFilter(existing.done ? "visited" : "want");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const f = new FormData(event.currentTarget);
    try {
      const budget = String(f.get("budget") || "").trim();
      const d: Draft = {
        kind: "place",
        title: String(f.get("title") || "").trim(),
        detail: String(f.get("detail") || ""),
        assignee: "Nós dois",
        due: "",
        done: f.get("visited") === "on",
        data: {
          ...editing?.data,
          googlePlaceId: selectedPlace && !isOSM(selectedPlace)
            ? selectedPlace.id : editing?.data?.googlePlaceId,
          osmPlaceId: selectedPlace && isOSM(selectedPlace)
            ? selectedPlace.id : editing?.data?.osmPlaceId,
          latitude: selectedPlace && isOSM(selectedPlace)
            ? selectedPlace.lat : editing?.data?.latitude,
          longitude: selectedPlace && isOSM(selectedPlace)
            ? selectedPlace.lon : editing?.data?.longitude,
          address: String(f.get("address") || "").trim(),
          category: String(f.get("category") || "Passeio"),
          budget: budget ? parseMoney(budget) : 0,
          review: String(f.get("review") || ""),
        },
      };
      if (await (editing ? update(editing, d) : add(d))) {
        setOpen(false);
        setEditing(null);
        setSelectedPlace(null);
        setResults([]);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Shell>
      <PageHeading
        eyebrow="NOVAS HISTÓRIAS PELO CAMINHO"
        title="Nossos lugares"
        description="Do café da esquina à viagem dos sonhos."
      >
        <button
          className="primary"
          onClick={() => {
            setOpen(!open);
            setEditing(null);
            setSelectedPlace(null);
          }}
        >
          <Plus size={18} />
          {open ? "Fechar" : "Salvar um lugar"}
        </button>
      </PageHeading>
      <section className="panel place-intro">
        <MapPin />
        <div>
          <h2>Uma lista de próximos destinos.</h2>
          <p>
            Pesquisem um lugar pelo nome, escolham o endereço correto e vejam
            sua localização no mapa. Depois, salvem os planos do casal.
          </p>
        </div>
      </section>
      <section className="panel places-search-panel">
        <h2>Encontrar um estabelecimento</h2>
        <form className="places-search-form" onSubmit={(event) => void searchPlace(event)}>
          <label>
            Nome do lugar
            <input required minLength={2} maxLength={100} value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Ex.: Espartano" />
          </label>
          <label>
            Cidade ou região (opcional)
            <input maxLength={80} value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Ex.: Porto Alegre" />
          </label>
          <button type="submit" className="primary" disabled={searching || term.trim().length < 2}>
            {searching ? <LoaderCircle size={17} className="places-search-spin" /> : <Search size={17} />}
            {searching ? "Buscando…" : "Pesquisar"}
          </button>
        </form>
        <small>Pesquisa gratuita, sem conta ou cartão, com dados do OpenStreetMap. Nem todos os estabelecimentos estão cadastrados. © OpenStreetMap contributors.</small>
        {searchError ? <div className="notice" role="status">{searchError}</div> : null}
        {results.length > 0 ? (
          <div className="places-search-results">
            <h3>Selecione o endereço certo</h3>
            {results.map((place) => {
              const saved = all.some((e) => isOSM(place) ? e.data?.osmPlaceId === place.id : e.data?.googlePlaceId === place.id);
              return (
                <button type="button" className="places-search-choice" key={place.id}
                  onClick={() => choosePlace(place)}>
                  <MapPin size={19} />
                  <span>
                    <strong>{place.title}</strong>
                    <small>{place.address || "Sem endereço informado"}</small>
                    {place.category ? <small>{place.category}</small> : null}
                  </span>
                  <span className="places-search-choose">{saved ? "Editar salvo" : "Selecionar"}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </section>
      {open ? (
        <form
          className="panel entry-form setup-note"
          key={editing?.id || selectedPlace?.id || "new"}
          onSubmit={submit}
        >
          <h2>{editing ? "Editar lugar" : selectedPlace ? "Salvar o lugar escolhido" : "Onde vamos juntos?"}</h2>
          {(selectedPlace?.id || editing?.data?.googlePlaceId || editing?.data?.osmPlaceId) ? (
            <div className="places-preview">
              <div className="places-preview-label">
                <strong><MapPin size={17} /> {selectedPlace?.title || editing?.title}</strong>
                <small>{selectedPlace?.address || editing?.data?.address}</small>
              </div>
              {(() => {
                const osm = selectedPlace && isOSM(selectedPlace);
                const lat = osm ? selectedPlace.lat : editing?.data?.latitude;
                const lon = osm ? selectedPlace.lon : editing?.data?.longitude;
                const mapSrc = osm || editing?.data?.osmPlaceId
                  ? openStreetMapEmbedUrl(lat, lon)
                  : googleMapsEmbedUrl(selectedPlace?.id || editing?.data?.googlePlaceId, embedKey);
                const route = osm || editing?.data?.osmPlaceId
                  ? lat !== undefined && lon !== undefined
                    ? mapsUrl(String(lat) + "," + String(lon))
                    : mapsUrl(selectedPlace?.title || editing?.title || "")
                  : googlePlaceMapsUrl(selectedPlace?.id || editing?.data?.googlePlaceId,
                      [selectedPlace?.title || editing?.title, selectedPlace?.address || editing?.data?.address].filter(Boolean).join(", "));
                return (
                  <>
                    {mapSrc ? (
                      <iframe title={"Localização de " + (selectedPlace?.title || editing?.title)}
                        src={mapSrc} className="places-map-iframe" loading="lazy"
                        referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
                    ) : (
                      <p>Não foi possível mostrar o mapa interno. Abra a localização pelo link abaixo.</p>
                    )}
                    <a className="secondary" target="_blank" rel="noopener noreferrer" href={route}>
                      Abrir rota no Google Maps <ExternalLink size={15} />
                    </a>
                  </>
                );
              })()}
            </div>
          ) : null}
          <div className="form-grid">
            <label className="full">
              Nome do lugar
              <input
                name="title"
                required
                maxLength={120}
                defaultValue={selectedPlace?.title || editing?.title}
              />
            </label>
            <label className="full">
              Endereço ou cidade
              <input
                name="address"
                required
                maxLength={240}
                defaultValue={selectedPlace?.address || editing?.data?.address}
                placeholder="Ex.: Rua, número, cidade"
              />
            </label>
            <label>
              Tipo
              <select
                name="category"
                defaultValue={editing?.data?.category || "Passeio"}
              >
                {[
                  "Passeio",
                  "Restaurante",
                  "Café",
                  "Viagem",
                  "Natureza",
                  "Outros",
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Orçamento previsto do casal (R$)
              <input
                name="budget"
                inputMode="decimal"
                placeholder="Opcional"
                defaultValue={
                  editing?.data?.budget
                    ? String(editing.data.budget / 100).replace(".", ",")
                    : ""
                }
              />
            </label>
            <label className="full">
              Por que queremos ir?
              <input
                name="detail"
                maxLength={240}
                defaultValue={editing?.detail}
              />
            </label>
            <label className="checkbox-label full">
              <input
                type="checkbox"
                name="visited"
                defaultChecked={editing?.done}
              />
              Já conhecemos
            </label>
            <label className="full">
              Nossa lembrança ou avaliação
              <input
                name="review"
                maxLength={240}
                defaultValue={editing?.data?.review}
              />
            </label>
          </div>
          {error ? (
            <p role="alert" className="error">
              {error}
            </p>
          ) : null}
          <button className="primary" disabled={busy}>
            {busy ? "Salvando…" : "Salvar lugar"}
          </button>
        </form>
      ) : null}
      <div className="filters spaced">
        {[
          ["want", "Queremos conhecer"],
          ["visited", "Já fomos"],
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
      {list.length ? (
        <div className="places-grid">
          {list.map((e) => (
            <article className="panel place-card" key={e.id}>
              <div className="place-card-top">
                <span className="stat-icon sage">
                  <MapPin />
                </span>
                <span className="tag">{e.data?.category}</span>
              </div>
              <h2>{e.title}</h2>
              <p>{e.data?.address}</p>
              {e.detail ? <p>{e.detail}</p> : null}
              {e.data?.budget ? (
                <strong>Previsto: {money(e.data.budget)}</strong>
              ) : null}
              {e.data?.review ? (
                <p className="place-memory">{e.data.review}</p>
              ) : null}
              {savedMap(e) ? (
                <button type="button" className="secondary" onClick={() => setMapOpen(mapOpen === e.id ? null : e.id)}>
                  <MapPinned size={16} /> {mapOpen === e.id ? "Ocultar mapa" : "Ver no mapa"}
                </button>
              ) : null}
              {mapOpen === e.id && savedMap(e) ? (
                <iframe title={"Mapa de " + e.title} className="places-map-iframe"
                  src={savedMap(e)}
                  loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
              ) : null}
              <a
                href={e.data?.osmPlaceId && e.data?.latitude !== undefined && e.data?.longitude !== undefined
                  ? mapsUrl(String(e.data.latitude) + "," + String(e.data.longitude))
                  : e.data?.googlePlaceId
                    ? googlePlaceMapsUrl(e.data.googlePlaceId, [e.title, e.data?.address].filter(Boolean).join(", "))
                    : mapsUrl(e.data?.address ? e.title + ", " + e.data.address : e.title)}
                className="secondary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir no Google Maps <ExternalLink size={15} />
              </a>
              <EntryAudit entry={e} />
              <div className="row-actions">
                <button
                  disabled={busy}
                  className="icon-btn"
                  aria-label={`${e.done ? "Voltar aos planos" : "Marcar como visitado"} ${e.title}`}
                  onClick={() => void toggle(e)}
                >
                  <Check size={17} />
                </button>
                <Link className="text-link" href={`/calendario?origem=${e.id}`}>
                  <CalendarDays size={16} />
                  Planejar visita
                </Link>
                <button
                  className="icon-btn"
                  aria-label={`Editar ${e.title}`}
                  onClick={() => {
                    setEditing(e);
                    setSelectedPlace(null);
                    setOpen(true);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <Pencil size={17} />
                </button>
                <DeleteButton
                  label={e.title}
                  disabled={busy}
                  onDelete={() => void remove(e)}
                />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="panel empty large">
          <MapPin size={35} />
          <h2>Qual vai ser o primeiro destino?</h2>
          <p>Salvem um lugar que vocês têm vontade de conhecer.</p>
        </section>
      )}
    </Shell>
  );
}
