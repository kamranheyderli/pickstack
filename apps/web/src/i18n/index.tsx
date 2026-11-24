import { createContext, useContext, type ReactNode } from "react";
import az from "./az.json";
import en from "./en.json";

export type Locale = "az" | "en";
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
