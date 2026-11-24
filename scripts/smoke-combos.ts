import type { FrameworkId, Language } from "../packages/core/src";

export interface Combo {
  framework: FrameworkId;
  language: Language;
  modules: string[];
}

/**
 * Curated set for `pnpm smoke --quick` (runs on PRs).
 * Every module must appear in at least one combo here.
 */
export const quickCombos: Combo[] = [
  { framework: "react", language: "js", modules: [] },
  { framework: "react", language: "ts", modules: [] },
  {
    framework: "react",
    language: "ts",
    modules: ["tailwind", "redux-toolkit", "react-router", "axios", "prettier"],
  },
  {
    framework: "react",
    language: "js",
    modules: ["tailwind", "redux-toolkit", "react-router", "axios", "prettier"],
  },
  { framework: "react", language: "ts", modules: ["zustand", "prettier"] },
  { framework: "react", language: "js", modules: ["zustand", "react-router"] },
  { framework: "vue", language: "js", modules: [] },
  { framework: "vue", language: "ts", modules: [] },
  {
    framework: "vue",
    language: "ts",
    modules: ["tailwind", "pinia", "vue-router", "axios", "prettier"],
  },
  {
    framework: "vue",
    language: "js",
    modules: ["tailwind", "pinia", "vue-router", "axios", "prettier"],
  },
  { framework: "vue", language: "ts", modules: ["vue-router", "prettier"] },
  ...frameworkCombos("svelte", ["tailwind", "builtin", "axios", "prettier"]),
  ...frameworkCombos("sveltekit", ["tailwind", "builtin", "axios", "prettier"]),
  ...frameworkCombos("solid", [
    "tailwind",
    "builtin",
    "solid-router",
    "axios",
    "prettier",
  ]),
  ...frameworkCombos("preact", ["tailwind", "preact-iso", "axios", "prettier"]),
];

/** Minimal and "everything" in both languages. */
function frameworkCombos(framework: FrameworkId, all: string[]): Combo[] {
  return (["js", "ts"] as const).flatMap((language) => [
    { framework, language, modules: [] },
    { framework, language, modules: all },
  ]);
}
