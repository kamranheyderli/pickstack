import type { Module } from "../../types";

/**
 * Sass (Dart Sass, `sass` package): the global stylesheet becomes SCSS. Vite-based frameworks
 * and Next compile it once `sass` is installed; Angular's builder ships Sass itself.
 */
export const sass: Module = {
  id: "sass",
  name: "Sass",
  category: "style",
  description: {
    az: "SCSS: dəyişənlər, iç-içə qaydalar (nesting) və mixin-lər.",
    en: "SCSS stylesheets: variables, nesting and mixins.",
    ru: "Стили на SCSS: переменные, вложенность и миксины.",
  },
  frameworks: "all",
  apply(model, ctx) {
    if (ctx.selection.framework !== "angular") {
      model.pkg.devDependencies.add("sass");
    }
    model.styles.sass = true;
    if (ctx.has("tailwind")) {
      model.warnings.push(
        "Tailwind CSS v4 is not designed to be used with Sass, so the Tailwind stylesheet stays plain CSS. Use Sass for other stylesheets and don't put Tailwind directives (@apply, @theme) in .scss files.",
      );
    }
    model.readme.stack.push("Sass");
  },
};
