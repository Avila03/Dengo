"use client";
import { Check, Moon, Sun } from "lucide-react";
import { APPEARANCE_THEMES } from "@/lib/appearance";
import { useAppearance } from "./appearance-provider";

/** Escolha individual entre o Caderno de dia e o Caderno à noite. */
export function AppearanceStudio() {
  const { appearance, setAppearance, status } = useAppearance();
  return (
    <section className="panel appearance-studio" aria-labelledby="appearance-title">
      <span className="eyebrow">SEU CADERNO</span>
      <h2 id="appearance-title">Aparência</h2>
      <p className="helper">Cada um escolhe o seu, sem mudar o do par.</p>
      <div className="notebook-choices" role="group" aria-label="Escolher o caderno">
        {APPEARANCE_THEMES.map((theme) => {
          const selected = theme.id === appearance.theme;
          return (
            <button key={theme.id} type="button" aria-pressed={selected}
              className={"notebook-choice" + (selected ? " is-selected" : "")}
              onClick={() => setAppearance({ theme: theme.id })}>
              <span className="notebook-swatch" aria-hidden="true"
                style={{ background: theme.background, borderColor: theme.secondary, color: theme.ink }}>
                <i style={{ background: theme.accent }} />
                <b style={{ borderColor: theme.secondary }} />
                <b style={{ borderColor: theme.secondary }} />
              </span>
              <span className="notebook-name">
                {theme.dark ? <Moon size={15} aria-hidden="true" /> : <Sun size={15} aria-hidden="true" />}
                {theme.name}
              </span>
              {selected ? <Check size={16} aria-hidden="true" className="notebook-check" /> : null}
            </button>
          );
        })}
      </div>
      <p className="appearance-status" role="status" aria-live="polite">
        {status === "saving" ? "Salvando na sua conta…" :
         status === "error" ? "Salvo neste aparelho. Falha ao sincronizar a conta." :
         status === "saved" ? "Caderno salvo" : ""}
      </p>
    </section>
  );
}
