"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Plus, MapPin, ExternalLink, Pencil, CalendarDays, Check, Link2, MapPinned } from "lucide-react";
import { Shell } from "./shell";
import { EntryAudit } from "./entry-audit";
import { PageHeading, DeleteButton } from "./ui";
import { useDengo } from "./provider";
import type { Entry, Draft } from "@/lib/model";
import { mapsUrl } from "@/lib/calendar";
import { googleMapsEmbedUrl, openStreetMapEmbedUrl, normalizePlaceLink, safePlaceLink } from "@/lib/places";
import { money, parseMoney } from "@/lib/finance";

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
    // Links antigos ou inválidos nunca são apresentados como links.
  }
  return "Abrir link salvo";
}

export function Places() {
  const { entries, busy, add, update, toggle, remove } = useDengo();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [filter, setFilter] = useState<"want" | "visited">("want");
  const [error, setError] = useState("");
  const [mapOpen, setMapOpen] = useState<string | null>(null);
  const embedKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY || "";
  const all = entries.filter((entry) => entry.kind === "place");
  const list = all.filter((entry) => filter === "visited" ? entry.done : !entry.done);

  function startNew() {
    setEditing(null);
    setError("");
    setOpen((current) => editing !== null ? true : !current);
  }

  function editPlace(entry: Entry) {
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const budget = String(form.get("budget") || "").trim();
      const url = normalizePlaceLink(String(form.get("url") || ""));
      const title = String(form.get("title") || "").trim();
      const address = String(form.get("address") || "").trim();
      if (!title || !address) throw new Error("Informe o nome e o endereço do lugar.");
      const draft: Draft = {
        kind: "place",
        title,
        detail: String(form.get("detail") || "").trim(),
        assignee: "Nós dois",
        due: "",
        done: form.get("visited") === "on",
        data: {
          ...editing?.data,
          address,
          category: String(form.get("category") || "Passeio"),
          budget: budget ? parseMoney(budget) : 0,
          review: String(form.get("review") || "").trim(),
          url,
        },
      };
      if (await (editing ? update(editing, draft) : add(draft))) {
        setOpen(false);
        setEditing(null);
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
        description="Guardem restaurantes, cafés, vídeos de dicas e os lugares que querem conhecer juntos."
      >
        <button type="button" className="primary" onClick={startNew}>
          <Plus size={18} />
          {open && !editing ? "Fechar formulário" : "Adicionar local"}
        </button>
      </PageHeading>

      <section className="panel place-intro">
        <MapPin />
        <div>
          <h2>Um lugar para os nossos próximos destinos.</h2>
          <p>
            Adicione um local, organize os detalhes e, se quiser, cole um link
            do TikTok, do Google Maps ou de outra página para consultar depois.
          </p>
        </div>
      </section>

      {open ? (
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
              Orçamento previsto do casal (R$)
              <input name="budget" inputMode="decimal" placeholder="Opcional"
                defaultValue={editing?.data?.budget
                  ? String(editing.data.budget / 100).replace(".", ",") : ""} />
            </label>
            <label className="full">
              Link do local (opcional)
              <input name="url" type="url" inputMode="url" maxLength={3000}
                defaultValue={editing?.data?.url || ""}
                placeholder="https://maps.app.goo.gl/... ou https://www.tiktok.com/..." />
              <small>Cole um link do Google Maps, TikTok ou de outra página. Não é necessário cadastrar nenhuma API.</small>
            </label>
            <label className="full">
              Por que queremos ir?
              <input name="detail" maxLength={240} defaultValue={editing?.detail || ""} />
            </label>
            <label className="checkbox-label full">
              <input name="visited" type="checkbox" defaultChecked={editing?.done || false} />
              Já conhecemos
            </label>
            <label className="full">
              Nossa lembrança ou avaliação
              <input name="review" maxLength={240} defaultValue={editing?.data?.review || ""} />
            </label>
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
      ) : null}

      <div className="filters spaced">
        <button type="button" className={filter === "want" ? "selected" : ""}
          aria-pressed={filter === "want"} onClick={() => setFilter("want")}>
          Queremos conhecer
        </button>
        <button type="button" className={filter === "visited" ? "selected" : ""}
          aria-pressed={filter === "visited"} onClick={() => setFilter("visited")}>
          Já fomos
        </button>
      </div>

      {list.length ? (
        <div className="places-grid">
          {list.map((entry) => {
            const sharedUrl = safePlaceLink(entry.data?.url);
            const embedded = savedMap(entry);
            return (
              <article key={entry.id} className="panel place-card">
                <div className="place-card-top">
                  <span className="stat-icon sage"><MapPin /></span>
                  <span className="tag">{entry.data?.category || "Passeio"}</span>
                </div>
                <h2>{entry.title}</h2>
                <p>{entry.data?.address}</p>
                {entry.detail ? <p>{entry.detail}</p> : null}
                {entry.data?.budget ? <strong>Previsto: {money(entry.data.budget)}</strong> : null}
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
                <div className="row-actions">
                  <button disabled={busy} type="button" className="icon-btn"
                    aria-label={(entry.done ? "Voltar aos planos " : "Marcar como visitado ") + entry.title}
                    onClick={() => void toggle(entry)}>
                    <Check size={17} />
                  </button>
                  <Link className="text-link" href={"/calendario?origem=" + entry.id}>
                    <CalendarDays size={16} /> Planejar visita
                  </Link>
                  <button type="button" className="icon-btn" aria-label={"Editar " + entry.title}
                    onClick={() => editPlace(entry)}>
                    <Pencil size={17} />
                  </button>
                  <DeleteButton label={entry.title} disabled={busy} onDelete={() => void remove(entry)} />
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="panel empty large">
          <MapPin size={35} />
          <h2>{filter === "visited" ? "Ainda não registramos visitas" : "Qual vai ser o primeiro destino?"}</h2>
          <p>{filter === "visited" ? "Marquem um lugar como visitado para aparecer aqui." : "Adicionem um lugar, uma dica do TikTok ou uma localização do Google Maps."}</p>
          {filter === "want" ? <button type="button" className="secondary" onClick={startNew}>Adicionar local</button> : null}
        </section>
      )}
    </Shell>
  );
}
