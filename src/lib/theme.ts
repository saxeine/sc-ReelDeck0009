export type ThemeKey = "dark" | "paper" | "blueprint" | "neon";

export interface ThemeOption {
  key: ThemeKey;
  label: string;
  hint: string;
  /** Swatches used by the picker: page, surface, line, accent, ink */
  swatch: { bg: string; panel: string; line: string; accent: string; ink: string };
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    key: "dark",
    label: "Darkroom",
    hint: "Warm ink + amber — the default",
    swatch: { bg: "#0d0b0a", panel: "#1a1614", line: "#3a2f28", accent: "#ffab1f", ink: "#f4ece0" },
  },
  {
    key: "paper",
    label: "Paper",
    hint: "Daylight studio, light surfaces",
    swatch: { bg: "#f4ede2", panel: "#fdfaf3", line: "#cdbca6", accent: "#b45309", ink: "#1a1512" },
  },
  {
    key: "blueprint",
    label: "Blueprint",
    hint: "Cold navy + cyan, plan-room feel",
    swatch: { bg: "#051a26", panel: "#0a2b40", line: "#1a4f68", accent: "#22d3ee", ink: "#e7f6ff" },
  },
  {
    key: "neon",
    label: "Neon lab",
    hint: "Midnight violet + hot pink",
    swatch: { bg: "#0c0416", panel: "#190b2d", line: "#3a2060", accent: "#ff3d9a", ink: "#ffe9f8" },
  },
];

export const DEFAULT_THEME: ThemeKey = "dark";
export const THEME_STORAGE_KEY = "reeldeck.theme.v1";

export function isThemeKey(value: unknown): value is ThemeKey {
  return THEME_OPTIONS.some((t) => t.key === value);
}

export function themeOption(key: ThemeKey): ThemeOption {
  return THEME_OPTIONS.find((t) => t.key === key) ?? THEME_OPTIONS[0];
}

/** Applies a theme to the document root. Safe to call repeatedly. */
export function applyTheme(key: ThemeKey): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = key;
  root.style.colorScheme = key === "paper" ? "light" : "dark";
}

export function loadTheme(): ThemeKey {
  if (typeof localStorage === "undefined") return DEFAULT_THEME;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeKey(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveTheme(key: ThemeKey): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, key);
  } catch {
    /* storage unavailable — theme still applies for this session */
  }
}
