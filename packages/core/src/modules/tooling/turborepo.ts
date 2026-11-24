import type { FrameworkId, Module } from "../../types";

/** What `turbo run build` caches per framework (verified by deleting and restoring). */
const outputs: Record<FrameworkId, string[]> = {
  react: ["dist/**"],
  vue: ["dist/**"],
  svelte: ["dist/**"],
  solid: ["dist/**"],
  preact: ["dist/**"],
  next: [".next/**", "!.next/cache/**", "!.next/dev/**"],
  nuxt: [".output/**"],
  sveltekit: ["build/**", ".svelte-kit/**"],
  astro: ["dist/**"],
  angular: ["dist/**"],
};

/**
 * Turborepo workspace with the app in `apps/web`, as `create-turbo` lays it out (without the
 * example's shared packages, which a single app does not need; `packages/*` stays in the
 * workspace globs for later).
 */
export const turborepo: Module = {
  id: "turborepo",
  name: "Turborepo",
  category: "tooling",
  description: {
    az: "Monorepo: tətbiq apps/web-də, turbo ilə keşlənən tapşırıqlar.",
    en: "Monorepo: the app in apps/web, tasks cached by turbo.",
  },
  frameworks: "all",
  // Husky must install hooks from the git root, while lint-staged runs the app's tools.
  conflicts: ["husky-lint-staged"],
  apply(model, ctx) {
    const framework = ctx.selection.framework;
    model.monorepo = {
      outputs: outputs[framework],
      typecheckAfterBuild: framework === "next" || framework === "sveltekit",
      // Astro's config and SvelteKit's env schema read SITE_URL without a public prefix.
      buildEnv:
        ctx.has("seo") && (framework === "astro" || framework === "sveltekit")
          ? ["SITE_URL"]
          : [],
      apps: {},
      preview: false,
    };
    model.readme.stack.push("Turborepo");
  },
};
