import { I18n } from "i18n-js";
import { getLocales } from "expo-localization";
import fr from "../locales/fr";
import en from "../locales/en";
import ar from "../locales/ar";

export type SupportedLocale = "fr" | "en" | "ar";

export const SUPPORTED_LOCALES: { code: SupportedLocale; label: string; flag: string; rtl: boolean }[] = [
  { code: "fr", label: "Français", flag: "🇫🇷", rtl: false },
  { code: "en", label: "English", flag: "🇬🇧", rtl: false },
  { code: "ar", label: "العربية", flag: "🇦🇪", rtl: true },
];

const i18n = new I18n({ fr, en, ar });

// Detect device locale, fall back to "fr"
const deviceLocale = getLocales()[0]?.languageCode ?? "fr";
i18n.locale = SUPPORTED_LOCALES.some((l) => l.code === deviceLocale)
  ? (deviceLocale as SupportedLocale)
  : "fr";
i18n.enableFallback = true;
i18n.defaultLocale = "fr";

export function t(scope: string, options?: Record<string, unknown>): string {
  return i18n.t(scope, options);
}

export function setLocale(locale: SupportedLocale) {
  i18n.locale = locale;
}

export function getLocale(): SupportedLocale {
  return i18n.locale as SupportedLocale;
}

export function isRTL(): boolean {
  return SUPPORTED_LOCALES.find((l) => l.code === i18n.locale)?.rtl ?? false;
}

export default i18n;
