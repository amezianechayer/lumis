// Lumis design tokens — light (default) + dark themes.

export interface ThemeColors {
  bg: string;
  bgCard: string;
  border: string;
  borderLight: string;
  primary: string;
  primaryMuted: string;
  text: string;
  textMuted: string;
  textFaint: string;
  success: string;
  danger: string;
  // Logo background
  logoBg: string;
}

export const lightColors: ThemeColors = {
  bg:           "#EDE4D4",
  bgCard:       "rgba(255,255,255,0.65)",
  border:       "rgba(201,130,107,0.22)",
  borderLight:  "rgba(201,130,107,0.1)",
  primary:      "#C9826B",
  primaryMuted: "rgba(201,130,107,0.12)",
  text:         "#2C1810",
  textMuted:    "rgba(44,24,16,0.5)",
  textFaint:    "rgba(44,24,16,0.3)",
  success:      "#5DCAA5",
  danger:       "#F09595",
  logoBg:       "#EDE4D4",
};

export const darkColors: ThemeColors = {
  bg:           "#0D0D0F",
  bgCard:       "rgba(255,255,255,0.04)",
  border:       "rgba(201,130,107,0.18)",
  borderLight:  "rgba(232,213,192,0.08)",
  primary:      "#C9826B",
  primaryMuted: "rgba(201,130,107,0.15)",
  text:         "#E8D5C0",
  textMuted:    "rgba(232,213,192,0.45)",
  textFaint:    "rgba(232,213,192,0.2)",
  success:      "#5DCAA5",
  danger:       "#F09595",
  logoBg:       "#0D0D0F",
};

// Backward-compatible default export (light)
export const colors = lightColors;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  full: 9999,
};
