import { presets, type FrameworkId, type Language } from "../packages/core/src";

export interface Combo {
  framework: FrameworkId;
  language: Language;
  modules: string[];
}

/** Every ready-made stack from the web app and `--preset`. */
export const presetCombos: Combo[] = presets.map((p) => ({
  framework: p.framework,
  language: "ts",
  modules: p.modules,
}));

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
  ...huskyCombos(),
  ...sassCombos(),
  ...turborepoCombos(),
  ...federationCombos(),
  ...uiCombos(),
  ...aiCombos(),
  ...tanstackCombos(),
  ...projectFileCombos(),
  ...deployCombos(),
  ...formCombos(),
  ...pwaCombos(),
  ...playwrightCombos(),
  ...i18nCombos(),
  ...storybookCombos(),
  ...backendCombos(),
  ...presetCombos,
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

/** Husky + lint-staged with each tool combination its config branches on. */
function huskyCombos(): Combo[] {
  return [
    {
      framework: "react",
      language: "ts",
      modules: ["husky-lint-staged", "eslint", "prettier"],
    },
    {
      framework: "vue",
      language: "js",
      modules: ["husky-lint-staged", "eslint"],
    },
    {
      framework: "svelte",
      language: "ts",
      modules: ["husky-lint-staged", "prettier"],
    },
    {
      framework: "sveltekit",
      language: "ts",
      modules: ["husky-lint-staged", "eslint", "prettier"],
    },
    {
      framework: "astro",
      language: "ts",
      modules: ["husky-lint-staged", "biome"],
    },
    {
      framework: "angular",
      language: "ts",
      modules: ["husky-lint-staged", "eslint", "prettier"],
    },
  ];
}

/** Sass alone (SCSS global stylesheet) and with Tailwind (CSS entry kept, Sass installed). */
function sassCombos(): Combo[] {
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
  return all.flatMap((framework): Combo[] => [
    { framework, language: "ts", modules: ["sass", "prettier"] },
    ...(framework === "angular"
      ? [{ framework, language: "ts" as const, modules: ["sass", "biome"] }]
      : [
          { framework, language: "js" as const, modules: ["sass", "biome"] },
          { framework, language: "js" as const, modules: ["sass", "tailwind"] },
        ]),
  ]);
}

/**
 * Turborepo around every framework: root scripts run the app's build, typecheck, lint and
 * test through turbo (SEO adds a build-time env var for Astro and SvelteKit).
 */
function turborepoCombos(): Combo[] {
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
  return [
    ...all.map((framework): Combo => ({
      framework,
      language: "ts",
      modules: ["turborepo", "eslint", "vitest", "seo"],
    })),
    { framework: "react", language: "js", modules: ["turborepo"] },
  ];
}

/** Module Federation host + remote (two projects) in both languages, with host tooling. */
function federationCombos(): Combo[] {
  return [
    {
      framework: "react",
      language: "ts",
      modules: ["module-federation", "eslint", "prettier", "vitest"],
    },
    {
      framework: "react",
      language: "ts",
      modules: [
        "module-federation",
        "tailwind",
        "react-router",
        "redux-toolkit",
        "husky-lint-staged",
        "biome",
      ],
    },
    { framework: "react", language: "js", modules: ["module-federation"] },
  ];
}

/** UI kits with the modules that change their counter (state) or lint their files. */
function uiCombos(): Combo[] {
  return [
    {
      framework: "svelte",
      language: "ts",
      modules: [
        "shadcn-svelte",
        "tailwind",
        "builtin",
        "eslint",
        "prettier",
        "vitest",
      ],
    },
    {
      framework: "svelte",
      language: "js",
      modules: ["shadcn-svelte", "tailwind", "eslint", "prettier"],
    },
    {
      framework: "sveltekit",
      language: "ts",
      modules: ["shadcn-svelte", "tailwind", "eslint", "prettier", "vitest"],
    },
    {
      framework: "sveltekit",
      language: "js",
      modules: ["shadcn-svelte", "tailwind", "biome"],
    },
    {
      framework: "svelte",
      language: "ts",
      modules: ["shadcn-svelte", "tailwind", "biome", "sass"],
    },
    {
      framework: "angular",
      language: "ts",
      modules: ["angular-material", "builtin", "eslint", "prettier", "vitest"],
    },
    ...(["shadcn-vue", "primevue", "vuetify"] as const).flatMap(
      (kit): Combo[] => [
        {
          framework: "vue",
          language: "ts",
          modules: [kit, "pinia", "vue-router", "eslint", "prettier", "vitest"],
        },
        {
          framework: "vue",
          language: "js",
          modules: [kit, "eslint", "prettier", "testing-library"],
        },
        {
          framework: "nuxt",
          language: "ts",
          modules: [kit, "pinia", "eslint", "prettier", "vitest"],
        },
      ],
    ),
    {
      framework: "vue",
      language: "ts",
      modules: ["primevue", "tailwind", "biome"],
    },
    ...(["shadcn", "mui", "chakra-ui", "mantine"] as const).flatMap(
      (kit): Combo[] => [
        {
          framework: "react",
          language: "ts",
          modules: [
            kit,
            "redux-toolkit",
            "react-router",
            "eslint",
            "prettier",
            "vitest",
          ],
        },
        {
          framework: "react",
          language: "js",
          modules: [kit, "eslint", "prettier", "testing-library"],
        },
        {
          framework: "next",
          language: "ts",
          modules: [kit, "zustand", "eslint", "prettier", "vitest", "seo"],
        },
        {
          framework: "next",
          language: "ts",
          modules: [kit, "tailwind", "biome"],
        },
      ],
    ),
    {
      framework: "vue",
      language: "ts",
      modules: ["shadcn-vue", "tailwind", "biome"],
    },
    {
      framework: "angular",
      language: "ts",
      modules: ["angular-material", "tailwind", "testing-library", "biome"],
    },
  ];
}

/**
 * AI agent files must not break the project's own checks: the format hook script and the
 * JSON configs are linted and formatted by whatever tools the project uses.
 */
function aiCombos(): Combo[] {
  const all = ["claude-code", "cursor", "copilot"];
  return [
    {
      framework: "react",
      language: "ts",
      modules: [...all, "eslint", "prettier", "shadcn"],
    },
    {
      framework: "vue",
      language: "js",
      modules: [...all, "eslint", "prettier"],
    },
    {
      framework: "sveltekit",
      language: "ts",
      modules: [...all, "eslint", "prettier"],
    },
    { framework: "next", language: "ts", modules: [...all, "biome", "mui"] },
    {
      framework: "nuxt",
      language: "ts",
      modules: [...all, "eslint", "prettier"],
    },
    { framework: "astro", language: "ts", modules: [...all, "biome"] },
    {
      framework: "angular",
      language: "ts",
      modules: [...all, "eslint", "prettier"],
    },
    { framework: "solid", language: "js", modules: ["agents-md", "biome"] },
    {
      framework: "react",
      language: "ts",
      modules: ["claude-code", "turborepo", "eslint", "prettier"],
    },
  ];
}

/**
 * TanStack Router: the emitted route tree must typecheck before the first build, stay out of
 * the linters and formatters, and be what the Vite plugin would write.
 */
function tanstackCombos(): Combo[] {
  return [
    {
      framework: "react",
      language: "ts",
      modules: [
        "tanstack-router",
        "eslint",
        "prettier",
        "vitest",
        "redux-toolkit",
      ],
    },
    {
      framework: "react",
      language: "js",
      modules: ["tanstack-router", "eslint", "prettier"],
    },
    {
      framework: "react",
      language: "ts",
      modules: ["tanstack-router", "biome", "tailwind", "shadcn"],
    },
    {
      framework: "solid",
      language: "ts",
      modules: ["tanstack-router", "eslint", "prettier", "builtin"],
    },
    {
      framework: "solid",
      language: "js",
      modules: ["tanstack-router", "biome"],
    },
    {
      framework: "react",
      language: "ts",
      modules: ["tanstack-router", "turborepo", "eslint", "prettier"],
    },
    {
      framework: "react",
      language: "ts",
      modules: [
        "tanstack-query",
        "tanstack-router",
        "eslint",
        "prettier",
        "vitest",
      ],
    },
    {
      framework: "react",
      language: "js",
      modules: ["tanstack-query", "react-router", "biome"],
    },
    {
      framework: "solid",
      language: "ts",
      modules: ["tanstack-query", "solid-router", "eslint", "prettier"],
    },
    {
      framework: "vue",
      language: "ts",
      modules: [
        "tanstack-query",
        "vue-router",
        "pinia",
        "eslint",
        "prettier",
        "vitest",
      ],
    },
    { framework: "vue", language: "js", modules: ["tanstack-query", "biome"] },
    {
      framework: "svelte",
      language: "ts",
      modules: [
        "tanstack-query",
        "eslint",
        "prettier",
        "tailwind",
        "shadcn-svelte",
      ],
    },
    {
      framework: "angular",
      language: "ts",
      modules: ["tanstack-query", "eslint", "prettier", "angular-material"],
    },
    {
      framework: "angular",
      language: "ts",
      modules: ["tanstack-query", "biome", "vitest"],
    },
  ];
}

/**
 * Repository files (.editorconfig, LICENSE, CI workflow) must pass the project's own format
 * checks; Prettier also parses the workflow YAML.
 */
function projectFileCombos(): Combo[] {
  const files = ["github-actions", "editorconfig", "license"];
  return [
    {
      framework: "react",
      language: "ts",
      modules: [...files, "eslint", "prettier", "vitest"],
    },
    { framework: "vue", language: "js", modules: [...files, "biome"] },
    { framework: "angular", language: "ts", modules: [...files, "prettier"] },
    {
      framework: "next",
      language: "ts",
      modules: [...files, "turborepo", "eslint", "prettier"],
    },
  ];
}

/** Deploy files next to each linter/formatter, so their formatting is checked too. */
function deployCombos(): Combo[] {
  const all = ["vercel", "netlify", "docker"];
  return [
    {
      framework: "react",
      language: "ts",
      modules: [...all, "cloudflare", "react-router", "eslint", "prettier"],
    },
    {
      framework: "vue",
      language: "js",
      modules: [...all, "cloudflare", "vue-router", "biome"],
    },
    {
      framework: "angular",
      language: "ts",
      modules: [...all, "cloudflare", "prettier"],
    },
    {
      framework: "sveltekit",
      language: "ts",
      modules: [...all, "cloudflare", "eslint", "prettier"],
    },
    {
      framework: "astro",
      language: "ts",
      modules: [...all, "cloudflare", "biome"],
    },
    {
      framework: "next",
      language: "ts",
      modules: [...all, "eslint", "prettier"],
    },
    { framework: "nuxt", language: "js", modules: [...all, "prettier"] },
  ];
}

/** Each form library in both languages, with linting, formatting and the counter tests. */
function formCombos(): Combo[] {
  const checks = ["eslint", "prettier", "vitest", "testing-library"];
  return [
    {
      framework: "react",
      language: "ts",
      modules: ["tanstack-form", ...checks],
    },
    {
      framework: "react",
      language: "js",
      modules: ["react-hook-form", "tailwind", ...checks],
    },
    {
      framework: "react",
      language: "ts",
      modules: ["react-hook-form", "biome", "shadcn", "tailwind"],
    },
    {
      framework: "vue",
      language: "ts",
      modules: ["tanstack-form", "tailwind", ...checks],
    },
    { framework: "vue", language: "js", modules: ["tanstack-form", "biome"] },
    {
      framework: "svelte",
      language: "ts",
      modules: ["tanstack-form", ...checks],
    },
    {
      framework: "svelte",
      language: "js",
      modules: ["tanstack-form", "tailwind", "biome"],
    },
    {
      framework: "solid",
      language: "ts",
      modules: ["tanstack-form", "tailwind", ...checks],
    },
    { framework: "solid", language: "js", modules: ["tanstack-form", "biome"] },
    {
      framework: "angular",
      language: "ts",
      modules: ["tanstack-form", "tailwind", ...checks],
    },
    {
      framework: "angular",
      language: "ts",
      modules: ["tanstack-form", "angular-material", "biome"],
    },
  ];
}

/** The PWA plugin next to the other Vite plugins, linters and the test config. */
function pwaCombos(): Combo[] {
  return [
    {
      framework: "react",
      language: "ts",
      modules: [
        "pwa",
        "tailwind",
        "react-router",
        "eslint",
        "prettier",
        "vitest",
        "testing-library",
      ],
    },
    {
      framework: "vue",
      language: "js",
      modules: ["pwa", "vue-router", "biome"],
    },
    {
      framework: "svelte",
      language: "ts",
      modules: ["pwa", "seo", "eslint", "prettier"],
    },
    {
      framework: "solid",
      language: "ts",
      modules: ["pwa", "tailwind", "biome"],
    },
    {
      framework: "preact",
      language: "js",
      modules: ["pwa", "eslint", "prettier", "vitest"],
    },
  ];
}

/** Playwright's config and test next to every framework's linters, in both languages. */
function playwrightCombos(): Combo[] {
  const checks = ["eslint", "prettier"];
  return [
    {
      framework: "react",
      language: "ts",
      modules: ["playwright", "react-router", "vitest", ...checks],
    },
    {
      framework: "vue",
      language: "js",
      modules: ["playwright", "vue-router", "vitest", "biome"],
    },
    {
      framework: "svelte",
      language: "ts",
      modules: ["playwright", "vitest", ...checks],
    },
    {
      framework: "solid",
      language: "js",
      modules: ["playwright", "solid-router", ...checks],
    },
    {
      framework: "preact",
      language: "ts",
      modules: ["playwright", "preact-iso", "biome"],
    },
    {
      framework: "angular",
      language: "ts",
      modules: ["playwright", "vitest", ...checks],
    },
    {
      framework: "next",
      language: "ts",
      modules: ["playwright", "vitest", ...checks],
    },
    {
      framework: "nuxt",
      language: "ts",
      modules: ["playwright", "vitest", ...checks],
    },
    {
      framework: "sveltekit",
      language: "js",
      modules: ["playwright", "vitest", ...checks],
    },
    { framework: "astro", language: "ts", modules: ["playwright", "biome"] },
  ];
}

/** Each i18n library in both languages, next to the linters and a UI kit. */
function i18nCombos(): Combo[] {
  const checks = ["eslint", "prettier", "vitest", "testing-library"];
  return [
    {
      framework: "react",
      language: "ts",
      modules: ["react-i18next", "tailwind", ...checks],
    },
    {
      framework: "react",
      language: "js",
      modules: ["react-i18next", "mui", "biome"],
    },
    {
      framework: "vue",
      language: "ts",
      modules: ["vue-i18n", "pinia", ...checks],
    },
    {
      framework: "vue",
      language: "js",
      modules: ["vue-i18n", "vuetify", "biome"],
    },
  ];
}

/** Storybook with the store and UI kit providers its counter story needs. */
function storybookCombos(): Combo[] {
  const checks = ["eslint", "prettier"];
  return [
    {
      framework: "react",
      language: "ts",
      modules: ["storybook", "redux-toolkit", "tailwind", ...checks],
    },
    {
      framework: "react",
      language: "js",
      modules: ["storybook", "mui", "biome"],
    },
    { framework: "preact", language: "ts", modules: ["storybook", ...checks] },
    {
      framework: "vue",
      language: "ts",
      modules: ["storybook", "pinia", "vuetify", ...checks],
    },
    { framework: "vue", language: "js", modules: ["storybook", "biome"] },
    {
      framework: "svelte",
      language: "ts",
      modules: ["storybook", "tailwind", ...checks],
    },
  ];
}

/** The API next to each SPA, in both languages. */
function backendCombos(): Combo[] {
  return [
    {
      framework: "react",
      language: "ts",
      modules: ["express", "tailwind", "eslint", "prettier"],
    },
    { framework: "vue", language: "js", modules: ["express", "pinia"] },
    { framework: "svelte", language: "ts", modules: ["express", "biome"] },
    { framework: "solid", language: "ts", modules: ["express"] },
    { framework: "preact", language: "js", modules: ["express"] },
    { framework: "angular", language: "ts", modules: ["express", "prettier"] },
    {
      framework: "react",
      language: "ts",
      modules: ["express", "mongodb", "eslint", "prettier"],
    },
    {
      framework: "vue",
      language: "js",
      modules: ["express", "mongodb", "biome"],
    },
    {
      framework: "react",
      language: "ts",
      modules: ["nestjs", "mongodb", "eslint", "prettier"],
    },
    {
      framework: "react",
      language: "ts",
      modules: ["nestjs", "eslint", "prettier"],
    },
    { framework: "vue", language: "ts", modules: ["nestjs", "pinia"] },
    { framework: "angular", language: "ts", modules: ["nestjs"] },
    {
      framework: "next",
      language: "ts",
      modules: ["drizzle", "tailwind", "eslint", "prettier"],
    },
    {
      framework: "next",
      language: "js",
      modules: ["drizzle", "axios", "biome"],
    },
    {
      framework: "nuxt",
      language: "ts",
      modules: ["drizzle", "tailwind", "eslint", "prettier", "seo"],
    },
    { framework: "nuxt", language: "js", modules: ["drizzle", "biome"] },
    {
      framework: "sveltekit",
      language: "ts",
      modules: ["drizzle", "tailwind", "eslint", "prettier", "seo", "docker"],
    },
    {
      framework: "sveltekit",
      language: "js",
      modules: ["drizzle", "vercel", "eslint"],
    },
    {
      framework: "sveltekit",
      language: "ts",
      modules: ["drizzle", "biome", "netlify"],
    },
    {
      framework: "sveltekit",
      language: "ts",
      modules: ["drizzle", "cloudflare"],
    },
  ];
}
