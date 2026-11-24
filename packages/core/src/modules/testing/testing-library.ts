import type { FrameworkId, Module } from "../../types";
import { addSetupFile } from "./vitest";

const COMMON = [
  "@testing-library/dom",
  "@testing-library/jest-dom",
  "@testing-library/user-event",
];

/** The framework binding and the import that exposes its `cleanup`. */
const bindings: Partial<Record<FrameworkId, string>> = {
  react: "@testing-library/react",
  next: "@testing-library/react",
  preact: "@testing-library/preact",
  solid: "@solidjs/testing-library",
  svelte: "@testing-library/svelte",
  vue: "@testing-library/vue",
  nuxt: "@testing-library/vue",
  angular: "@testing-library/angular",
};

/**
 * Testing Library on top of Vitest: jest-dom matchers, user-event and the framework binding.
 * The counter test switches to `render`/`screen` queries.
 */
export const testingLibrary: Module = {
  id: "testing-library",
  name: "Testing Library",
  category: "testing",
  description: {
    az: "İstifadəçi kimi test: render, screen, user-event və jest-dom.",
    en: "Test like a user: render, screen, user-event and jest-dom.",
  },
  frameworks: [
    "react",
    "preact",
    "solid",
    "svelte",
    "vue",
    "next",
    "nuxt",
    "angular",
  ],
  requires: ["vitest"],
  apply(model, ctx) {
    const testing = model.testing;
    if (!testing) throw new Error("testing-library requires vitest");
    const binding = bindings[ctx.selection.framework];
    if (!binding) throw new Error("no Testing Library binding");
    testing.library = true;
    for (const dep of [...COMMON, binding]) model.pkg.devDependencies.add(dep);

    // Svelte's `svelteTesting()` Vite plugin registers cleanup (and the browser build), and
    // Angular's builder enables Vitest globals, which the binding hooks into. Elsewhere
    // globals are off, so cleanup is registered in the setup file.
    const svelte = ctx.selection.framework === "svelte";
    if (svelte) {
      model.bundler.plugins.push({
        import: {
          from: "@testing-library/svelte/vite",
          named: ["svelteTesting"],
        },
        call: "svelteTesting()",
      });
    }
    addSetupFile(model, ctx, [
      'import "@testing-library/jest-dom/vitest";',
      ...(svelte || ctx.selection.framework === "angular"
        ? []
        : [
            `import { cleanup } from "${binding}";`,
            'import { afterEach } from "vitest";',
            "",
            "afterEach(() => {",
            "  cleanup();",
            "});",
          ]),
    ]);
    model.readme.stack.push("Testing Library");
  },
};
