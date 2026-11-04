"use client";

import {Check,ChevronDown,Palette,RotateCcw,SlidersHorizontal} from "lucide-react";
import {
  APPEARANCE_THEMES,DEFAULT_APPEARANCE,
  type CardStyle,type BackgroundStyle,type TypographyStyle,type IconStyle,
} from "@/lib/appearance";
import {useAppearance} from "./appearance-provider";
const cardOptions:{id:CardStyle;label:string}[]=[
  {id:"classic",label:"Clássico · cartões suaves"},
  {id:"minimal",label:"Minimalista · sem sombras"},
  {id:"glass",label:"Vidro · transparência"},
  {id:"editorial",label:"Editorial · bordas marcantes"},
];
const backgroundOptions:{id:BackgroundStyle;label:string}[]=[
  {id:"solid",label:"Cor sólida"},
  {id:"gradient",label:"Degradê"},
  {id:"pattern",label:"Geométrico"},
  {id:"aura",label:"Aura de cor"},
];
const fontOptions:{id:TypographyStyle;label:string}[]=[
  {id:"classic",label:"Clássica · serifada"},
  {id:"modern",label:"Moderna · sem serifa"},
  {id:"editorial",label:"Editorial · títulos marcantes"},
];
const iconOptions:{id:IconStyle;label:string}[]=[
  {id:"line",label:"Ícones finos"},
  {id:"filled",label:"Ícones preenchidos"},
  {id:"rounded",label:"Ícones arredondados"},
];

export function AppearanceStudio(){
  const {appearance,setAppearance,resetAppearance,status}=useAppearance();
  const current=APPEARANCE_THEMES.find(theme=>theme.id===appearance.theme)??APPEARANCE_THEMES[0];
  const isDefault=Object.entries(DEFAULT_APPEARANCE).every(([key,value])=>
    appearance[key as keyof typeof appearance]===value);
  return (
    <section className="panel appearance-studio" aria-labelledby="appearance-title">
      <div className="appearance-intro">
        <div>
          <span className="eyebrow">DENGO STUDIO</span>
          <h2 id="appearance-title">Aparência</h2>
          <p>Escolha seu estilo. A outra pessoa pode ter um visual diferente no próprio login.</p>
        </div>
        <span className="appearance-mark" aria-hidden="true"><Palette size={20}/></span>
      </div>
      <details className="appearance-picker">
        <summary>
          <span className="appearance-current-swatch" style={{background:current.background,
            borderColor:current.secondary}}>
            <i style={{background:current.accent}}/>
          </span>
          <span className="appearance-summary-copy">
            <strong>{current.name}</strong>
            <small>Escolher entre 13 temas</small>
          </span>
          <ChevronDown size={17}/>
        </summary>
        <div className="appearance-theme-grid" role="group" aria-label="Selecionar esquema de cores">
          {APPEARANCE_THEMES.map(theme=>(
            <button key={theme.id} type="button"
              className={"appearance-theme-choice"+(theme.id===appearance.theme?" is-selected":"")}
              aria-pressed={theme.id===appearance.theme}
              onClick={()=>setAppearance({theme:theme.id})}>
              <span className="appearance-palette" style={{background:theme.background,
                borderColor:theme.secondary}}>
                <i style={{background:theme.surface}}/>
                <i style={{background:theme.accent}}/>
                <i style={{background:theme.ink}}/>
              </span>
              <span>{theme.name}</span>
              {theme.id===appearance.theme ? <Check size={16} aria-hidden="true"/>:null}
            </button>
          ))}
        </div>
      </details>
      <details className="appearance-customizations">
        <summary><SlidersHorizontal size={17}/>
          <span>Personalizações extras</span>
          <ChevronDown size={17}/>
        </summary>
        <div className="appearance-controls">
          <label>Estilos de cartões
            <select value={appearance.cards} onChange={event=>
              setAppearance({cards:event.target.value as CardStyle})}>
              {cardOptions.map(option=><option value={option.id} key={option.id}>{option.label}</option>)}
            </select>
          </label>
          <label>Fundos personalizados
            <select value={appearance.background} onChange={event=>
              setAppearance({background:event.target.value as BackgroundStyle})}>
              {backgroundOptions.map(option=><option value={option.id} key={option.id}>{option.label}</option>)}
            </select>
          </label>
          <label>Tipografia
            <select value={appearance.font} onChange={event=>
              setAppearance({font:event.target.value as TypographyStyle})}>
              {fontOptions.map(option=><option value={option.id} key={option.id}>{option.label}</option>)}
            </select>
          </label>
          <label>Estilo dos ícones
            <select value={appearance.icons} onChange={event=>
              setAppearance({icons:event.target.value as IconStyle})}>
              {iconOptions.map(option=><option value={option.id} key={option.id}>{option.label}</option>)}
            </select>
          </label>
        </div>
      </details>
      <div className="appearance-actions">
        <span role="status" aria-live="polite">
          {status==="saving"?"Salvando na sua conta…":
           status==="saved"?"Aparência salva":
           status==="error"?"Salvo neste aparelho. Falha ao sincronizar a conta.":
           "Preferência individual, sem afetar o casal"}
        </span>
        <button type="button" className="appearance-reset" onClick={resetAppearance}
          disabled={isDefault} aria-label="Restaurar tema Original e configurações padrão">
          <RotateCcw size={15}/> Restaurar Original
        </button>
      </div>
    </section>
  );
}
