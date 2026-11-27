import { createContext, useContext, type ReactNode } from "react";
import az from "./az.json";
import en from "./en.json";
import ru from "./ru.json";

export type Locale = "az" | "en" | "ru";

/**
 * The locale a first visit opens in: the first of the browser's languages that the site speaks
 * (Russian also for Ukrainian, Belarusian and Kazakh browsers), English otherwise. A locale
 * picked with the AZ/EN/RU switch is stored and wins on later visits.
 */
export function browserLocale(
  languages: readonly string[] = typeof navigator === "undefined"
    ? []
    : navigator.languages,
): Locale {
  for (const language of languages) {
    const code = language.toLowerCase().split("-")[0];
    if (code === "az" || code === "en") return code;
    if (code === "ru" || code === "uk" || code === "be" || code === "kk")
      return "ru";
  }
  return "en";
}
export type MessageKey = keyof typeof az;

export const dictionaries: Record<Locale, Record<MessageKey, string>> = {
  az,
  en,
  ru,
};

export function translate(
  locale: Locale,
  key: MessageKey,
  vars: Record<string, string | number> = {},
): string {
  return dictionaries[locale][key].replace(
    /\{(\w+)\}/g,
    (match, name: string) => (name in vars ? String(vars[name]) : match),
  );
}

export type Translate = (
  key: MessageKey,
  vars?: Record<string, string | number>,
) => string;

const LocaleContext = createContext<Locale>("az");

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useT(): Translate {
  const locale = useLocale();
  return (key, vars) => translate(locale, key, vars);
}
