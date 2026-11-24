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
  ...frameworkCombos("next", [
    "tailwind",
    "redux-toolkit",
    "axios",
    "prettier",
  ]),
  { framework: "next", language: "ts", modules: ["zustand"] },
  ...frameworkCombos("nuxt", ["tailwind", "pinia", "axios", "prettier"]),
  ...frameworkCombos("astro", ["tailwind", "axios", "prettier"]),
  { framework: "angular", language: "ts", modules: [] },
  {
    framework: "angular",
    language: "ts",
    modules: ["tailwind", "builtin", "axios", "prettier"],
  },
  ...seoCombos(),
];

/** Minimal and "everything" in both languages. */
function frameworkCombos(framework: FrameworkId, all: string[]): Combo[] {
  return (["js", "ts"] as const).flatMap((language) => [
    { framework, language, modules: [] },
    { framework, language, modules: all },
  ]);
}

/** SEO + AIO with Prettier (TS) and SEO alone (JS) for every framework. */
function seoCombos(): Combo[] {
  const all: FrameworkId[] = [
    "react",
    "vue",
    "svelte",
    "solid",
    "preact",
    "next",
    "nuxt",
    "sveltekit",
    "astro",
  ];
  return [
    ...all.flatMap((framework): Combo[] => [
      { framework, language: "ts", modules: ["seo", "aio", "prettier"] },
      { framework, language: "js", modules: ["seo"] },
    ]),
    {
      framework: "angular",
      language: "ts",
      modules: ["seo", "aio", "prettier"],
    },
  ];
}
