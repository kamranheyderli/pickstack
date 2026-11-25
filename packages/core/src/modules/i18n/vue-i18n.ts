import { file, renderImports } from "../../engine/code";
import type { Module } from "../../types";
import { I18N_WIDGET, locales, messageLines, widgetClasses } from "./shared";

/**
 * Vue I18n in Composition API mode: `src/i18n` creates the instance (installed by the entry)
 * and a `LanguageSwitcher` widget renders a translated greeting with language buttons.
 */
export const vueI18n: Module = {
  id: "vue-i18n",
  name: "Vue I18n",
  category: "i18n",
  description: {
    az: "Vue üçün tərcümələr və dil dəyişmə.",
    en: "Translations and language switching for Vue.",
  },
  frameworks: ["vue"],
  apply(model, ctx) {
    model.pkg.dependencies.add("vue-i18n");
    model.files.set(
      `src/i18n.${ctx.ext.script}`,
      file([
        ...renderImports([{ from: "vue-i18n", named: ["createI18n"] }]),
        "",
        "export default createI18n({",
        "  legacy: false,",
        '  locale: "en",',
        '  fallbackLocale: "en",',
        "  messages: {",
        ...messageLines("    "),
        "  },",
        "});",
      ]),
    );
    model.entry.imports.push({ from: "./i18n", default: "i18n" });
    model.entry.appUses.push("i18n");

    const c = widgetClasses(model);
    model.files.set(
      `src/components/${I18N_WIDGET}.vue`,
      file([
        `<script setup${ctx.isTs ? ' lang="ts"' : ""}>`,
        ...renderImports([{ from: "vue-i18n", named: ["useI18n"] }]),
        "",
        "const { t, locale } = useI18n();",
        "const languages = [",
        ...locales.map((l) => `  { code: "${l.code}", label: "${l.label}" },`),
        "];",
        "</script>",
        "",
        "<template>",
        "  <div>",
        `    <p class="${c.text}">{{ t("greeting") }}</p>`,
        `    <div class="${c.row}">`,
        "      <button",
        '        v-for="{ code, label } in languages"',
        '        :key="code"',
        '        type="button"',
        `        class="${c.btn}"`,
        '        :aria-pressed="locale === code"',
        '        @click="locale = code"',
        "      >",
        "        {{ label }}",
        "      </button>",
        "    </div>",
        "  </div>",
        "</template>",
      ]),
    );
    model.demo.widgets.push(I18N_WIDGET);
    model.readme.stack.push("Vue I18n");
  },
};
