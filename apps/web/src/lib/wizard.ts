import type { FrameworkId, Selection } from "@stackforge/core";
import { pruneIncompatible } from "../state/selection";

export type Goal = "content" | "app" | "fullstack";
export type Preference = "any" | "react" | "vue" | "angular" | "svelte";
export type Extra = "forms" | "tests" | "i18n" | "ai";

export const goals: readonly Goal[] = ["content", "app", "fullstack"];
export const preferences: readonly Preference[] = [
  "any",
  "react",
  "vue",
  "angular",
  "svelte",
];
export const extras: readonly Extra[] = ["forms", "tests", "i18n", "ai"];

export interface Answers {
  goal: Goal;
  preference: Preference;
  extras: readonly Extra[];
}

export interface Recommendation {
  selection: Selection;
  /** Asked-for extras this framework has no module for (i18n outside React and Vue, forms on
   * meta-frameworks). */
  unavailable: Extra[];
}

/**
 * Content sites want static HTML and SEO, so they get a meta-framework (Astro when any will
 * do). Apps get the framework itself, except Svelte, whose routing comes with SvelteKit.
 * Full-stack projects are single-page apps with an API in server/, a database and sign-in,
 * which only that layout supports.
 */
const frameworkFor: Record<Goal, Record<Preference, FrameworkId>> = {
  content: {
    any: "astro",
    react: "next",
    vue: "nuxt",
    svelte: "sveltekit",
    angular: "angular",
  },
  app: {
    any: "react",
    react: "react",
    vue: "vue",
    svelte: "sveltekit",
    angular: "angular",
  },
  fullstack: {
    any: "react",
    react: "react",
    vue: "vue",
    svelte: "svelte",
    angular: "angular",
  },
};

/** The UI kit, store and router each framework's app gets; missing ones are skipped. */
const appModules: Partial<Record<FrameworkId, string[]>> = {
  react: ["shadcn", "zustand", "react-router", "tanstack-query"],
  vue: ["shadcn-vue", "pinia", "vue-router", "tanstack-query"],
  svelte: ["shadcn-svelte", "builtin", "tanstack-query"],
  sveltekit: ["shadcn-svelte", "builtin"],
  angular: ["angular-material", "builtin", "tanstack-query"],
};

const extraModules = (extra: Extra, framework: FrameworkId): string[] => {
  switch (extra) {
    case "forms":
      return [
        framework === "react" ? "react-hook-form" : "tanstack-form",
        "zod",
      ];
    case "tests":
      return ["vitest", "testing-library"];
    case "i18n":
      return framework === "react"
        ? ["react-i18next"]
        : framework === "vue"
          ? ["vue-i18n"]
          : [];
    case "ai":
      return ["agents-md", "claude-code"];
  }
};

export function recommend(answers: Answers, base: Selection): Recommendation {
  const framework = frameworkFor[answers.goal][answers.preference];
  const picked = ["tailwind"];
  if (answers.goal === "content") picked.push("seo", "aio");
  else picked.push(...(appModules[framework] ?? []));
  if (answers.goal === "fullstack")
    picked.push(
      framework === "angular" ? "nestjs" : "express",
      "drizzle",
      "better-auth",
    );
  for (const extra of answers.extras)
    picked.push(...extraModules(extra, framework));
  picked.push("eslint", "prettier");
  const { selection } = pruneIncompatible({
    ...base,
    framework,
    language: "ts",
    modules: [...new Set(picked)],
  });
  const unavailable = answers.extras.filter(
    (extra) =>
      !extraModules(extra, framework).some((id) =>
        selection.modules.includes(id),
      ),
  );
  return { selection, unavailable };
}
