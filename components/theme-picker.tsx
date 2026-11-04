"use client";

import { useEffect, useState } from "react";
import { Check, Heart, Palette, RotateCcw } from "lucide-react";
import { useDengo } from "./provider";
import { applyDocumentTheme, DEFAULT_THEME, THEMES, type ThemeId } from "@/lib/themes";

export function ThemePicker() {
  const { theme, saveTheme, themeSaving, demo } = useDengo();
  const [preview, setPreview] = useState<ThemeId>(theme);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setPreview(theme);
  }, [theme]);

  useEffect(() => {
    applyDocumentTheme(preview);
    return () => applyDocumentTheme(theme);
  }, [preview, theme]);

  async function commitTheme(value: ThemeId) {
    setMessage("");
    const success = await saveTheme(value);
    if (success) {
      setPreview(value);
      setMessage("Tema aplicado à sua conta.");
    } else {
      setPreview(theme);
      setMessage("Não foi possível salvar. Tente novamente.");
    }
  }

  return (
    <section className="panel appearance-panel" aria-labelledby="appearance-title">
      <div className="appearance-heading">
        <div className="appearance-icon"><Palette size={20}/></div>
        <div>
          <h2 id="appearance-title">Aparência</h2>
          <p>Seis estilos, seis atmosferas. Escolha o seu.</p>
        </div>
      </div>
      <p className="appearance-help">
        Toque em um tema para ver o Dengo inteiro mudar de cor. Só sua conta
        utiliza essa escolha — a outra pessoa mantém o próprio tema.
      </p>
      <div className="appearance-options" role="group" aria-label="Escolher aparência do Dengo">
        {THEMES.map(item => {
          const selected = preview === item.id;
          return (
            <button key={item.id} type="button"
              className={"appearance-option" + (selected ? " selected" : "")}
              aria-pressed={selected}
              aria-label={"Visualizar " + item.name}
              onClick={() => { setPreview(item.id); setMessage(""); }}>
              <span className="appearance-miniature"
                style={{ backgroundColor:item.background, color:item.ink }}>
                <span className="appearance-mini-header">
                  <span style={{ color:item.accent }}>dengo <Heart size={11} fill="currentColor"/></span>
                  <span className="appearance-mini-dot" style={{backgroundColor:item.accent}}/>
                </span>
                <span className="appearance-mini-panel"
                  style={{backgroundColor:item.surface, borderColor:item.soft}}>
                  <span className="appearance-mini-title">Nosso dia.</span>
                  <span className="appearance-mini-subtitle" style={{color:item.muted}}>Esta semana</span>
                  <span className="appearance-mini-bottom">
                    <span className="appearance-mini-lines" aria-hidden="true">
                      <i style={{background:item.soft}}/><i style={{background:item.soft}}/>
                    </span>
                    <span className="appearance-mini-action"
                      style={{background:item.accent,color:item.actionText}}>Adicionar</span>
                  </span>
                </span>
              </span>
              <span className="appearance-option-foot">
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.mood}</small>
                </span>
                <span className="appearance-choice-mark" aria-hidden="true">
                  {selected ? <Check size={15}/> : null}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="appearance-commit">
        <div>
          <strong>{THEMES.find(t=>t.id===preview)?.name}</strong>
          <small>{preview===theme ? "Tema atualmente salvo" : "Prévia — ainda não salva"}</small>
        </div>
        <button type="button" className="primary" disabled={themeSaving || preview===theme}
          onClick={() => void commitTheme(preview)}>
          <Check size={16}/>
          {themeSaving ? "Salvando…" : preview===theme ? "Aplicado" : "Aplicar tema"}
        </button>
      </div>
      <div className="appearance-bottom">
        <button type="button" className="text-link" disabled={themeSaving}
          onClick={() => {
            if (theme===DEFAULT_THEME) {
              setPreview(DEFAULT_THEME);
              setMessage("");
            } else void commitTheme(DEFAULT_THEME);
          }}>
          <RotateCcw size={14}/> Restaurar Original
        </button>
        {message ? <span role="status" className="appearance-message">{message}</span> : null}
      </div>
      <small className="appearance-storage-note">
        {demo ? "Na demonstração, a aparência fica salva neste navegador." :
          "Sua escolha fica vinculada ao seu login e acompanha sua conta."}
      </small>
    </section>
  );
}
