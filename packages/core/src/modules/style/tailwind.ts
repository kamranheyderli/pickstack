import type { Module } from "../../types";

export const tailwind: Module = {
  id: "tailwind",
  name: "Tailwind CSS",
  category: "style",
  description: {
    az: "Utility-first CSS; Vite plugini ilə qurulur.",
    en: "Utility-first CSS, wired through the Vite plugin.",
  },
  frameworks: ["react", "vue", "svelte", "solid", "preact", "sveltekit"],
  conflicts: ["unocss"],
  apply(model) {
    model.pkg.devDependencies.add("tailwindcss");
    model.pkg.devDependencies.add("@tailwindcss/vite");
    model.bundler.plugins.push({
      import: { from: "@tailwindcss/vite", default: "tailwindcss" },
      call: "tailwindcss()",
    });
    model.styles.globalImports.push('@import "tailwindcss";');
    model.styles.mode = "tailwind";
    model.readme.stack.push("Tailwind CSS");
  },
};
