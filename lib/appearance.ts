/** Visual identity is a personal preference, never a property of the shared couple. */
export const APPEARANCE_THEMES = [
  {id:"caderno",name:"Caderno de dia",background:"#F5EDE0",surface:"#FFFDF8",accent:"#C23A2B",ink:"#22305A",secondary:"#DCCFBB",dark:false},
  {id:"caderno-noite",name:"Caderno à noite",background:"#1C2034",surface:"#262B44",accent:"#FF7B67",ink:"#EEE4D3",secondary:"#3A4062",dark:true},
] as const;

export type ThemeId = (typeof APPEARANCE_THEMES)[number]["id"];
export type Appearance = { theme: ThemeId };
export const DEFAULT_APPEARANCE: Appearance = Object.freeze({ theme: "caderno" });

/** Temas do antigo Dengo Studio (até a 2.8) que eram escuros: viram o Caderno à noite. */
const LEGACY_DARK = ["noite","salvia","iris","grafite","floresta","ametista","neon"];

export function parseAppearance(input: unknown): Appearance {
  const v = input && typeof input === "object" ? input as Record<string,unknown> : {};
  const theme = typeof v.theme === "string" ? v.theme : "";
  if (APPEARANCE_THEMES.some(t=>t.id===theme)) return { theme: theme as ThemeId };
  return { theme: LEGACY_DARK.includes(theme) ? "caderno-noite" : "caderno" };
}
export function themeById(id: ThemeId) {
  return APPEARANCE_THEMES.find(t=>t.id===id) ?? APPEARANCE_THEMES[0];
}
export function appearanceStorageKey(userId: string) {
  return "dengo:appearance:v1:"+userId;
}
