"use client";
import { useState, useEffect, type FormEvent } from "react";
import {
  Download,
  ShieldCheck,
  Heart,
  Cloud,
  Monitor,
  Save,
  LogOut,
} from "lucide-react";
import { Shell } from "./shell";
import { useDengo } from "./provider";
import { CATEGORIES, parseMoney } from "@/lib/finance";
import { downloadFile } from "@/lib/calendar";
import { localToday } from "@/lib/model";
export function Settings() {
  const {
    entries,
    demo,
    preferences,
    busy,
    savePreferences,
    signOut,
    openLobby,
  } = useDengo();
  const [photo, setPhoto] = useState(preferences.photo),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  useEffect(() => setPhoto(preferences.photo), [preferences.photo]);
  async function readPhoto(file: File | undefined) {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 10000000
    ) {
      setError("Escolha uma foto JPG, PNG ou WebP de até 10 MB.");
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 480 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error();
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      setPhoto(canvas.toDataURL("image/jpeg", 0.78));
      setSaved(false);
    } catch {
      setError("Não foi possível processar esta foto. Tente outra imagem.");
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);
    const f = new FormData(event.currentTarget);
    try {
      const budgets: Record<string, number> = {};
      for (const c of CATEGORIES) {
        const v = String(f.get(`budget-${c}`) || "").trim();
        if (v && v !== "0") budgets[c] = parseMoney(v);
      }
      if (
        await savePreferences({
          title: String(f.get("title") || "").trim(),
          names: [
            String(f.get("first") || "").trim(),
            String(f.get("second") || "").trim(),
          ],
          since: String(f.get("since") || ""),
          photo,
          budgets,
        })
      )
        setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Shell>
      <section className="page-heading">
        <div>
          <span className="eyebrow">FEITO PARA VOCÊS</span>
          <h1>
            Nosso espaço<span className="rose">.</span>
          </h1>
          <p>O cotidiano com a cara de vocês.</p>
        </div>
        <Heart className="rose" size={35} />
      </section>
      <form
        key={preferences.names.join("-") + preferences.since}
        className="panel entry-form"
        onSubmit={submit}
      >
        <h2>Nossa identidade</h2>
        <button type="button" className="secondary" onClick={openLobby}>
          Abrir lobby do casal
        </button>
        <label className="spaced">
          Nome do espaço
          <input
            name="title"
            required
            maxLength={80}
            defaultValue={preferences.title}
          />
        </label>
        <div className="profile-preview">
          {photo ? (
            <img src={photo} alt="Foto do casal" width={100} height={100} />
          ) : (
            <div className="profile-photo-empty">
              <Heart />
            </div>
          )}
          <div>
            <label>
              Foto do casal
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => void readPhoto(e.target.files?.[0])}
              />
            </label>
            {photo ? (
              <button
                type="button"
                className="text-link"
                onClick={() => setPhoto("")}
              >
                Remover foto
              </button>
            ) : null}
          </div>
        </div>
        <div className="form-grid">
          <label>
            Primeira pessoa
            <input
              name="first"
              required
              maxLength={60}
              defaultValue={preferences.names[0]}
            />
          </label>
          <label>
            Segunda pessoa
            <input
              name="second"
              required
              maxLength={60}
              defaultValue={preferences.names[1]}
            />
          </label>
          <label>
            Juntos desde
            <input
              name="since"
              type="date"
              max={localToday()}
              defaultValue={preferences.since}
            />
          </label>
        </div>
        <h2>Limites mensais por categoria</h2>
        <p>Valores em reais. Deixe em branco para não definir limite.</p>
        <div className="form-grid">
          {CATEGORIES.map((c) => (
            <label key={c}>
              {c}
              <input
                name={`budget-${c}`}
                inputMode="decimal"
                placeholder="Sem limite"
                defaultValue={
                  preferences.budgets[c]
                    ? String(preferences.budgets[c] / 100).replace(".", ",")
                    : ""
                }
              />
            </label>
          ))}
        </div>
        {error ? (
          <p role="alert" className="error">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p role="status" className="notice">
            Nosso espaço foi atualizado.
          </p>
        ) : null}
        <button className="primary" disabled={busy}>
          <Save size={17} />
          {busy ? "Salvando…" : "Salvar nosso espaço"}
        </button>
      </form>
      <div className="two-columns">
        <section className="panel">
          <div className="stat-icon sage">
            <ShieldCheck />
          </div>
          <h2>
            {demo ? "Conhecendo o Dengo" : "Privacidade em primeiro lugar"}
          </h2>
          <p>
            {demo
              ? "Esta é uma demonstração. Os registros ficam neste navegador, sem compartilhar com outro aparelho."
              : "O acesso aos registros é restrito às contas vinculadas ao espaço do casal."}
          </p>
          <span className="tag">
            {demo ? <Monitor size={14} /> : <Cloud size={14} />}{" "}
            {demo ? "Armazenamento local" : "Dados compartilhados"}
          </span>
          {!demo ? (
            <button className="secondary spaced" onClick={signOut}>
              <LogOut size={16} />
              Sair da conta
            </button>
          ) : null}
        </section>
        <section className="panel">
          <h2>Uma cópia da nossa história</h2>
          <p>
            Exporte os registros e a personalização em JSON. A importação ainda
            não está disponível.
          </p>
          <button
            className="secondary"
            onClick={() =>
              downloadFile(
                "dengo-dados.json",
                JSON.stringify(
                  {
                    version: 2,
                    exported_at: new Date().toISOString(),
                    entries,
                    preferences,
                  },
                  null,
                  2,
                ),
                "application/json",
              )
            }
          >
            <Download size={17} />
            Exportar meus dados
          </button>
        </section>
      </div>
      <section className="panel">
        <h2>Conexões externas</h2>
        <p>
          Google Maps abre o endereço salvo. Google Agenda recebe uma cópia do
          compromisso confirmada por você; não há sincronização automática. O
          catálogo TMDB precisa de uma credencial configurada na hospedagem e
          tem cadastro manual como alternativa.
        </p>
      </section>
    </Shell>
  );
}
