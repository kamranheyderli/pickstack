import { file, json } from "../../engine/code";
import type { FrameworkId, Module } from "../../types";

interface PrettierSetup {
  plugin?: string;
  overrides: { files: string; options: { parser: string } }[];
}

/** Framework-specific Prettier needs: plugins for custom file types, parser overrides. */
const setups: Partial<Record<FrameworkId, PrettierSetup>> = {
  svelte: {
    plugin: "prettier-plugin-svelte",
    overrides: [{ files: "*.svelte", options: { parser: "svelte" } }],
  },
  sveltekit: {
    plugin: "prettier-plugin-svelte",
    overrides: [{ files: "*.svelte", options: { parser: "svelte" } }],
  },
  astro: {
    plugin: "prettier-plugin-astro",
    overrides: [{ files: "*.astro", options: { parser: "astro" } }],
  },
  angular: {
    overrides: [{ files: "*.html", options: { parser: "angular" } }],
  },
};

export const prettier: Module = {
  id: "prettier",
  name: "Prettier",
  category: "quality",
  description: {
    az: "Vahid üslublu kod formatlayıcısı.",
    en: "Opinionated code formatter.",
    ru: "Форматтер кода с готовыми правилами.",
  },
  frameworks: "all",
  conflicts: ["biome"],
  apply(model, ctx) {
    const setup = setups[ctx.selection.framework];
    model.pkg.devDependencies.add("prettier");
    model.formatter = "prettier";
    if (setup?.plugin) model.pkg.devDependencies.add(setup.plugin);
    model.pkg.scripts["format"] = "prettier --write .";
    model.pkg.scripts["format:check"] = "prettier --check .";
    model.files.set(
      ".prettierrc",
      json(
        setup
          ? {
              ...(setup.plugin ? { plugins: [setup.plugin] } : {}),
              overrides: setup.overrides,
            }
          : {},
      ),
    );
    model.files.set(
      ".prettierignore",
      file([
        "dist",
        ...ctx.ignore,
        ...model.verbatim,
        "pnpm-lock.yaml",
        "package-lock.json",
        "yarn.lock",
        "bun.lock",
      ]),
    );
    model.readme.stack.push("Prettier");
  },
};
