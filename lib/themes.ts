/**
 * Dengo: seis identidades visuais diferentes, mantendo o mesmo design system.
 * O tema é individual; não é salvo nas preferências compartilhadas do casal.
 */
export const THEMES = [
  {
    id: "original",
    name: "Dengo Original",
    note: "Rosé queimado, off-white e aconchego.",
    mood: "Clássico",
    background: "#F9F7F4",
    surface: "#FFFDFB",
    accent: "#A65364",
    actionText: "#FFFFFF",
    ink: "#353B37",
    muted: "#747973",
    soft: "#F7EDEF",
    dark: false,
  },
  {
    id: "noite",
    name: "Noite a Dois",
    note: "Grafite profundo e fúcsia luminoso.",
    mood: "Noturno",
    background: "#0C0E15",
    surface: "#191A25",
    accent: "#F753A2",
    actionText: "#160A17",
    ink: "#F7EDF4",
    muted: "#B7ACBC",
    soft: "#382134",
    dark: true,
  },
  {
    id: "lavanda",
    name: "Lavanda",
    note: "Roxo vibrante e branco cristalino.",
    mood: "Expressivo",
    background: "#EEE8FB",
    surface: "#FFFEFF",
    accent: "#6636C9",
    actionText: "#FFFFFF",
    ink: "#2E2149",
    muted: "#706585",
    soft: "#DFD1FC",
    dark: false,
  },
  {
    id: "salvia",
    name: "Jardim da Sálvia",
    note: "Verde-floresta e lima fresca.",
    mood: "Botânico",
    background: "#0E261D",
    surface: "#19392C",
    accent: "#ACE76E",
    actionText: "#112515",
    ink: "#F1F6E8",
    muted: "#B4C6AF",
    soft: "#304E33",
    dark: true,
  },
  {
    id: "inverno",
    name: "Céu de Inverno",
    note: "Azul-cobalto, gelo e contraste limpo.",
    mood: "Moderno",
    background: "#E8F2FD",
    surface: "#FFFFFF",
    accent: "#185DCE",
    actionText: "#FFFFFF",
    ink: "#182D4E",
    muted: "#536982",
    soft: "#CEDFFF",
    dark: false,
  },
  {
    id: "ouro",
    name: "Preto & Ouro",
    note: "Preto absoluto e dourado acetinado.",
    mood: "Luxuoso",
    background: "#0B0B0C",
    surface: "#19191B",
    accent: "#E1B455",
    actionText: "#1B1408",
    ink: "#F8F1E0",
    muted: "#BFB49C",
    soft: "#40331D",
    dark: true,
  },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export const DEFAULT_THEME: ThemeId = "original";
export const THEME_STORAGE_PREFIX = "dengo.theme.v1";

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEMES.some((t) => t.id === value);
}

export function normalizeTheme(value: unknown): ThemeId {
  return isThemeId(value) ? value : DEFAULT_THEME;
}

export function themeById(id: ThemeId) {
  return THEMES.find((item) => item.id === id)!;
}

/** Escopo da conta, não do espaço compartilhado. */
export function themeStorageKey(userId?: string | null): string {
  return THEME_STORAGE_PREFIX + ":" + (userId || "demo");
}

/** Usado na prévia e na aplicação para manter o Safari e os componentes alinhados. */
export function applyDocumentTheme(id: ThemeId): void {
  if (typeof document === "undefined") return;
  const theme = themeById(id);
  document.documentElement.dataset.dengoTheme = theme.id;
  document.documentElement.dataset.dengoDark = String(theme.dark);
  document.documentElement.style.colorScheme = theme.dark ? "dark" : "light";
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  meta?.setAttribute("content", theme.background);
}
