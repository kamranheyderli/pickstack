import { file, json } from "../../engine/code";
import type { Module } from "../../types";

/**
 * Tailwind CSS v4. Vite-based frameworks (incl. Nuxt and Astro) use `@tailwindcss/vite`;
 * Next.js and Angular build with their own pipelines and use `@tailwindcss/postcss`.
 */
export const tailwind: Module = {
  id: "tailwind",
  name: "Tailwind CSS",
  category: "style",
  description: {
    az: "Utility-first CSS (v4).",
    en: "Utility-first CSS (v4).",
  },
  frameworks: "all",
  conflicts: ["unocss"],
  apply(model, ctx) {
    model.pkg.devDependencies.add("tailwindcss");
    switch (ctx.selection.framework) {
      case "next":
        model.pkg.devDependencies.add("@tailwindcss/postcss").add("postcss");
        model.files.set(
          "postcss.config.mjs",
          file([
            "const config = {",
            "  plugins: {",
            '    "@tailwindcss/postcss": {},',
            "  },",
            "};",
            "",
            "export default config;",
          ]),
        );
        break;
      case "angular":
        model.pkg.devDependencies.add("@tailwindcss/postcss").add("postcss");
        model.files.set(
          ".postcssrc.json",
          json({ plugins: { "@tailwindcss/postcss": {} } }),
        );
        break;
      default:
        model.pkg.devDependencies.add("@tailwindcss/vite");
        model.bundler.plugins.push({
          import: { from: "@tailwindcss/vite", default: "tailwindcss" },
          call: "tailwindcss()",
        });
    }
    model.styles.globalImports.push('@import "tailwindcss";');
    model.styles.mode = "tailwind";
    model.readme.stack.push("Tailwind CSS");
  },
};
