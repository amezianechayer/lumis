import { useLanguageStore } from "../stores/language.store";
import { t as translate, SupportedLocale } from "../utils/i18n";

/**
 * Reactive translation hook. Reading `locale` from the language store subscribes
 * the component, so it re-renders whenever the user switches language — making
 * `t()` calls update live (the bare `t` import from utils/i18n is NOT reactive).
 *
 * Usage:
 *   const { t } = useTranslation();
 *   <Text>{t("home.greeting")}</Text>
 */
export function useTranslation(): {
  t: (scope: string, options?: Record<string, unknown>) => string;
  locale: SupportedLocale;
} {
  const locale = useLanguageStore((s) => s.locale);
  return {
    // locale is referenced so the call is re-evaluated on language change
    t: (scope, options) => translate(scope, { locale, ...options }),
    locale,
  };
}
