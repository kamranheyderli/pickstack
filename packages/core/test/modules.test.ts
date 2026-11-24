import { describe, expect, it } from "vitest";
import { getFramework, getModule, knownGoodVersion } from "../src";
import type { FrameworkId, ProjectModel } from "../src";
import { ctxFor } from "./helpers";

function applied(
  id: string,
  language: "js" | "ts" = "ts",
  frameworkId: FrameworkId = "react",
): ProjectModel {
  const ctx = ctxFor(language, [id], frameworkId);
  const framework = getFramework(frameworkId);
  const mod = getModule(id);
  if (!framework || !mod) throw new Error(`missing ${id}`);
  const model = framework.base(ctx);
  mod.apply(model, ctx);
  return model;
}

describe("tailwind", () => {
  it("adds the Vite plugin, the CSS import and switches the demo to utility classes", () => {
    const model = applied("tailwind");
    expect([...model.pkg.devDependencies]).toEqual(
      expect.arrayContaining(["tailwindcss", "@tailwindcss/vite"]),
    );
    expect(model.bundler.plugins.map((p) => p.call)).toContain("tailwindcss()");
    expect(model.styles.globalImports).toEqual(['@import "tailwindcss";']);
    expect(model.styles.mode).toBe("tailwind");
  });
});

describe("redux-toolkit", () => {
  it("adds the store, a Provider and typed hooks in TS", () => {
    const model = applied("redux-toolkit");
    expect([...model.pkg.dependencies]).toEqual(
      expect.arrayContaining(["@reduxjs/toolkit", "react-redux"]),
    );
    expect([...model.files.keys()]).toEqual(
      expect.arrayContaining([
        "src/store/index.ts",
        "src/store/counterSlice.ts",
        "src/store/hooks.ts",
      ]),
    );
    expect(model.entry.providers).toEqual([
      expect.objectContaining({ id: "redux", order: 10 }),
    ]);
    expect(model.demo.counter?.setup.join("\n")).toContain("useAppSelector");
  });

  it("uses plain hooks and no hooks file in JS", () => {
    const model = applied("redux-toolkit", "js");
    expect(model.files.has("src/store/hooks.ts")).toBe(false);
    expect(model.files.get("src/store/index.js")).not.toContain("RootState");
    expect(model.demo.counter?.setup.join("\n")).toContain("useSelector(");
  });
});

describe("zustand", () => {
  it("adds a typed store without a provider", () => {
    const model = applied("zustand");
    expect(model.files.get("src/store/useCounterStore.ts")).toContain(
      "create<CounterState>()",
    );
    expect(model.entry.providers).toEqual([]);
    expect(model.demo.counter?.increment).toBe("increment");
  });
});

describe("react-router", () => {
  it("adds routes, the BrowserRouter provider and the outlet", () => {
    const model = applied("react-router");
    expect([...model.pkg.dependencies]).toContain("react-router");
    expect(model.routes.map((r) => r.path)).toEqual(["/", "/about"]);
    expect(model.entry.providers[0]?.open).toBe("<BrowserRouter>");
    expect(model.routing?.outlet).toContain(
      '  <Route path="/about" element={<About />} />',
    );
  });
});

describe("axios", () => {
  it("adds a client and an env example", () => {
    const model = applied("axios", "js");
    expect(model.files.get("src/api/client.js")).toContain(
      "import.meta.env.VITE_API_URL",
    );
    expect(model.files.has(".env.example")).toBe(true);
  });
});

describe("prettier", () => {
  it("adds config and format scripts", () => {
    const model = applied("prettier");
    expect(model.files.has(".prettierrc")).toBe(true);
    expect(model.pkg.scripts["format:check"]).toBe("prettier --check .");
  });
});

describe("eslint", () => {
  function rendered(
    language: "js" | "ts",
    frameworkId: FrameworkId,
    ids: string[] = ["eslint"],
  ): ProjectModel {
    const ctx = ctxFor(language, ids, frameworkId);
    const framework = getFramework(frameworkId);
    if (!framework) throw new Error(`missing ${frameworkId}`);
    const model = framework.base(ctx);
    for (const id of ids) getModule(id)?.apply(model, ctx);
    framework.render(model, ctx);
    return model;
  }

  it("uses create-vite's React config with typescript-eslint in TS", () => {
    const model = applied("eslint");
    const config = model.files.get("eslint.config.js") ?? "";
    expect(config).toContain("tseslint.configs.recommended");
    expect(config).toContain("reactRefresh.configs.vite");
    expect(config).not.toContain("eslint-config-prettier");
    expect([...model.pkg.devDependencies]).toEqual(
      expect.arrayContaining([
        "eslint",
        "@eslint/js",
        "globals",
        "eslint-plugin-react-hooks",
        "eslint-plugin-react-refresh",
        "typescript-eslint",
      ]),
    );
    expect(model.pkg.scripts["lint"]).toBe("eslint .");
  });

  it("enables JSX parsing and drops typescript-eslint in JS", () => {
    const model = applied("eslint", "js");
    const config = model.files.get("eslint.config.js") ?? "";
    expect(config).toContain("ecmaFeatures: { jsx: true }");
    expect(config).not.toContain("tseslint");
    expect(model.pkg.devDependencies.has("typescript-eslint")).toBe(false);
  });

  it("adds eslint-config-prettier last when prettier is selected", () => {
    const model = rendered("ts", "react", ["eslint", "prettier"]);
    const config = model.files.get("eslint.config.js") ?? "";
    expect(model.pkg.devDependencies.has("eslint-config-prettier")).toBe(true);
    expect(config.trimEnd().split("\n").slice(-2)).toEqual([
      "  eslintConfigPrettier,",
      "]);",
    ]);
  });

  it("uses the react-hooks rules for Preact instead of eslint-config-preact", () => {
    const model = applied("eslint", "ts", "preact");
    expect(model.files.get("eslint.config.js")).toContain(
      "reactHooks.configs.flat.recommended",
    );
    expect(model.pkg.devDependencies.has("eslint-config-preact")).toBe(false);
  });

  it("writes eslint.config.ts with jiti for Vue TS", () => {
    const model = applied("eslint", "ts", "vue");
    expect(model.files.get("eslint.config.ts")).toContain(
      "defineConfigWithVueTs(",
    );
    expect(model.pkg.devDependencies.has("jiti")).toBe(true);
  });

  it("follows create-next-app for Next.js", () => {
    const model = applied("eslint", "ts", "next");
    const config = model.files.get("eslint.config.mjs") ?? "";
    expect(config).toContain("...nextVitals,");
    expect(config).toContain("...nextTs,");
    expect([...model.pkg.devDependencies]).toEqual(
      expect.arrayContaining(["eslint", "eslint-config-next"]),
    );
    expect(knownGoodVersion("eslint", "next")).toMatch(/^\^9\./);
  });

  it("registers @nuxt/eslint and extends the generated config", () => {
    const model = applied("eslint", "js", "nuxt");
    expect(model.bundler.modules).toContain("@nuxt/eslint");
    expect(model.files.get("eslint.config.mjs")).toContain(
      'import withNuxt from "./.nuxt/eslint.config.mjs";',
    );
    expect(model.pkg.devDependencies.has("typescript")).toBe(true);
  });

  it("uses non-type-checked rules for Svelte and SvelteKit", () => {
    for (const framework of ["svelte", "sveltekit"] as const) {
      const config =
        applied("eslint", "ts", framework).files.get("eslint.config.js") ?? "";
      expect(config).toContain("ts.configs.recommended,");
      expect(config).not.toContain("recommendedTypeChecked");
    }
    expect(
      applied("eslint", "ts", "sveltekit").files.get("eslint.config.js"),
    ).toContain("includeIgnoreFile(gitignorePath)");
  });

  it("allows SvelteKit's JSON-LD {@html} only when ESLint is selected", () => {
    const withLint = rendered("ts", "sveltekit", ["seo", "eslint"]);
    expect(withLint.files.get("src/routes/+layout.svelte")).toContain(
      "<!-- eslint-disable-next-line svelte/no-at-html-tags -->",
    );
    const without = rendered("ts", "sveltekit", ["seo"]);
    expect(without.files.get("src/routes/+layout.svelte")).not.toContain(
      "eslint-disable",
    );
  });

  it("wires ng lint into angular.json", () => {
    const model = rendered("ts", "angular");
    const angularJson = JSON.parse(model.files.get("angular.json") ?? "{}") as {
      cli: { schematicCollections?: string[] };
      projects: Record<
        string,
        { architect: Record<string, { builder: string }> }
      >;
    };
    expect(model.pkg.scripts["lint"]).toBe("ng lint");
    expect(angularJson.cli.schematicCollections).toEqual(["angular-eslint"]);
    expect(angularJson.projects["my-app"]?.architect["lint"]?.builder).toBe(
      "@angular-eslint/builder:lint",
    );
  });

  it("leaves angular.json without a lint target when eslint is not selected", () => {
    const model = rendered("ts", "angular", []);
    expect(model.files.get("angular.json")).not.toContain("lint");
  });
});

describe("pinia", () => {
  it("adds a setup store, app.use(createPinia()) and the devtools peer", () => {
    const model = applied("pinia", "ts", "vue");
    expect([...model.pkg.dependencies]).toEqual(
      expect.arrayContaining(["pinia", "@vue/devtools-api"]),
    );
    expect(model.files.get("src/stores/counter.ts")).toContain(
      'defineStore("counter"',
    );
    expect(model.entry.appUses).toEqual(["createPinia()"]);
    expect(model.demo.counter?.increment).toBe("counter.increment()");
  });
});

describe("vue-router", () => {
  it("adds a router with an eager home view and a lazy about view", () => {
    const model = applied("vue-router", "js", "vue");
    const router = model.files.get("src/router/index.js") ?? "";
    expect(router).toContain('import HomeView from "../views/HomeView.vue";');
    expect(router).toContain(
      'component: () => import("../views/AboutView.vue")',
    );
    expect(model.entry.appUses).toEqual(["router"]);
    expect(model.routing?.outlet).toEqual(["<RouterView />"]);
  });
});

describe("vitest and testing-library", () => {
  function rendered(
    frameworkId: FrameworkId,
    ids: string[],
    language: "js" | "ts" = "ts",
  ): ProjectModel {
    const ctx = ctxFor(language, ids, frameworkId);
    const framework = getFramework(frameworkId);
    if (!framework) throw new Error(`missing ${frameworkId}`);
    const model = framework.base(ctx);
    for (const id of ids) getModule(id)?.apply(model, ctx);
    framework.render(model, ctx);
    return model;
  }

  it("adds a vite.config test block and a react-dom counter test", () => {
    const model = rendered("react", ["vitest"]);
    const config = model.files.get("vite.config.ts") ?? "";
    expect(config).toContain('/// <reference types="vitest/config" />');
    expect(config).toContain('environment: "jsdom"');
    expect(config).toContain('setupFiles: ["./src/test-setup.ts"]');
    expect(model.files.get("src/test-setup.ts")).toContain(
      "IS_REACT_ACT_ENVIRONMENT",
    );
    const test = model.files.get("src/components/Counter.test.tsx") ?? "";
    expect(test).toContain('from "react-dom/client"');
    expect(test).not.toContain("@testing-library");
    expect(model.pkg.scripts["test"]).toBe("vitest run");
    expect([...model.pkg.devDependencies]).toEqual(
      expect.arrayContaining(["vitest", "jsdom"]),
    );
  });

  it("switches the counter test to Testing Library queries", () => {
    const model = rendered("react", ["vitest", "testing-library"]);
    const test = model.files.get("src/components/Counter.test.tsx") ?? "";
    expect(test).toContain('screen.getByRole("button", { name: "+1" })');
    expect(test).toContain("toBeInTheDocument()");
    const setup = model.files.get("src/test-setup.ts") ?? "";
    expect(setup).toContain('import "@testing-library/jest-dom/vitest";');
    expect(setup).toContain("cleanup()");
    expect(setup).not.toContain("IS_REACT_ACT_ENVIRONMENT");
    expect([...model.pkg.devDependencies]).toEqual(
      expect.arrayContaining([
        "@testing-library/react",
        "@testing-library/dom",
        "@testing-library/user-event",
      ]),
    );
  });

  it("mounts the counter inside the store provider when Redux is selected", () => {
    const model = rendered("react", ["vitest", "redux-toolkit"]);
    const test = model.files.get("src/components/Counter.test.tsx") ?? "";
    expect(test).toContain('import { store } from "../store";');
    expect(test).toContain("<Provider store={store}>");
  });

  it("installs Pinia when mounting the Vue counter", () => {
    const model = rendered("vue", ["vitest", "pinia"]);
    const test =
      model.files.get("src/components/__tests__/CounterCard.spec.ts") ?? "";
    expect(test).toContain("global: { plugins: [createPinia()] }");
    expect(model.files.get("vitest.config.ts")).toContain("mergeConfig");
    expect(model.files.get("tsconfig.json")).toContain("tsconfig.vitest.json");
  });

  it("uses the Svelte browser build without Testing Library's plugin", () => {
    const plain = rendered("svelte", ["vitest"]);
    expect(plain.files.get("vite.config.ts")).toContain(
      'conditions: ["browser"]',
    );
    const library = rendered("svelte", ["vitest", "testing-library"]);
    const config = library.files.get("vite.config.ts") ?? "";
    expect(config).toContain("svelteTesting()");
    expect(config).not.toContain("conditions");
  });

  it("writes framework-specific setups for the meta-frameworks", () => {
    expect(
      rendered("next", ["vitest"]).files.get("vitest.config.mts"),
    ).toContain("tsconfigPaths: true");
    expect(
      rendered("next", ["vitest"], "js").files.get("vitest.config.mjs"),
    ).toContain('"@": fileURLToPath');
    expect(
      rendered("nuxt", ["vitest"]).files.get("vitest.config.ts"),
    ).toContain("defineVitestProject");
    expect(
      rendered("sveltekit", ["vitest"]).files.get("vite.config.ts"),
    ).toContain('name: "client"');
    expect(
      rendered("astro", ["vitest"]).files.get("vitest.config.ts"),
    ).toContain("getViteConfig");
  });

  it("wires Angular's unit-test builder and spec tsconfig", () => {
    const model = rendered("angular", ["vitest", "testing-library"]);
    const angular = model.files.get("angular.json") ?? "";
    expect(angular).toContain("@angular/build:unit-test");
    expect(angular).toContain("src/test-setup.ts");
    expect(model.files.get("tsconfig.spec.json")).toContain("vitest/globals");
    expect(model.files.get("tsconfig.app.json")).toContain("src/test-setup.ts");
    expect(model.pkg.scripts["test"]).toBe("ng test --watch=false");
    expect(
      model.files.get("src/app/components/counter/counter.spec.ts"),
    ).toContain('from "@testing-library/angular"');
  });

  it("has a known-good version for every dev dependency it adds", () => {
    const frameworks: FrameworkId[] = [
      "react",
      "preact",
      "solid",
      "svelte",
      "vue",
      "next",
      "nuxt",
      "angular",
    ];
    for (const framework of frameworks) {
      const model = rendered(framework, ["vitest", "testing-library"]);
      for (const dep of model.pkg.devDependencies) {
        expect(knownGoodVersion(dep, framework), dep).toBeTruthy();
      }
    }
  });
});

describe("biome", () => {
  function rendered(
    frameworkId: FrameworkId,
    ids: string[],
    language: "js" | "ts" = "ts",
  ): ProjectModel {
    const ctx = ctxFor(language, ids, frameworkId);
    const framework = getFramework(frameworkId);
    if (!framework) throw new Error(`missing ${frameworkId}`);
    const model = framework.base(ctx);
    for (const id of ids) getModule(id)?.apply(model, ctx);
    framework.render(model, ctx);
    return model;
  }
  const config = (model: ProjectModel) =>
    JSON.parse(model.files.get("biome.json") ?? "{}") as Record<
      string,
      unknown
    >;

  it("writes biome.json pinned to the installed version with Prettier-like spacing", () => {
    const model = rendered("react", ["biome"]);
    const biome = config(model);
    expect(biome["$schema"]).toBe(
      `https://biomejs.dev/schemas/${knownGoodVersion("@biomejs/biome", "react")}/schema.json`,
    );
    expect(biome["formatter"]).toMatchObject({ indentStyle: "space" });
    expect(biome["vcs"]).toMatchObject({ useIgnoreFile: true });
    expect(biome["html"]).toBeUndefined();
    expect(model.pkg.scripts["check"]).toBe("biome check");
    expect(model.formatter).toBe("biome");
  });

  it("enables full HTML support for single-file components", () => {
    expect(config(rendered("vue", ["biome"]))["html"]).toMatchObject({
      experimentalFullSupportEnabled: true,
      formatter: { selfCloseVoidElements: "always" },
    });
    expect(config(rendered("svelte", ["biome"]))["html"]).toMatchObject({
      formatter: { indentScriptAndStyle: true },
    });
    expect(config(rendered("angular", ["biome"]))["html"]).toBeUndefined();
  });

  it("accepts Tailwind directives when Tailwind is selected", () => {
    expect(config(rendered("react", ["biome", "tailwind"]))["css"]).toEqual({
      parser: { tailwindDirectives: true },
    });
  });

  it("suppresses the JSON-LD innerHTML rule in Next with a reason", () => {
    const layout =
      rendered("next", ["biome", "seo"]).files.get("app/layout.tsx") ?? "";
    expect(layout).toContain(
      "// biome-ignore lint/security/noDangerouslySetInnerHtml:",
    );
  });

  it("prints Astro markup the way Biome formats it", () => {
    const counter =
      rendered("astro", ["biome"]).files.get("src/components/Counter.astro") ??
      "";
    expect(counter).toContain(
      '<button type="button" class="btn" data-step="1">+1</button>',
    );
  });
});

describe("husky-lint-staged", () => {
  function model(frameworkId: FrameworkId, ids: string[]): ProjectModel {
    const ctx = ctxFor("ts", ids, frameworkId);
    const framework = getFramework(frameworkId);
    if (!framework) throw new Error(`missing ${frameworkId}`);
    const result = framework.base(ctx);
    for (const id of ids) getModule(id)?.apply(result, ctx);
    return result;
  }

  it("adds the hook, the prepare script and a lint-staged config", () => {
    const result = model("react", ["eslint", "prettier", "husky-lint-staged"]);
    expect(result.files.get(".husky/pre-commit")).toBe("lint-staged\n");
    expect(result.pkg.scripts["prepare"]).toBe("husky");
    expect(result.pkg.fields["lint-staged"]).toEqual({
      "*.{js,jsx,ts,tsx,mjs,cjs}": ["eslint --fix", "prettier --write"],
      "!(*.{js,jsx,ts,tsx,mjs,cjs})": "prettier --ignore-unknown --write",
    });
  });

  it("runs only the selected tool", () => {
    expect(
      model("vue", ["eslint", "husky-lint-staged"]).pkg.fields["lint-staged"],
    ).toEqual({ "*.{js,jsx,ts,tsx,mjs,cjs,vue}": "eslint --fix" });
    expect(
      model("react", ["prettier", "husky-lint-staged"]).pkg.fields[
        "lint-staged"
      ],
    ).toEqual({ "*": "prettier --ignore-unknown --write" });
    expect(
      model("react", ["biome", "husky-lint-staged"]).pkg.fields["lint-staged"],
    ).toEqual({
      "*": "biome check --write --no-errors-on-unmatched --files-ignore-unknown=true",
    });
  });

  it("keeps SvelteKit's prepare step", () => {
    expect(
      model("sveltekit", ["prettier", "husky-lint-staged"]).pkg.scripts[
        "prepare"
      ],
    ).toBe("svelte-kit sync || echo '' && husky");
  });
});

describe("sass", () => {
  function rendered(frameworkId: FrameworkId, ids: string[]): ProjectModel {
    const ctx = ctxFor("ts", ids, frameworkId);
    const framework = getFramework(frameworkId);
    if (!framework) throw new Error(`missing ${frameworkId}`);
    const model = framework.base(ctx);
    for (const id of ids) getModule(id)?.apply(model, ctx);
    framework.render(model, ctx);
    return model;
  }

  it("turns the global stylesheet into SCSS and imports it", () => {
    const model = rendered("react", ["sass"]);
    expect(model.files.has("src/index.css")).toBe(false);
    expect(model.files.get("src/index.scss")).toContain("&:hover");
    expect(model.files.get("src/main.tsx")).toContain('import "./index.scss";');
    expect(model.pkg.devDependencies.has("sass")).toBe(true);
  });

  it("points framework configs at the SCSS file", () => {
    expect(rendered("nuxt", ["sass"]).files.get("nuxt.config.ts")).toContain(
      "~/assets/css/main.scss",
    );
    const angular = rendered("angular", ["sass"]);
    const json = angular.files.get("angular.json") ?? "";
    expect(json).toContain("src/styles.scss");
    expect(json).toContain('"inlineStyleLanguage": "scss"');
    // Angular's builder ships Sass.
    expect(angular.pkg.devDependencies.has("sass")).toBe(false);
  });

  it("keeps Tailwind's entry as CSS and warns", () => {
    const model = rendered("react", ["sass", "tailwind"]);
    expect(model.files.get("src/index.css")).toContain(
      '@import "tailwindcss";',
    );
    expect(model.files.has("src/index.scss")).toBe(false);
    expect(model.warnings.some((w) => w.includes("Tailwind"))).toBe(true);
  });
});
