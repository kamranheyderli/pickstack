import { file } from "../../engine/code";
import type { Ctx, FrameworkId, Module } from "../../types";

const SCRIPT_EXTS = ["js", "jsx", "ts", "tsx", "mjs", "cjs"];

/** Files ESLint lints: scripts plus the framework's component files. */
const componentExts: Partial<Record<FrameworkId, string[]>> = {
  vue: ["vue"],
  nuxt: ["vue"],
  svelte: ["svelte"],
  sveltekit: ["svelte"],
  astro: ["astro"],
  // angular-eslint also lints templates.
  angular: ["html"],
};

/**
 * lint-staged tasks for the selected tools. Globs must not overlap while tasks write files
 * (they would race), so ESLint + Prettier uses an ordered array for scripts and a negated glob
 * for everything else, as the lint-staged README shows.
 */
function lintStagedConfig(ctx: Ctx): Record<string, string | string[]> {
  if (ctx.has("biome")) {
    return {
      "*": "biome check --write --no-errors-on-unmatched --files-ignore-unknown=true",
    };
  }
  const exts = [
    ...SCRIPT_EXTS,
    ...(componentExts[ctx.selection.framework] ?? []),
  ].join(",");
  const linted = `*.{${exts}}`;
  const eslint = ctx.has("eslint");
  const prettier = ctx.has("prettier");
  if (eslint && prettier) {
    return {
      [linted]: ["eslint --fix", "prettier --write"],
      [`!(${linted})`]: "prettier --ignore-unknown --write",
    };
  }
  if (eslint) return { [linted]: "eslint --fix" };
  return { "*": "prettier --ignore-unknown --write" };
}

/**
 * Git pre-commit hook running the selected linter/formatter on staged files. `prepare: husky`
 * installs the hook on `npm install` once the folder is a git repository (without `.git` it
 * prints a notice and exits 0, so installing a fresh download never fails).
 */
export const huskyLintStaged: Module = {
  id: "husky-lint-staged",
  name: "Husky + lint-staged",
  category: "quality",
  description: {
    az: "Commit-dən əvvəl staged faylları lint və format edən git hook.",
    en: "Git pre-commit hook that lints and formats staged files.",
  },
  frameworks: "all",
  requiresOneOf: ["eslint", "prettier", "biome"],
  order: 90,
  apply(model, ctx) {
    model.pkg.devDependencies.add("husky").add("lint-staged");
    const prepare = model.pkg.scripts["prepare"];
    model.pkg.scripts["prepare"] = prepare ? `${prepare} && husky` : "husky";
    model.pkg.fields["lint-staged"] = lintStagedConfig(ctx);
    model.files.set(".husky/pre-commit", file(["lint-staged"]));
    model.readme.stack.push("Husky", "lint-staged");
    model.readme.sections.push({
      title: "Git hooks",
      body: [
        "The pre-commit hook runs lint-staged on staged files (lint-staged needs Node.js 22.22.1 or newer).",
        "Hooks are installed by `prepare` during install, which needs a git repository: after `git init`, run the install once more.",
      ].join(" "),
    });
  },
};
