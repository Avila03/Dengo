/** Visual identity is a personal preference, never a property of the shared couple. */
export const APPEARANCE_THEMES = [
  {id:"original",name:"Dengo Original",background:"#F9F7F4",surface:"#FFFDFB",accent:"#A65364",ink:"#353B37",secondary:"#E8C6CC",dark:false},
  {id:"noite",name:"Noite a Dois",background:"#0C0E15",surface:"#191A25",accent:"#F753A2",ink:"#F7EDF4",secondary:"#383442",dark:true},
  {id:"lavanda",name:"Lavanda",background:"#EEE8FB",surface:"#FFFEFF",accent:"#6636C9",ink:"#2E2149",secondary:"#D3C5E9",dark:false},
  {id:"salvia",name:"Jardim da Sálvia",background:"#0E261D",surface:"#19392C",accent:"#ACE76E",ink:"#F1F6E8",secondary:"#3C5B48",dark:true},
  {id:"iris",name:"Íris Azul",background:"#292F58",surface:"#39416D",accent:"#A5B7FF",ink:"#F4F5FF",secondary:"#525D8B",dark:true},
  {id:"grafite",name:"Grafite Minimal",background:"#222629",surface:"#303538",accent:"#CBD2D4",ink:"#F3F4F3",secondary:"#444E51",dark:true},
  {id:"floresta",name:"Floresta Secreta",background:"#102C24",surface:"#1C4437",accent:"#74E2AC",ink:"#F1FFF6",secondary:"#31594A",dark:true},
  {id:"ametista",name:"Ametista Profunda",background:"#271B3D",surface:"#3D2A56",accent:"#CE9DFF",ink:"#FBF4FF",secondary:"#604476",dark:true},
  {id:"cobalto",name:"Cobalto Elétrico",background:"#1643D8",surface:"#FFFFFF",accent:"#F5CF37",ink:"#122354",secondary:"#93B0FF",dark:false},
  {id:"atelier",name:"Vermelho Atelier",background:"#F8F7F4",surface:"#FFFFFF",accent:"#D91F32",ink:"#191919",secondary:"#E7D9D9",dark:false},
  {id:"fucsia",name:"Fúcsia Pop",background:"#F52C98",surface:"#FFFFFF",accent:"#23152E",ink:"#201321",secondary:"#F2B1D4",dark:false},
  {id:"neon",name:"Neon Arcade",background:"#090B15",surface:"#17192B",accent:"#A56AFF",ink:"#F4F4FF",secondary:"#424060",dark:true},
  {id:"mono",name:"Preto & Branco",background:"#FFFFFF",surface:"#F2F2F2",accent:"#111111",ink:"#080808",secondary:"#D1D1D1",dark:false},
] as const;

export type ThemeId = (typeof APPEARANCE_THEMES)[number]["id"];
export const CARD_STYLES = ["classic","minimal","glass","editorial"] as const;
export const BACKGROUND_STYLES = ["solid","gradient","pattern","aura"] as const;
export const TYPOGRAPHY_STYLES = ["classic","modern","editorial"] as const;
export const ICON_STYLES = ["line","filled","rounded"] as const;
export type CardStyle = (typeof CARD_STYLES)[number];
export type BackgroundStyle = (typeof BACKGROUND_STYLES)[number];
export type TypographyStyle = (typeof TYPOGRAPHY_STYLES)[number];
export type IconStyle = (typeof ICON_STYLES)[number];
export type Appearance = {
  theme: ThemeId;
  cards: CardStyle;
  background: BackgroundStyle;
  font: TypographyStyle;
  icons: IconStyle;
};
export const DEFAULT_APPEARANCE: Appearance = Object.freeze({
  theme:"original", cards:"classic", background:"solid", font:"classic", icons:"line",
});

export function parseAppearance(input: unknown): Appearance {
  const v = input && typeof input === "object" ? input as Record<string,unknown> : {};
  return {
    theme: APPEARANCE_THEMES.some(t=>t.id===v.theme) ? v.theme as ThemeId : "original",
    cards: CARD_STYLES.find(t=>t===v.cards)??"classic",
    background: BACKGROUND_STYLES.find(t=>t===v.background)??"solid",
    font: TYPOGRAPHY_STYLES.find(t=>t===v.font)??"classic",
    icons: ICON_STYLES.find(t=>t===v.icons)??"line",
  };
}
export function appearanceStorageKey(userId: string) {
  return "dengo:appearance:v1:"+userId;
}
