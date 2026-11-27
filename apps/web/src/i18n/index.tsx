import { createContext, useContext, type ReactNode } from "react";
import az from "./az.json";
import en from "./en.json";

export type Locale = "az" | "en";

/**
 * The locale a first visit opens in: Azerbaijani for browsers that list it, English for
 * everyone else. A locale picked with the AZ/EN switch is stored and wins on later visits.
 */
export function browserLocale(
  languages: readonly string[] = typeof navigator === "undefined"
    ? []
    : navigator.languages,
): Locale {
  return languages.some((l) => l.toLowerCase().startsWith("az")) ? "az" : "en";
}
export type MessageKey = keyof typeof az;

export const dictionaries: Record<Locale, Record<MessageKey, string>> = {
  az,
  en,
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
