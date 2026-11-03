"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Plus,
  MapPin,
  ExternalLink,
  Pencil,
  CalendarDays,
  Check,
} from "lucide-react";
import { Shell } from "./shell";
import { PageHeading, DeleteButton } from "./ui";
import { useDengo } from "./provider";
import type { Entry, Draft } from "@/lib/model";
import { mapsUrl } from "@/lib/calendar";
import { money, parseMoney } from "@/lib/finance";
export function Places() {
  const { entries, busy, add, update, toggle, remove } = useDengo();
  const [open, setOpen] = useState(false),
    [editing, setEditing] = useState<Entry | null>(null),
    [filter, setFilter] = useState("want"),
    [error, setError] = useState("");
  const all = entries.filter((e) => e.kind === "place");
  const list = all.filter((e) => (filter === "visited" ? e.done : !e.done));
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
          address: String(f.get("address") || "").trim(),
          category: String(f.get("category") || "Passeio"),
          budget: budget ? parseMoney(budget) : 0,
          review: String(f.get("review") || ""),
        },
      };
      if (await (editing ? update(editing, d) : add(d))) {
        setOpen(false);
        setEditing(null);
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
            Salvem o nome e o endereço. Para ver o mapa e a rota, o Dengo abre o
            Google Maps sem contratar uma API de mapas.
          </p>
        </div>
      </section>
      {open ? (
        <form
          className="panel entry-form setup-note"
          key={editing?.id || "new"}
          onSubmit={submit}
        >
          <h2>{editing ? "Editar lugar" : "Onde vamos juntos?"}</h2>
          <div className="form-grid">
            <label className="full">
              Nome do lugar
              <input
                name="title"
                required
                maxLength={120}
                defaultValue={editing?.title}
              />
            </label>
            <label className="full">
              Endereço ou cidade
              <input
                name="address"
                required
                maxLength={240}
                defaultValue={editing?.data?.address}
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
              <a
                href={mapsUrl(
                  e.data?.address ? `${e.title}, ${e.data.address}` : e.title,
                )}
                className="secondary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir no Google Maps <ExternalLink size={15} />
              </a>
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
