import { demoClasses } from "../../frameworks/shared/demo";
import type { ProjectModel } from "../../types";

/** The demo widget: a translated greeting and buttons to switch the language. */
export const I18N_WIDGET = "LanguageSwitcher";

export const locales = [
  { code: "en", label: "English", greeting: "Hello! Pick a language." },
  { code: "es", label: "Español", greeting: "¡Hola! Elige un idioma." },
] as const;

/**
 * One `en: { greeting: "…" },` line per locale, indented by `pad`; `namespace` nests the
 * messages one level deeper (i18next's `translation`).
 */
export function messageLines(pad: string, namespace?: string): string[] {
  return locales.map(({ code, greeting }) => {
    const messages = `{ greeting: "${greeting}" }`;
    return `${pad}${code}: ${namespace ? `{ ${namespace}: ${messages} }` : messages},`;
  });
}

export function widgetClasses(model: ProjectModel) {
  const demo = demoClasses(model);
  return { text: demo.text, row: demo.row, btn: demo.btn };
}
