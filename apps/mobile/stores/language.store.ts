import { create } from "zustand";
import { MMKV } from "react-native-mmkv";
import { setLocale, getLocale, isRTL, SupportedLocale } from "../utils/i18n";

const storage = new MMKV({ id: "lumis-settings" });
const LOCALE_KEY = "app_locale";

// Restore persisted locale on startup
const persistedLocale = storage.getString(LOCALE_KEY) as SupportedLocale | undefined;
if (persistedLocale) setLocale(persistedLocale);

interface LanguageState {
  locale: SupportedLocale;
  isRTL: boolean;
  setLanguage: (locale: SupportedLocale) => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  locale: getLocale(),
  isRTL: isRTL(),

  setLanguage: (locale) => {
    setLocale(locale);
    storage.set(LOCALE_KEY, locale);
    set({ locale, isRTL: isRTL() });
  },
}));
