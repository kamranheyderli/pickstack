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
  ...eslintCombos(),
  ...testingCombos(),
  ...biomeCombos(),
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

/** ESLint + Prettier (TS) and ESLint alone (JS) for every framework. */
function eslintCombos(): Combo[] {
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
      { framework, language: "ts", modules: ["eslint", "prettier"] },
      { framework, language: "js", modules: ["eslint"] },
    ]),
    {
      framework: "angular",
      language: "ts",
      modules: ["eslint", "prettier"],
    },
  ];
}

/**
 * Vitest with the framework's own mount API and with Testing Library, each with a state
 * module so the counter test needs its store (provider or plugin) where one exists.
 */
function testingCombos(): Combo[] {
  const stateFor: Partial<Record<FrameworkId, string>> = {
    react: "redux-toolkit",
    next: "redux-toolkit",
    vue: "pinia",
    nuxt: "pinia",
    svelte: "builtin",
    sveltekit: "builtin",
    solid: "builtin",
    angular: "builtin",
  };
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
    "angular",
  ];
  const noLibrary: FrameworkId[] = ["sveltekit", "astro"];
  return all.flatMap((framework): Combo[] => {
    const state = stateFor[framework];
    const withState = state ? [state] : [];
    const library = !noLibrary.includes(framework);
    const js = framework !== "angular";
    return [
      {
        framework,
        language: "ts",
        modules: ["vitest", "eslint", "prettier", ...withState],
      },
      ...(library
        ? [
            {
              framework,
              language: "ts" as const,
              modules: [
                "vitest",
                "testing-library",
                "eslint",
                "tailwind",
                ...withState,
              ],
            },
          ]
        : []),
      ...(js
        ? [
            {
              framework,
              language: "js" as const,
              modules: ["vitest", "eslint"],
            },
          ]
        : []),
      ...(js && library
        ? [
            {
              framework,
              language: "js" as const,
              modules: ["vitest", "testing-library"],
            },
          ]
        : []),
    ];
  });
}

/**
 * Biome alone, and with the modules that add files it must accept as formatted: Tailwind
 * (CSS directives), Vitest tests, a state store, SEO head tags.
 */
function biomeCombos(): Combo[] {
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
    "angular",
  ];
  const extra: Partial<Record<FrameworkId, string[]>> = {
    react: ["redux-toolkit", "react-router", "axios"],
    vue: ["pinia", "vue-router", "axios"],
    svelte: ["builtin", "axios"],
    solid: ["builtin", "solid-router"],
    preact: ["preact-iso"],
    next: ["zustand"],
    nuxt: ["pinia", "axios"],
    sveltekit: ["builtin"],
    astro: ["axios"],
    angular: ["builtin", "axios"],
  };
  return all.flatMap((framework): Combo[] => [
    {
      framework,
      language: "ts",
      modules: [
        "biome",
        "tailwind",
        "vitest",
        "seo",
        ...(extra[framework] ?? []),
      ],
    },
    ...(framework === "angular"
      ? []
      : [{ framework, language: "js" as const, modules: ["biome"] }]),
  ]);
}
