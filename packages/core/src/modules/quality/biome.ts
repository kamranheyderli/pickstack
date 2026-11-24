import { json } from "../../engine/code";
import { knownGoodVersion } from "../../versions/known-good";
import type { Ctx, Module } from "../../types";

/**
 * `biome init`'s config with Prettier-compatible indentation (spaces) and the `.gitignore`
 * honoured. Vue, Svelte and Astro files need Biome's full HTML support (still experimental in
 * 2.x) to be formatted and to see template usages; Angular templates are not supported, so
 * Angular keeps the HTML formatter off.
 */
function biomeConfig(ctx: Ctx): Record<string, unknown> {
  const framework = ctx.selection.framework;
  const version = knownGoodVersion("@biomejs/biome", framework);
  const sfc = ["vue", "nuxt", "svelte", "sveltekit", "astro"].includes(
    framework,
  );
  // Matches prettier-plugin-svelte/astro, which indent <script> and <style> contents.
  const indentScripts = ["svelte", "sveltekit", "astro"].includes(framework);
  return {
    $schema: `https://biomejs.dev/schemas/${version}/schema.json`,
    vcs: { enabled: true, clientKind: "git", useIgnoreFile: true },
    files: { ignoreUnknown: false },
    formatter: { enabled: true, indentStyle: "space" },
    linter: { enabled: true, rules: { preset: "recommended" } },
    javascript: { formatter: { quoteStyle: "double" } },
    ...(ctx.has("tailwind")
      ? { css: { parser: { tailwindDirectives: true } } }
      : {}),
    ...(sfc
      ? {
          html: {
            experimentalFullSupportEnabled: true,
            formatter: {
              enabled: true,
              selfCloseVoidElements: "always",
              ...(indentScripts ? { indentScriptAndStyle: true } : {}),
            },
          },
        }
      : {}),
    assist: {
      enabled: true,
      actions: { source: { organizeImports: "on" } },
    },
    ...(framework === "angular"
      ? {
          overrides: [
            {
              // `<a routerLink>` has no href, which the rule cannot see through.
              includes: ["**/*.html"],
              linter: { rules: { a11y: { useValidAnchor: "off" } } },
            },
          ],
        }
      : {}),
  };
}

export const biome: Module = {
  id: "biome",
  name: "Biome",
  category: "quality",
  description: {
    az: "Linter və formatlayıcı bir alətdə (ESLint + Prettier əvəzi).",
    en: "Linter and formatter in one tool (replaces ESLint + Prettier).",
  },
  frameworks: "all",
  conflicts: ["eslint", "prettier"],
  apply(model, ctx) {
    model.pkg.devDependencies.add("@biomejs/biome");
    model.pkg.scripts["lint"] = "biome lint";
    model.pkg.scripts["format"] = "biome format --write";
    model.pkg.scripts["format:check"] = "biome format";
    model.pkg.scripts["check"] = "biome check";
    model.files.set("biome.json", json(biomeConfig(ctx)));
    model.linter = "biome";
    model.formatter = "biome";
    model.readme.stack.push("Biome");
  },
};
