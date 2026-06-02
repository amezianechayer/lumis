import { create } from "zustand";
import { MMKV } from "react-native-mmkv";
import { colorScheme } from "nativewind";
import { lightColors, darkColors, ThemeColors } from "../constants/theme";

const storage = new MMKV({ id: "lumis-settings" });
const THEME_KEY = "app_theme_mode";

export type ThemeMode = "light" | "dark";

// Restore persisted mode (default: light)
const persisted = storage.getString(THEME_KEY) as ThemeMode | undefined;
const initialMode: ThemeMode = persisted === "dark" ? "dark" : "light";

// Apply to NativeWind on startup so `dark:` variants + class tokens flip
colorScheme.set(initialMode);

interface ThemeState {
  mode: ThemeMode;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: initialMode,
  colors: initialMode === "dark" ? darkColors : lightColors,

  setMode: (mode) => {
    storage.set(THEME_KEY, mode);
    colorScheme.set(mode);
    set({ mode, colors: mode === "dark" ? darkColors : lightColors });
  },

  toggle: () => {
    const next: ThemeMode = get().mode === "dark" ? "light" : "dark";
    get().setMode(next);
  },
}));

// Convenience hook: returns the active palette and re-renders on change.
export function useThemeColors(): ThemeColors {
  return useThemeStore((s) => s.colors);
}
