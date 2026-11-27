import { file } from "../../engine/code";
import type { Ctx, FrameworkId, Module, ProjectModel } from "../../types";

/** Dev dependencies on top of `vitest` itself: the DOM environment and mount helpers. */
const deps: Record<FrameworkId, (ctx: Ctx) => string[]> = {
  react: () => ["jsdom"],
  preact: () => ["jsdom"],
  solid: () => ["jsdom"],
  svelte: () => ["jsdom"],
  vue: (ctx) => [
    "jsdom",
    "@vue/test-utils",
    ...(ctx.isTs ? ["@types/jsdom"] : []),
  ],
  next: () => ["jsdom", "@vitejs/plugin-react"],
  nuxt: () => ["happy-dom", "@nuxt/test-utils", "@vue/test-utils"],
  sveltekit: () => ["jsdom"],
  astro: () => [],
  angular: () => ["jsdom"],
};

/** Path of the Vitest setup file: create-vue's `src/test-setup`, Next's root `vitest.setup`. */
export function setupFilePath(ctx: Ctx): string {
  switch (ctx.selection.framework) {
    case "next":
      return `vitest.setup.${ctx.ext.script}`;
    case "nuxt":
      return `test/nuxt/setup.${ctx.ext.script}`;
    default:
      return `src/test-setup.${ctx.ext.script}`;
  }
}

/** jsdom lacks matchMedia, which Mantine reads for the color scheme. */
export function matchMediaMock(ctx: Ctx): string[] {
  return [
    "// Mantine reads the color scheme with matchMedia, which jsdom does not implement.",
    'Object.defineProperty(window, "matchMedia", {',
    "  writable: true,",
    `  value: (query${ctx.isTs ? ": string" : ""}) => ({`,
    "    matches: false,",
    "    media: query,",
    "    onchange: null,",
    "    addListener: () => {},",
    "    removeListener: () => {},",
    "    addEventListener: () => {},",
    "    removeEventListener: () => {},",
    "    dispatchEvent: () => false,",
    "  }),",
    "});",
  ];
}

/** Adds a Vitest setup file, or appends to the one another module started. */
export function addSetupFile(
  model: ProjectModel,
  ctx: Ctx,
  lines: string[],
): void {
  const testing = model.testing;
  if (!testing) throw new Error("vitest must run before adding setup files");
  const path = setupFilePath(ctx);
  const existing = model.files.get(path);
  model.files.set(path, existing ? `${existing}\n${file(lines)}` : file(lines));
  if (!testing.setupFiles.includes(path)) testing.setupFiles.push(path);
}

/**
 * Vitest with a DOM environment and a counter component test. Adapters render the config
 * (vite.config `test` block, or a separate vitest.config where the framework's scaffold has
 * one) and the test itself from `model.testing`.
 */
export const vitest: Module = {
  id: "vitest",
  name: "Vitest",
  category: "testing",
  description: {
    az: "Vite əsaslı test runner; sayğac komponenti üçün nümunə testlə.",
    en: "Vite-native test runner, with a sample counter component test.",
    ru: "Тест-раннер для Vite с примером теста компонента-счётчика.",
  },
  frameworks: [
    "react",
    "preact",
    "solid",
    "svelte",
    "vue",
    "next",
    "nuxt",
    "sveltekit",
    "astro",
    "angular",
  ],
  apply(model, ctx) {
    model.pkg.devDependencies.add("vitest");
    for (const dep of deps[ctx.selection.framework](ctx)) {
      model.pkg.devDependencies.add(dep);
    }
    // `ng test` runs Vitest through Angular's unit-test builder.
    model.pkg.scripts["test"] =
      ctx.selection.framework === "angular"
        ? "ng test --watch=false"
        : "vitest run";
    model.testing = { library: false, setupFiles: [] };

    // React (and Next) only check act() warnings when the environment opts in; Testing
    // Library does this itself, so the flag is set only for plain react-dom tests.
    const react = ["react", "next"].includes(ctx.selection.framework);
    if (react && !ctx.has("testing-library")) {
      addSetupFile(model, ctx, [
        "// Lets React know this environment wraps updates in act().",
        "Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });",
      ]);
    }
    // Testing Library writes its imports first and adds the mock itself.
    if (ctx.has("mantine") && !ctx.has("testing-library")) {
      addSetupFile(model, ctx, matchMediaMock(ctx));
    }
    model.readme.stack.push("Vitest");
  },
};
