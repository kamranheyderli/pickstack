import { file, renderImports } from "../../engine/code";
import type { Module } from "../../types";
import { I18N_WIDGET, locales, messageLines, widgetClasses } from "./shared";

/**
 * i18next with react-i18next: `src/i18n` sets up the translations (imported once by the entry)
 * and a `LanguageSwitcher` widget renders a translated greeting with language buttons.
 */
export const reactI18next: Module = {
  id: "react-i18next",
  name: "react-i18next",
  category: "i18n",
  description: {
    az: "i18next ilə tərcümələr və dil dəyişdirmə.",
    en: "Translations and language switching with i18next.",
  },
  frameworks: ["react"],
  apply(model, ctx) {
    model.pkg.dependencies.add("i18next").add("react-i18next");
    model.files.set(
      `src/i18n.${ctx.ext.script}`,
      file([
        ...renderImports([
          { from: "i18next", default: "i18n" },
          { from: "react-i18next", named: ["initReactI18next"] },
        ]),
        "",
        "const resources = {",
        ...messageLines("  ", "translation"),
        "};",
        "",
        "void i18n.use(initReactI18next).init({",
        "  resources,",
        '  lng: "en",',
        '  fallbackLng: "en",',
        "  // React already escapes rendered values.",
        "  interpolation: { escapeValue: false },",
        "});",
        "",
        "export default i18n;",
      ]),
    );
    model.entry.imports.push({ from: "./i18n" });

    const c = widgetClasses(model);
    model.files.set(
      `src/components/${I18N_WIDGET}.${ctx.ext.component}`,
      file([
        ...renderImports([
          { from: "react-i18next", named: ["useTranslation"] },
        ]),
        "",
        "const languages = [",
        ...locales.map((l) => `  { code: "${l.code}", label: "${l.label}" },`),
        "];",
        "",
        `export default function ${I18N_WIDGET}() {`,
        "  const { t, i18n } = useTranslation();",
        "",
        "  return (",
        "    <div>",
        `      <p className="${c.text}">{t("greeting")}</p>`,
        `      <div className="${c.row}">`,
        "        {languages.map(({ code, label }) => (",
        "          <button",
        "            key={code}",
        '            type="button"',
        `            className="${c.btn}"`,
        "            aria-pressed={i18n.resolvedLanguage === code}",
        "            onClick={() => void i18n.changeLanguage(code)}",
        "          >",
        "            {label}",
        "          </button>",
        "        ))}",
        "      </div>",
        "    </div>",
        "  );",
        "}",
      ]),
    );
    model.demo.widgets.push(I18N_WIDGET);
    model.readme.stack.push("i18next");
  },
};
