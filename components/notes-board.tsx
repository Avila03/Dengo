"use client";
import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { NOTE_MAX, noteWhen, type Note } from "@/lib/notes";
import { useDengo } from "./provider";

/** Bilhetes no "Nosso dia": o mais recente em destaque, os anteriores logo abaixo. */
export function NotesBoard() {
  const { notes, postNote, deleteNote, ownNote, names, memberSlot, busy } = useDengo();
  const [draft, setDraft] = useState("");
  const partner = names[memberSlot === 0 ? 1 : 0] || "seu par";
  const [latest, ...older] = notes;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await postNote(draft)) setDraft("");
  }
  const author = (note: Note) => names[note.author_slot] || "Alguém";
  const pen = (note: Note) => (note.author_slot === 0 ? "a" : "b");

  return (
    <section className="notes-board" aria-label="Bilhetes">
      {latest ? (
        <figure className="note-card note-latest">
          <blockquote>{latest.body}</blockquote>
          <figcaption>
            <span className="note-author" data-pen={pen(latest)}>— {author(latest)}</span>
            <time dateTime={latest.created_at}>{noteWhen(latest.created_at)}</time>
          </figcaption>
          {ownNote(latest) ? (
            <button type="button" className="note-remove" disabled={busy}
              aria-label="Tirar este bilhete" onClick={() => void deleteNote(latest.id)}>
              <X size={16} aria-hidden="true" />
            </button>
          ) : null}
        </figure>
      ) : null}
      <form className="note-compose" onSubmit={(e) => void submit(e)}>
        <label className="sr-only" htmlFor="note-draft">Escrever um bilhete para {partner}</label>
        <input id="note-draft" value={draft} maxLength={NOTE_MAX} autoComplete="off"
          placeholder={`Deixar um bilhete para ${partner}…`}
          onChange={(e) => setDraft(e.target.value)} />
        <button type="submit" className="primary" disabled={busy || !draft.trim()}>Colar</button>
      </form>
      {older.length ? (
        <details className="notes-older">
          <summary>Bilhetes anteriores ({older.length})</summary>
          <ul>
            {older.map((note) => (
              <li key={note.id} className="note-card note-small">
                <p>{note.body}</p>
                <span className="note-meta">
                  <span className="note-author" data-pen={pen(note)}>{author(note)}</span>
                  {" · "}<time dateTime={note.created_at}>{noteWhen(note.created_at)}</time>
                  {ownNote(note) ? (
                    <button type="button" className="note-remove-inline" disabled={busy}
                      aria-label={"Tirar o bilhete: " + note.body.slice(0, 40)}
                      onClick={() => void deleteNote(note.id)}>tirar</button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
