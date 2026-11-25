import { file } from "../../engine/code";
import type { Ctx, FrameworkId, Module, ProjectModel } from "../../types";

/** What the module writes for one framework: config file, dev dependencies and the lint script. */
interface EslintSetup {
  path: string;
  devDependencies: string[];
  script: string;
  config: string[];
}

const PRETTIER_IMPORT =
  'import eslintConfigPrettier from "eslint-config-prettier/flat";';

/** `eslint-config-prettier` goes last so it turns off rules that fight the formatter. */
function prettierParts(ctx: Ctx): { imports: string[]; entries: string[] } {
  return ctx.has("prettier")
    ? { imports: [PRETTIER_IMPORT], entries: ["eslintConfigPrettier,"] }
    : { imports: [], entries: [] };
}

function prettierDeps(ctx: Ctx): string[] {
  return ctx.has("prettier") ? ["eslint-config-prettier"] : [];
}

function tsDeps(ctx: Ctx): string[] {
  return ctx.isTs ? ["typescript-eslint"] : [];
}

const BASE_DEPS = ["eslint", "@eslint/js", "globals"];

/** One flat-config block for JSX frameworks: files glob, shared configs, browser globals. */
function jsxBlock(ctx: Ctx, extendsList: string[], jsRules: boolean): string[] {
  const files = ctx.isTs ? '["**/*.{ts,tsx}"]' : '["**/*.{js,jsx}"]';
  const jsOnly = !ctx.isTs && jsRules;
  return [
    "  {",
    `    files: ${files},`,
    "    extends: [",
    ...extendsList.map((e) => `      ${e},`),
    "    ],",
    "    languageOptions: {",
    "      globals: globals.browser,",
    ...(jsOnly
      ? [
          "      parserOptions: {",
          "        ecmaFeatures: { jsx: true },",
          "      },",
        ]
      : []),
    "    },",
    ...(jsOnly
      ? [
          "    rules: {",
          '      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],',
          "    },",
        ]
      : []),
    "  },",
  ];
}

/** `defineConfig([...])` with `dist` ignored, the given blocks and Prettier last. */
function viteConfig(
  ctx: Ctx,
  imports: string[],
  blocks: string[],
  ignores: string[] = ["dist"],
): string[] {
  const prettier = prettierParts(ctx);
  return [
    'import js from "@eslint/js";',
    'import { defineConfig, globalIgnores } from "eslint/config";',
    ...prettier.imports,
    ...imports,
    'import globals from "globals";',
    ...(ctx.isTs ? ['import tseslint from "typescript-eslint";'] : []),
    "",
    "export default defineConfig([",
    `  globalIgnores(${JSON.stringify(ignores)}),`,
    ...blocks,
    ...prettier.entries.map((e) => `  ${e}`),
    "]);",
  ];
}

const tsExtends = (ctx: Ctx) =>
  ctx.isTs
    ? ["js.configs.recommended", "tseslint.configs.recommended"]
    : ["js.configs.recommended"];

/** create-vite's React template (last shipped with ESLint in create-vite 9.0). */
/**
 * Overrides for UI-kit files the kit's CLI writes into `components/ui`: shadcn/ui and Chakra
 * export variants and hooks next to components (react-refresh), and Chakra's snippets declare
 * empty interfaces that extend a props type.
 */
function uiKitBlocks(ctx: Ctx, dir: string, vite: boolean): string[] {
  const exts = ctx.isTs ? "{ts,tsx}" : "{js,jsx}";
  const rules = [
    ...(vite && (ctx.has("shadcn") || ctx.has("chakra-ui"))
      ? ['"react-refresh/only-export-components": "off",']
      : []),
    ...(ctx.isTs && ctx.has("chakra-ui")
      ? ['"@typescript-eslint/no-empty-object-type": "off",']
      : []),
  ];
  if (!rules.length) return [];
  return [
    "  {",
    "    // Files written by the UI kit's CLI.",
    `    files: ["${dir}/**/*.${exts}"],`,
    "    rules: {",
    ...rules.map((r) => `      ${r}`),
    "    },",
    "  },",
  ];
}

function react(ctx: Ctx, model: ProjectModel): EslintSetup {
  return {
    path: "eslint.config.js",
    devDependencies: [
      ...BASE_DEPS,
      "eslint-plugin-react-hooks",
      "eslint-plugin-react-refresh",
      ...tsDeps(ctx),
    ],
    script: "eslint .",
    config: viteConfig(
      ctx,
      [
        'import reactHooks from "eslint-plugin-react-hooks";',
        'import reactRefresh from "eslint-plugin-react-refresh";',
      ],
      [
        ...jsxBlock(
          ctx,
          [
            ...tsExtends(ctx),
            "reactHooks.configs.flat.recommended",
            "reactRefresh.configs.vite",
          ],
          true,
        ),
        ...uiKitBlocks(ctx, "src/components/ui", true),
        ...(model.routing?.fileRoutes
          ? [
              "  {",
              "    // The router plugin handles HMR for route files (`Route` and its component).",
              `    files: ["src/routes/**/*.${ctx.isTs ? "{ts,tsx}" : "{js,jsx}"}"],`,
              "    rules: {",
              '      "react-refresh/only-export-components": "off",',
              "    },",
              "  },",
            ]
          : []),
      ],
      ["dist", ...model.verbatim],
    ),
  };
}

/**
 * eslint-config-preact only supports ESLint 9 (it crashes on 10), so Preact uses the React
 * hooks rules, which match `preact/hooks` by name.
 */
function preact(ctx: Ctx): EslintSetup {
  return {
    path: "eslint.config.js",
    devDependencies: [
      ...BASE_DEPS,
      "eslint-plugin-react-hooks",
      ...tsDeps(ctx),
    ],
    script: "eslint .",
    config: viteConfig(
      ctx,
      ['import reactHooks from "eslint-plugin-react-hooks";'],
      jsxBlock(
        ctx,
        [...tsExtends(ctx), "reactHooks.configs.flat.recommended"],
        true,
      ),
    ),
  };
}

/** eslint-plugin-solid's flat configs (`typescript` turns off rules TypeScript covers). */
function solid(ctx: Ctx, model: ProjectModel): EslintSetup {
  const config = ctx.isTs ? "typescript" : "recommended";
  return {
    path: "eslint.config.js",
    devDependencies: [...BASE_DEPS, "eslint-plugin-solid", ...tsDeps(ctx)],
    script: "eslint .",
    config: viteConfig(
      ctx,
      [`import solid from "eslint-plugin-solid/configs/${config}";`],
      jsxBlock(ctx, [...tsExtends(ctx), "solid"], false),
      ["dist", ...model.verbatim],
    ),
  };
}

/** create-vue's ESLint setup without its oxlint half. */
function vue(ctx: Ctx): EslintSetup {
  const prettier = ctx.has("prettier");
  const ignores =
    '  globalIgnores(["**/dist/**", "**/dist-ssr/**", "**/coverage/**"]),';
  // shadcn-vue's components are single-word (Button.vue, Card.vue).
  const shadcn = ctx.has("shadcn-vue")
    ? [
        "  {",
        '    name: "app/shadcn-ui",',
        '    files: ["src/components/ui/**/*.vue"],',
        '    rules: { "vue/multi-word-component-names": "off" },',
        "  },",
      ]
    : [];
  if (ctx.isTs) {
    return {
      path: "eslint.config.ts",
      devDependencies: [
        "eslint",
        "eslint-plugin-vue",
        "vue-eslint-parser",
        "@vue/eslint-config-typescript",
        "jiti",
      ],
      script: "eslint .",
      config: [
        'import { globalIgnores } from "eslint/config";',
        'import { defineConfigWithVueTs, vueTsConfigs } from "@vue/eslint-config-typescript";',
        'import pluginVue from "eslint-plugin-vue";',
        ...(prettier
          ? ['import skipFormatting from "eslint-config-prettier/flat";']
          : []),
        "",
        "export default defineConfigWithVueTs(",
        "  {",
        '    name: "app/files-to-lint",',
        '    files: ["**/*.{vue,ts,mts,tsx}"],',
        "  },",
        ignores,
        '  ...pluginVue.configs["flat/essential"],',
        "  vueTsConfigs.recommended,",
        ...shadcn,
        ...(prettier ? ["  skipFormatting,"] : []),
        ");",
      ],
    };
  }
  return {
    path: "eslint.config.js",
    devDependencies: [...BASE_DEPS, "eslint-plugin-vue", "vue-eslint-parser"],
    script: "eslint .",
    config: [
      'import js from "@eslint/js";',
      'import pluginVue from "eslint-plugin-vue";',
      ...(prettier
        ? ['import skipFormatting from "eslint-config-prettier/flat";']
        : []),
      'import { defineConfig, globalIgnores } from "eslint/config";',
      'import globals from "globals";',
      "",
      "export default defineConfig([",
      "  {",
      '    name: "app/files-to-lint",',
      '    files: ["**/*.{vue,js,mjs,jsx}"],',
      "  },",
      ignores,
      "  { languageOptions: { globals: { ...globals.browser } } },",
      "  js.configs.recommended,",
      '  ...pluginVue.configs["flat/essential"],',
      ...shadcn,
      ...(prettier ? ["  skipFormatting,"] : []),
      "]);",
    ],
  };
}

/**
 * Svelte follows `sv add eslint` (SvelteKit reads ignores from .gitignore). TypeScript uses
 * eslint-plugin-svelte's README setup without type-checked rules: sv's `recommendedTypeChecked`
 * flags `any` from Vite's `import.meta.env` index signature in generated modules, and would also
 * need the config file inside the TypeScript project.
 */
function svelte(ctx: Ctx, kit: boolean): EslintSetup {
  const prettier = ctx.has("prettier");
  return {
    path: "eslint.config.js",
    devDependencies: [...BASE_DEPS, "eslint-plugin-svelte", ...tsDeps(ctx)],
    script: "eslint .",
    config: [
      ...(kit ? ['import path from "node:path";'] : []),
      'import js from "@eslint/js";',
      kit
        ? 'import { defineConfig, includeIgnoreFile } from "eslint/config";'
        : 'import { defineConfig, globalIgnores } from "eslint/config";',
      ...(prettier ? [PRETTIER_IMPORT] : []),
      'import svelte from "eslint-plugin-svelte";',
      'import globals from "globals";',
      ...(ctx.isTs ? ['import ts from "typescript-eslint";'] : []),
      "",
      ...(kit
        ? [
            'const gitignorePath = path.resolve(import.meta.dirname, ".gitignore");',
            "",
          ]
        : []),
      "export default defineConfig(",
      kit
        ? "  includeIgnoreFile(gitignorePath),"
        : '  globalIgnores(["dist"]),',
      "  js.configs.recommended,",
      ...(ctx.isTs ? ["  ts.configs.recommended,"] : []),
      "  svelte.configs.recommended,",
      ...(prettier
        ? ["  eslintConfigPrettier,", "  svelte.configs.prettier,"]
        : []),
      "  {",
      "    languageOptions: {",
      ...(ctx.isTs
        ? ['      parserOptions: { extraFileExtensions: [".svelte"] },']
        : []),
      "      globals: { ...globals.browser, ...globals.node },",
      "    },",
      ...(ctx.isTs
        ? [
            "    rules: {",
            "      // typescript-eslint recommends turning no-undef off in TypeScript projects:",
            "      // https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors",
            '      "no-undef": "off",',
            "    },",
          ]
        : []),
      "  },",
      ...(ctx.isTs
        ? [
            "  {",
            '    files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],',
            "    languageOptions: {",
            "      parserOptions: { projectService: true, parser: ts.parser },",
            "    },",
            "  },",
          ]
        : []),
      ...(kit && ctx.has("shadcn-svelte")
        ? [
            "  {",
            "    // shadcn-svelte's Button renders whatever `href` it receives; callers pass resolve()d paths.",
            '    files: ["src/lib/components/ui/**/*.svelte"],',
            '    rules: { "svelte/no-navigation-without-resolve": "off" },',
            "  },",
          ]
        : []),
      ");",
    ],
  };
}

/** create-next-app's config, plus eslint-config-prettier as the Next.js docs show. */
function next(ctx: Ctx): EslintSetup {
  const prettier = ctx.has("prettier");
  return {
    path: "eslint.config.mjs",
    devDependencies: ["eslint", "eslint-config-next"],
    script: "eslint .",
    config: [
      'import { defineConfig, globalIgnores } from "eslint/config";',
      'import nextVitals from "eslint-config-next/core-web-vitals";',
      ...(ctx.isTs
        ? ['import nextTs from "eslint-config-next/typescript";']
        : []),
      ...(prettier
        ? ['import prettier from "eslint-config-prettier/flat";']
        : []),
      "",
      "const eslintConfig = defineConfig([",
      "  ...nextVitals,",
      ...(ctx.isTs ? ["  ...nextTs,"] : []),
      ...uiKitBlocks(ctx, "components/ui", false),
      ...(prettier ? ["  prettier,"] : []),
      "  // Override default ignores of eslint-config-next.",
      "  globalIgnores([",
      "    // Default ignores of eslint-config-next:",
      '    ".next/**",',
      '    "out/**",',
      '    "build/**",',
      '    "next-env.d.ts",',
      "  ]),",
      "]);",
      "",
      "export default eslintConfig;",
    ],
  };
}

/**
 * `@nuxt/eslint` generates a project-aware config into `.nuxt/` on `nuxt prepare` (postinstall);
 * the root config only extends it.
 */
function nuxt(ctx: Ctx): EslintSetup {
  const prettier = ctx.has("prettier");
  return {
    path: "eslint.config.mjs",
    // @nuxt/eslint-config parses with typescript-eslint, so JS projects need `typescript` too.
    devDependencies: ["eslint", "@nuxt/eslint", "typescript"],
    script: "eslint .",
    config: [
      "// @ts-check",
      ...(prettier ? [PRETTIER_IMPORT] : []),
      'import withNuxt from "./.nuxt/eslint.config.mjs";',
      "",
      prettier
        ? "export default withNuxt(eslintConfigPrettier);"
        : "export default withNuxt(\n  // Your custom configs here\n);",
    ],
  };
}

/** eslint-plugin-astro's recommended config; it picks typescript-eslint's parser when installed. */
function astro(ctx: Ctx): EslintSetup {
  const prettier = prettierParts(ctx);
  return {
    path: "eslint.config.js",
    devDependencies: [...BASE_DEPS, "eslint-plugin-astro", ...tsDeps(ctx)],
    script: "eslint .",
    config: [
      'import js from "@eslint/js";',
      'import { defineConfig, globalIgnores } from "eslint/config";',
      ...prettier.imports,
      'import eslintPluginAstro from "eslint-plugin-astro";',
      'import globals from "globals";',
      ...(ctx.isTs ? ['import tseslint from "typescript-eslint";'] : []),
      "",
      "export default defineConfig([",
      '  globalIgnores(["dist", ".astro"]),',
      "  js.configs.recommended,",
      ...(ctx.isTs ? ["  tseslint.configs.recommended,"] : []),
      "  eslintPluginAstro.configs.recommended,",
      "  {",
      "    languageOptions: {",
      "      globals: { ...globals.browser, ...globals.node },",
      "    },",
      "  },",
      ...prettier.entries.map((e) => `  ${e}`),
      "]);",
    ],
  };
}

/** What `ng add angular-eslint` writes; the adapter adds the `lint` target to angular.json. */
function angular(ctx: Ctx): EslintSetup {
  const prettier = prettierParts(ctx);
  return {
    path: "eslint.config.js",
    devDependencies: [
      "eslint",
      "@eslint/js",
      "typescript-eslint",
      "angular-eslint",
      "@angular-eslint/builder",
    ],
    script: "ng lint",
    config: [
      "// @ts-check",
      'import eslint from "@eslint/js";',
      'import { defineConfig } from "eslint/config";',
      'import tseslint from "typescript-eslint";',
      'import angular from "angular-eslint";',
      ...prettier.imports,
      "",
      "export default defineConfig([",
      "  {",
      '    files: ["**/*.ts"],',
      "    extends: [",
      "      eslint.configs.recommended,",
      "      tseslint.configs.recommended,",
      "      tseslint.configs.stylistic,",
      "      angular.configs.tsRecommended,",
      "    ],",
      "    processor: angular.processInlineTemplates,",
      "    rules: {",
      '      "@angular-eslint/directive-selector": [',
      '        "error",',
      '        { type: "attribute", prefix: "app", style: "camelCase" },',
      "      ],",
      '      "@angular-eslint/component-selector": [',
      '        "error",',
      '        { type: "element", prefix: "app", style: "kebab-case" },',
      "      ],",
      "    },",
      "  },",
      "  {",
      '    files: ["**/*.html"],',
      "    extends: [",
      "      angular.configs.templateRecommended,",
      "      angular.configs.templateAccessibility,",
      "    ],",
      "    rules: {},",
      "  },",
      ...prettier.entries.map((e) => `  ${e}`),
      "]);",
    ],
  };
}

const setups: Record<
  FrameworkId,
  (ctx: Ctx, model: ProjectModel) => EslintSetup
> = {
  react,
  preact,
  solid,
  vue,
  svelte: (ctx) => svelte(ctx, false),
  sveltekit: (ctx) => svelte(ctx, true),
  next,
  nuxt,
  astro,
  angular,
};

export const eslint: Module = {
  id: "eslint",
  name: "ESLint",
  category: "quality",
  description: {
    az: "Kod analizatoru (flat config).",
    en: "Pluggable linter (flat config).",
  },
  frameworks: "all",
  conflicts: ["biome"],
  apply(model, ctx) {
    const setup = setups[ctx.selection.framework](ctx, model);
    for (const dep of [...setup.devDependencies, ...prettierDeps(ctx)]) {
      model.pkg.devDependencies.add(dep);
    }
    model.pkg.scripts["lint"] = setup.script;
    model.files.set(setup.path, file(setup.config));
    // Angular renders the `ng lint` target into angular.json from this.
    model.linter = "eslint";
    if (ctx.selection.framework === "nuxt") {
      model.bundler.modules.push("@nuxt/eslint");
    }
    model.readme.stack.push("ESLint");
  },
};
