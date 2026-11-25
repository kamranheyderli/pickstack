import { describe, expect, it } from "vitest";
import {
  generate,
  getFramework,
  getModule,
  knownGoodVersion,
  singleSelectCategories,
} from "../src";
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

describe("turborepo", () => {
  async function project(
    framework: FrameworkId,
    modules: string[],
    packageManager: "npm" | "pnpm" = "pnpm",
  ): Promise<Map<string, string>> {
    const result = await generate({
      name: "acme",
      framework,
      language: "ts",
      modules: ["turborepo", ...modules],
      packageManager,
    });
    if (!result.ok) throw new Error("generation failed");
    return result.files;
  }
  const parse = (files: Map<string, string>, path: string) =>
    JSON.parse(files.get(path) ?? "{}") as Record<string, unknown>;

  it("moves the app to apps/web and writes the workspace root", async () => {
    const files = await project("react", ["vitest"]);
    expect(files.has("apps/web/src/App.tsx")).toBe(true);
    expect(files.has("src/App.tsx")).toBe(false);
    expect(parse(files, "apps/web/package.json")["name"]).toBe("web");
    const root = parse(files, "package.json");
    expect(root["name"]).toBe("acme");
    expect(root["scripts"]).toEqual({
      build: "turbo run build",
      dev: "turbo run dev",
      typecheck: "turbo run typecheck",
      test: "turbo run test",
    });
    expect(root["devEngines"]).toEqual({
      packageManager: { name: "pnpm", version: "^10.0.0" },
    });
    expect(files.get("pnpm-workspace.yaml")).toContain('"apps/*"');
    expect(files.get(".gitignore")).toContain(".turbo");
    expect(files.has("apps/web/README.md")).toBe(false);
    expect(files.get("README.md")).toContain("## Monorepo");
  });

  it("declares npm workspaces in package.json", async () => {
    const files = await project("react", [], "npm");
    expect(parse(files, "package.json")["workspaces"]).toEqual([
      "apps/*",
      "packages/*",
    ]);
    expect(files.has("pnpm-workspace.yaml")).toBe(false);
  });

  it("caches framework outputs and orders Next's typecheck after build", async () => {
    const turbo = parse(await project("next", []), "turbo.json") as {
      tasks: Record<string, Record<string, unknown>>;
    };
    expect(turbo.tasks["build"]?.["outputs"]).toEqual([
      ".next/**",
      "!.next/cache/**",
      "!.next/dev/**",
    ]);
    expect(turbo.tasks["typecheck"]?.["dependsOn"]).toEqual([
      "^typecheck",
      "build",
    ]);
  });

  it("passes build-time env vars that strict env mode would drop", async () => {
    const turbo = parse(await project("astro", ["seo"]), "turbo.json") as {
      tasks: Record<string, Record<string, unknown>>;
    };
    expect(turbo.tasks["build"]?.["env"]).toEqual(["SITE_URL"]);
  });
});

describe("module-federation", () => {
  async function project(
    modules: string[],
    language: "js" | "ts" = "ts",
  ): Promise<Map<string, string>> {
    const result = await generate({
      name: "acme",
      framework: "react",
      language,
      modules: ["module-federation", ...modules],
      packageManager: "pnpm",
    });
    if (!result.ok) throw new Error("generation failed");
    return result.files;
  }
  const pkgName = (files: Map<string, string>, path: string) =>
    (JSON.parse(files.get(path) ?? "{}") as { name?: string }).name;

  it("writes the host and the remote as two independent projects", async () => {
    const files = await project([]);
    expect(files.has("package.json")).toBe(false);
    expect(pkgName(files, "host/package.json")).toBe("acme-host");
    expect(pkgName(files, "remote/package.json")).toBe("acme-remote");
    expect(files.has("host/.gitignore")).toBe(true);
    expect(files.has("remote/.gitignore")).toBe(true);
    expect(files.get("README.md")).toContain("cd remote && pnpm install");
    const remote = files.get("remote/vite.config.ts") ?? "";
    expect(remote).toContain('"./Counter": "./src/Counter.tsx"');
    expect(remote).toContain("base: `${REMOTE_ORIGIN}/`");
    const host = files.get("host/vite.config.ts") ?? "";
    expect(host).toContain('entry: "http://localhost:5174/remoteEntry.js"');
    expect(host).toContain("strictPort: true");
    expect(files.get("host/src/remotes.d.ts")).toContain(
      'declare module "remote/Counter"',
    );
  });

  it("loads the remote counter lazily in the host page", async () => {
    const app = (await project([])).get("host/src/App.tsx") ?? "";
    expect(app).toContain(
      'const RemoteCounter = lazy(() => import("remote/Counter"));',
    );
    expect(app).toContain("<RemoteCounter />");
    const home =
      (await project(["react-router"])).get("host/src/pages/Home.tsx") ?? "";
    expect(home).toContain("<RemoteCounter />");
  });

  it("keeps per-project tooling such as git hooks in the host", async () => {
    const files = await project(["husky-lint-staged", "prettier"]);
    expect(files.get("host/.husky/pre-commit")).toBe("lint-staged\n");
  });

  it("writes a JS remote without TypeScript files", async () => {
    const files = await project([], "js");
    expect(files.has("remote/vite.config.js")).toBe(true);
    expect(files.has("remote/tsconfig.json")).toBe(false);
    expect(files.has("host/src/remotes.d.ts")).toBe(false);
  });
});

describe("shadcn-svelte", () => {
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

  it("vendors the components and draws the counter with them", () => {
    const model = rendered("svelte", ["tailwind", "shadcn-svelte"]);
    expect(model.files.has("src/lib/components/ui/button/button.svelte")).toBe(
      true,
    );
    expect(model.files.has("src/lib/components/ui/card/index.ts")).toBe(true);
    expect(model.files.get("src/lib/utils.ts")).toContain(
      'export { cn } from "cn";',
    );
    const counter = model.files.get("src/lib/Counter.svelte") ?? "";
    expect(counter).toContain(
      'import { Button } from "#lib/components/ui/button/index.js";',
    );
    expect(counter).toContain("<Button onclick={() => count++}>+1</Button>");
    // The SPA gets the same `#lib` alias SvelteKit uses.
    expect(model.pkg.fields["imports"]).toEqual({ "#lib/*": "./src/lib/*" });
    expect(model.files.get("src/app.css")).toContain(
      '@import "shadcn-svelte/tailwind.css";',
    );
  });

  it("writes JS components and components.json for JS projects", () => {
    const model = rendered("sveltekit", ["tailwind", "shadcn-svelte"], "js");
    expect(model.files.get("src/lib/utils.js")).toBe(
      'export { cn } from "cn";\n',
    );
    expect(model.files.has("src/lib/components/ui/card/index.js")).toBe(true);
    const config = JSON.parse(model.files.get("components.json") ?? "{}") as {
      typescript: boolean;
      tailwind: { css: string };
    };
    expect(config.typescript).toBe(false);
    expect(config.tailwind.css).toBe("src/routes/layout.css");
  });
});

describe("angular-material", () => {
  function rendered(ids: string[]): ProjectModel {
    const ctx = ctxFor("ts", ids, "angular");
    const framework = getFramework("angular");
    if (!framework) throw new Error("missing angular");
    const model = framework.base(ctx);
    for (const id of ids) getModule(id)?.apply(model, ctx);
    framework.render(model, ctx);
    return model;
  }

  it("adds the Material theme before the global stylesheet and the fonts", () => {
    const model = rendered(["angular-material"]);
    expect(model.files.get("src/material-theme.scss")).toContain(
      "@include mat.theme(",
    );
    const angular = JSON.parse(model.files.get("angular.json") ?? "{}") as {
      projects: Record<
        string,
        { architect: { build: { options: { styles: string[] } } } }
      >;
    };
    const app = Object.values(angular.projects)[0];
    expect(app?.architect.build.options.styles).toEqual([
      "src/material-theme.scss",
      "src/styles.css",
    ]);
    expect(model.files.get("src/index.html")).toContain("family=Roboto");
  });

  it("draws the counter with MatCard and MatButton", () => {
    const model = rendered(["angular-material", "builtin"]);
    const html =
      model.files.get("src/app/components/counter/counter.html") ?? "";
    expect(html).toContain('<mat-card appearance="outlined"');
    expect(html).toContain('matButton="filled"');
    const ts = model.files.get("src/app/components/counter/counter.ts") ?? "";
    expect(ts).toContain('from "@angular/material/card"');
    expect(ts).toContain("imports: [MatButton, MatCard,");
  });
});

describe("vue UI kits", () => {
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

  it("shadcn-vue vendors components and keeps the CLI's alias usable", () => {
    const model = rendered("vue", ["tailwind", "shadcn-vue"]);
    expect(model.files.has("src/components/ui/button/Button.vue")).toBe(true);
    expect(model.files.get("src/lib/utils.ts")).toBe(
      'export { cn } from "cn";\n',
    );
    expect(model.files.get("tsconfig.json")).toContain('"@/*"');
    expect(model.files.get("src/components/CounterCard.vue")).toContain(
      '<Button @click="count++">+1</Button>',
    );
  });

  it("shadcn-vue on Nuxt registers shadcn-nuxt and relies on auto-imports", () => {
    const model = rendered("nuxt", ["tailwind", "shadcn-vue"]);
    expect(model.files.get("nuxt.config.ts")).toContain('"shadcn-nuxt"');
    expect(model.files.get("app/components/CounterCard.vue")).not.toContain(
      "@/components/ui/button",
    );
  });

  it("PrimeVue uses the Aura preset, in a CSS layer when Tailwind is selected", () => {
    const vue = rendered("vue", ["primevue"]);
    expect(vue.files.get("src/main.ts")).toContain(
      "app.use(PrimeVue, { theme: { preset: Aura } });",
    );
    const tailwind = rendered("vue", ["tailwind", "primevue"]);
    expect(tailwind.files.get("src/main.ts")).toContain(
      'cssLayer: { name: "primevue"',
    );
    expect(tailwind.files.get("src/assets/main.css")).toContain(
      '@import "tailwindcss-primeui";',
    );
    const nuxt =
      rendered("nuxt", ["primevue"]).files.get("nuxt.config.ts") ?? "";
    expect(nuxt).toContain('import Aura from "@primeuix/themes/aura";');
    expect(nuxt).toContain("preset: Aura");
  });

  it("Vuetify wraps the app in v-app and auto-imports components", () => {
    const model = rendered("vue", ["vuetify"]);
    expect(model.files.get("src/App.vue")).toContain("<v-app>");
    expect(model.files.get("vite.config.ts")).toContain(
      "vuetify({ autoImport: true })",
    );
    expect(model.files.get("src/plugins/vuetify.ts")).toContain(
      'import "vuetify/styles";',
    );
    expect(rendered("vue", ["tailwind", "vuetify"]).warnings).toHaveLength(1);
  });
});

describe("react UI kits", () => {
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

  it("shadcn/ui gives Vite the @ alias and draws the counter with its components", () => {
    const ts = rendered("react", ["tailwind", "shadcn"]);
    expect(ts.files.get("tsconfig.json")).toContain('"@/*"');
    expect(ts.files.get("vite.config.ts")).toContain("tsconfigPaths: true");
    expect(ts.files.get("src/components/Counter.tsx")).toContain(
      'import { Button } from "@/components/ui/button";',
    );
    const js = rendered("react", ["tailwind", "shadcn"], "js");
    expect(js.files.get("jsconfig.json")).toContain('"@/*"');
    expect(js.files.get("vite.config.js")).toContain("fileURLToPath");
  });

  it("MUI wraps the app in its theme and, on Next, the App Router cache", () => {
    const layout = rendered("next", ["mui"]).files.get("app/layout.tsx") ?? "";
    expect(layout).toContain("<AppRouterCacheProvider>");
    expect(layout).toContain("<ThemeProvider theme={theme}>");
    expect(rendered("next", ["mui"]).files.get("theme.ts")).toContain(
      '"use client";',
    );
  });

  it("Chakra UI avoids react-redux's Provider name and marks Next's html", () => {
    const main =
      rendered("react", ["chakra-ui", "redux-toolkit"]).files.get(
        "src/main.tsx",
      ) ?? "";
    expect(main).toContain("Provider as ChakraUiProvider");
    expect(
      rendered("next", ["chakra-ui"]).files.get("app/layout.tsx"),
    ).toContain("suppressHydrationWarning");
  });

  it("Mantine registers its PostCSS preset and color scheme script", () => {
    const next = rendered("next", ["tailwind", "mantine"]);
    const postcss = next.files.get("postcss.config.mjs") ?? "";
    expect(postcss).toContain('"postcss-preset-mantine"');
    expect(postcss).toContain('"@tailwindcss/postcss"');
    expect(next.files.get("app/layout.tsx")).toContain("<ColorSchemeScript />");
    expect(next.files.get("app/globals.css")).toContain(
      '@import "@mantine/core/styles.layer.css";',
    );
  });
});

describe("AI agent modules", () => {
  async function project(
    modules: string[],
    framework: FrameworkId = "react",
  ): Promise<Map<string, string>> {
    const result = await generate({
      name: "acme",
      framework,
      language: "ts",
      modules,
      packageManager: "pnpm",
    });
    if (!result.ok) throw new Error("generation failed");
    return result.files;
  }

  it("claude-code adds AGENTS.md and a CLAUDE.md that imports it", async () => {
    const files = await project(["claude-code", "eslint", "vitest"]);
    expect(files.get("AGENTS.md")).toContain("`pnpm test`: run the tests once");
    const claude = files.get("CLAUDE.md") ?? "";
    expect(claude.startsWith("@AGENTS.md")).toBe(true);
    expect(claude).toContain("`pnpm lint`, `pnpm typecheck`, `pnpm test`");
  });

  it("allows the project's scripts, not its servers, and keeps .env unreadable", async () => {
    const settings = JSON.parse(
      (await project(["claude-code", "prettier"])).get(
        ".claude/settings.json",
      ) ?? "{}",
    ) as {
      permissions: { allow: string[]; deny: string[] };
      hooks?: unknown;
    };
    expect(settings.permissions.allow).toContain("Bash(pnpm build *)");
    expect(settings.permissions.allow).not.toContain("Bash(pnpm dev *)");
    expect(settings.permissions.deny).toContain("Read(./.env)");
    expect(settings.hooks).toBeDefined();
  });

  it("adds no format hook without a formatter", async () => {
    const files = await project(["claude-code"]);
    expect(files.has(".claude/hooks/format.mjs")).toBe(false);
    expect(files.get(".claude/settings.json")).not.toContain("PostToolUse");
  });

  it("picks the stack's official MCP servers", async () => {
    const next = JSON.parse(
      (await project(["claude-code", "tailwind", "shadcn"], "next")).get(
        ".mcp.json",
      ) ?? "{}",
    ) as { mcpServers: Record<string, unknown> };
    expect(Object.keys(next.mcpServers)).toEqual(["next-devtools", "shadcn"]);
    // React has no official MCP server.
    expect((await project(["claude-code"])).has(".mcp.json")).toBe(false);
  });

  it("keeps agent files at the root of a Turborepo workspace", async () => {
    const files = await project(["claude-code", "turborepo"]);
    expect(files.has("CLAUDE.md")).toBe(true);
    expect(files.has("apps/web/CLAUDE.md")).toBe(false);
    expect(files.get(".gitignore")).toContain(".claude/settings.local.json");
  });

  it("writes Cursor and Copilot files that point at AGENTS.md", async () => {
    const files = await project(["cursor", "copilot"], "angular");
    expect(files.get(".cursor/rules/angular.mdc")).toContain(
      'globs: "src/**/*.{ts,html}"',
    );
    expect(files.get(".github/copilot-instructions.md")).toContain("AGENTS.md");
    const vscode = JSON.parse(files.get(".vscode/mcp.json") ?? "{}") as {
      servers: Record<string, { type: string }>;
    };
    expect(vscode.servers["angular-cli"]?.type).toBe("stdio");
  });
});

describe("tanstack-router", () => {
  async function project(
    framework: FrameworkId,
    language: "js" | "ts",
    modules: string[] = [],
  ): Promise<Map<string, string>> {
    const result = await generate({
      name: "acme",
      framework,
      language,
      modules: ["tanstack-router", ...modules],
      packageManager: "pnpm",
    });
    if (!result.ok) throw new Error("generation failed");
    return result.files;
  }

  it("writes file routes and registers the router in the entry", async () => {
    const files = await project("react", "ts");
    expect(files.has("src/App.tsx")).toBe(false);
    expect(files.get("src/routes/index.tsx")).toContain(
      'export const Route = createFileRoute("/")({',
    );
    const main = files.get("src/main.tsx") ?? "";
    expect(main).toContain("<RouterProvider router={router} />");
    expect(main).toContain('declare module "@tanstack/react-router"');
    expect(files.get("vite.config.ts")).toMatch(
      /plugins: \[\s*tanstackRouter\(.*\),\s*react\(\)/s,
    );
  });

  it("emits the route tree as the plugin prints it, unformatted", async () => {
    const tree =
      (await project("react", "ts")).get("src/routeTree.gen.ts") ?? "";
    expect(tree).toContain(
      "import { Route as IndexRouteImport } from './routes/index'",
    );
    expect(tree).toContain("._addFileTypes<FileRouteTypes>()");
    const js = (await project("solid", "js")).get("src/routeTree.gen.js") ?? "";
    expect(js).not.toContain("interface");
    expect(js).not.toContain("as any");
  });

  it("keeps the route tree out of the linter and formatter", async () => {
    const files = await project("react", "ts", ["eslint", "prettier"]);
    expect(files.get("eslint.config.js")).toContain('"src/routeTree.gen.ts"');
    expect(files.get(".prettierignore")).toContain("src/routeTree.gen.ts");
    const biome = await project("solid", "ts", ["biome"]);
    expect(biome.get("biome.json")).toContain('"!src/routeTree.gen.ts"');
  });
});

describe("tanstack-query", () => {
  async function project(
    framework: FrameworkId,
    modules: string[] = [],
  ): Promise<Map<string, string>> {
    const result = await generate({
      name: "acme",
      framework,
      language: "ts",
      modules: ["tanstack-query", ...modules],
      packageManager: "pnpm",
    });
    if (!result.ok) throw new Error("generation failed");
    return result.files;
  }

  it("serves the stack as JSON and shows it under the counter", async () => {
    const files = await project("react");
    expect(JSON.parse(files.get("public/stack.json") ?? "[]")).toContain(
      "TanStack Query",
    );
    expect(files.get("src/App.tsx")).toContain("<StackList />");
    expect(files.get("src/main.tsx")).toContain(
      "<QueryClientProvider client={queryClient}>",
    );
    expect(files.get("src/components/StackList.tsx")).toContain(
      'useQuery({ queryKey: ["stack"], queryFn: fetchStack })',
    );
  });

  it("wires the client the way each framework expects", async () => {
    expect((await project("vue")).get("src/main.ts")).toContain(
      "app.use(VueQueryPlugin);",
    );
    expect((await project("svelte")).get("src/App.svelte")).toContain(
      "<QueryClientProvider client={queryClient}>",
    );
    const angular = await project("angular");
    expect(angular.get("src/app/app.config.ts")).toContain(
      "provideTanStackQuery(() => new QueryClient())",
    );
    expect(angular.get("src/app/pages/home/home.html")).toContain(
      "<app-stack-list />",
    );
  });
});

describe("repository files", () => {
  async function project(
    modules: string[],
    packageManager: "npm" | "pnpm" | "bun" = "pnpm",
  ): Promise<Map<string, string>> {
    const result = await generate({
      name: "acme",
      framework: "react",
      language: "ts",
      modules,
      packageManager,
      year: 2030,
    });
    if (!result.ok) throw new Error("generation failed");
    return result.files;
  }

  it("CI runs the project's own checks with the chosen package manager", async () => {
    const ci =
      (await project(["github-actions", "eslint", "vitest"])).get(
        ".github/workflows/ci.yml",
      ) ?? "";
    expect(ci).toContain("uses: pnpm/action-setup@v6");
    expect(ci).toContain("- run: pnpm lint");
    expect(ci).toContain("- run: pnpm test");
    expect(ci.indexOf("pnpm lint")).toBeLessThan(ci.indexOf("pnpm build"));
    const bun = (await project(["github-actions"], "bun")).get(
      ".github/workflows/ci.yml",
    );
    expect(bun).toContain("oven-sh/setup-bun@v2");
    expect(bun).toContain("- run: bun install");
  });

  it("CI in a Turborepo runs only the tasks the root exposes", async () => {
    const files = await project(["github-actions", "turborepo", "prettier"]);
    const ci = files.get(".github/workflows/ci.yml") ?? "";
    expect(ci).toContain("- run: pnpm build");
    expect(ci).not.toContain("format:check");
    expect(files.has("apps/web/.github/workflows/ci.yml")).toBe(false);
  });

  it("writes the MIT license and .editorconfig", async () => {
    const files = await project(["license", "editorconfig"]);
    expect(files.get("LICENSE")).toContain("Copyright (c) 2030 acme authors");
    expect(JSON.parse(files.get("package.json") ?? "{}").license).toBe("MIT");
    expect(files.get(".editorconfig")).toContain("indent_size = 2");
  });
});

describe("deploy", () => {
  async function project(
    framework: FrameworkId,
    modules: string[],
    packageManager: "npm" | "pnpm" | "yarn" | "bun" = "pnpm",
  ): Promise<Map<string, string>> {
    const result = await generate({
      name: "acme",
      framework,
      language: "ts",
      modules,
      packageManager,
    });
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    return result.files;
  }

  it("Vercel needs a rewrite only for a Vite SPA with client-side routes", async () => {
    expect((await project("react", ["vercel"])).has("vercel.json")).toBe(false);
    const routed = await project("react", ["vercel", "react-router"]);
    expect(JSON.parse(routed.get("vercel.json") ?? "")).toMatchObject({
      rewrites: [{ source: "/(.*)", destination: "/index.html" }],
    });
    // Angular's and the meta-frameworks' presets handle routing themselves.
    for (const fw of ["angular", "next", "sveltekit", "astro"] as const)
      expect((await project(fw, ["vercel"])).has("vercel.json")).toBe(false);
  });

  it("Netlify builds with the package manager and publishes the right folder", async () => {
    const angular = (await project("angular", ["netlify"], "bun")).get(
      "netlify.toml",
    );
    expect(angular).toContain('command = "bun run build"');
    expect(angular).toContain('publish = "dist/acme/browser"');
    expect(angular).toContain('to = "/index.html"');
    const kit = (await project("sveltekit", ["netlify"])).get("netlify.toml");
    expect(kit).toContain('publish = "build"');
    expect(kit).not.toContain("redirects");
    expect((await project("next", ["netlify"])).has("netlify.toml")).toBe(
      false,
    );
  });

  it("Cloudflare serves the build as static assets", async () => {
    const files = await project("vue", ["cloudflare"], "npm");
    const config = JSON.parse(files.get("wrangler.json") ?? "");
    expect(config).toMatchObject({
      name: "acme",
      assets: {
        directory: "./dist/",
        not_found_handling: "single-page-application",
      },
    });
    const pkg = JSON.parse(files.get("package.json") ?? "");
    expect(pkg.scripts.deploy).toBe("npm run build && wrangler deploy");
    expect(pkg.devDependencies.wrangler).toBe(
      knownGoodVersion("wrangler", "vue"),
    );
    expect(files.get(".gitignore")).toContain(".wrangler");
    const astro = JSON.parse(
      (await project("astro", ["cloudflare"])).get("wrangler.json") ?? "",
    );
    expect(astro.assets.not_found_handling).toBe("404-page");
    expect(getModule("cloudflare")?.frameworks).not.toContain("next");
  });

  it("Docker serves static builds with nginx and runs Next standalone", async () => {
    const react = await project("react", ["docker"], "yarn");
    expect(react.get("Dockerfile")).toContain("RUN yarn install");
    expect(react.get("Dockerfile")).toContain(
      "COPY --from=build /app/dist /usr/share/nginx/html",
    );
    expect(react.get("nginx.conf")).toContain(
      "try_files $uri $uri/ /index.html;",
    );
    const astro = await project("astro", ["docker"]);
    expect(astro.get("nginx.conf")).toContain(
      "try_files $uri $uri.html $uri/ =404;",
    );

    const next = await project("next", ["docker"], "bun");
    expect(next.get("next.config.ts")).toContain('output: "standalone"');
    expect(next.get("Dockerfile")).toContain("FROM oven/bun:1 AS build");
    expect(next.get("Dockerfile")).toContain('CMD ["node", "server.js"]');
    expect(next.has("nginx.conf")).toBe(false);
  });

  it("can't be combined with a workspace or micro-frontends", async () => {
    for (const id of ["vercel", "netlify", "cloudflare", "docker"]) {
      const result = await generate({
        name: "acme",
        framework: "react",
        language: "ts",
        packageManager: "pnpm",
        modules: [id, "turborepo"],
      });
      expect(result.ok).toBe(false);
    }
  });
});

describe("forms", () => {
  async function project(
    framework: FrameworkId,
    modules: string[],
    language: "js" | "ts" = "ts",
  ): Promise<Map<string, string>> {
    const result = await generate({
      name: "acme",
      framework,
      language,
      modules,
      packageManager: "npm",
    });
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    return result.files;
  }

  it("TanStack Form adds a validated signup form for every SPA", async () => {
    const paths: Record<string, string> = {
      react: "src/components/SignupForm.tsx",
      solid: "src/components/SignupForm.tsx",
      vue: "src/components/SignupForm.vue",
      svelte: "src/lib/SignupForm.svelte",
      angular: "src/app/components/signup-form/signup-form.ts",
    };
    for (const [fw, path] of Object.entries(paths)) {
      const files = await project(fw as FrameworkId, ["tanstack-form"]);
      expect(files.get(path)).toContain(
        'z.email("Enter a valid email address.")',
      );
      const pkg = JSON.parse(files.get("package.json") ?? "");
      expect(pkg.dependencies.zod).toBe(
        knownGoodVersion("zod", fw as FrameworkId),
      );
      expect(Object.keys(pkg.dependencies)).toContain(`@tanstack/${fw}-form`);
    }
  });

  it("React Hook Form types the form from the schema in TS only", async () => {
    const ts = await project("react", ["react-hook-form"]);
    expect(ts.get("src/components/SignupForm.tsx")).toContain(
      "useForm<z.infer<typeof schema>>",
    );
    const js = await project("react", ["react-hook-form"], "js");
    expect(js.get("src/components/SignupForm.jsx")).toContain("useForm({");
  });

  it("adds plain CSS for the form only without Tailwind", async () => {
    const plain = await project("react", ["react-hook-form"]);
    expect(plain.get("src/index.css")).toContain(".input {");
    const tw = await project("react", ["react-hook-form", "tailwind"]);
    expect(tw.get("src/index.css")).not.toContain(".input {");
  });

  it("allows one form library at a time", async () => {
    const result = await generate({
      name: "acme",
      framework: "react",
      language: "ts",
      packageManager: "npm",
      modules: ["tanstack-form", "react-hook-form"],
    });
    expect(result.ok).toBe(false);
  });
});

describe("pwa", () => {
  it("adds the Vite plugin, the icon and the head tags", async () => {
    const result = await generate({
      name: "shop",
      framework: "vue",
      language: "ts",
      packageManager: "npm",
      modules: ["pwa"],
    });
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    const config = result.files.get("vite.config.ts") ?? "";
    expect(config).toContain('import { VitePWA } from "vite-plugin-pwa";');
    expect(config).toContain('registerType: "autoUpdate"');
    expect(config).toContain('sizes: "any"');
    expect(result.files.get("public/pwa-icon.svg")).toContain(
      "<title>shop</title>",
    );
    expect(result.files.get("index.html")).toContain(
      '<link rel="icon" type="image/svg+xml" href="/pwa-icon.svg" />',
    );
    const pkg = JSON.parse(result.files.get("package.json") ?? "");
    expect(pkg.devDependencies["vite-plugin-pwa"]).toBe(
      knownGoodVersion("vite-plugin-pwa", "vue"),
    );
  });
});

describe("playwright", () => {
  async function project(framework: FrameworkId, modules: string[]) {
    const result = await generate({
      name: "acme",
      framework,
      language: "ts",
      packageManager: "pnpm",
      modules,
    });
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    return result.files;
  }

  it("starts the framework's dev server and stays out of Vitest", async () => {
    const files = await project("angular", ["playwright", "vitest"]);
    const config = files.get("playwright.config.ts") ?? "";
    expect(config).toContain('command: "pnpm dev"');
    expect(config).toContain('url: "http://localhost:4200"');
    expect(config).toContain('testMatch: "**/*.e2e.?(c|m)[jt]s"');
    expect(files.has("e2e/app.e2e.ts")).toBe(true);
    expect(files.get(".gitignore")).toContain("/playwright-report/");
    expect(
      JSON.parse(files.get("package.json") ?? "").scripts["test:e2e"],
    ).toBe("playwright test");
  });

  it("tests the About page only where the demo has one", async () => {
    const plain = (await project("react", ["playwright"])).get(
      "e2e/app.e2e.ts",
    );
    expect(plain).not.toContain("about");
    const routed = (await project("react", ["playwright", "react-router"])).get(
      "e2e/app.e2e.ts",
    );
    expect(routed).toContain('getByRole("link", { name: "About" })');
  });
});

describe("i18n", () => {
  async function project(framework: FrameworkId, modules: string[]) {
    const result = await generate({
      name: "acme",
      framework,
      language: "ts",
      packageManager: "npm",
      modules,
    });
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    return result.files;
  }

  it("react-i18next sets up i18next before the app renders", async () => {
    const files = await project("react", ["react-i18next"]);
    expect(files.get("src/main.tsx")).toContain('import "./i18n";');
    expect(files.get("src/i18n.ts")).toContain(
      'es: { translation: { greeting: "¡Hola! Elige un idioma." } },',
    );
    expect(files.get("src/components/LanguageSwitcher.tsx")).toContain(
      "i18n.changeLanguage(code)",
    );
  });

  it("vue-i18n is installed as a plugin in Composition API mode", async () => {
    const files = await project("vue", ["vue-i18n"]);
    expect(files.get("src/main.ts")).toContain(".use(i18n)");
    expect(files.get("src/i18n.ts")).toContain("legacy: false,");
  });

  it("is single-select", () => {
    expect(singleSelectCategories.has("i18n")).toBe(true);
  });
});

describe("storybook", () => {
  async function project(
    framework: FrameworkId,
    modules: string[],
    language: "js" | "ts" = "ts",
  ) {
    const result = await generate({
      name: "acme",
      framework,
      language,
      packageManager: "npm",
      modules,
    });
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    return result.files;
  }

  it("wraps the React counter story in the store provider", async () => {
    const files = await project("react", ["storybook", "redux-toolkit"]);
    expect(files.get(".storybook/main.ts")).toContain(
      'framework: "@storybook/react-vite"',
    );
    expect(files.get(".storybook/preview.ts")).toContain(
      'import "../src/index.css";',
    );
    const story = files.get("src/components/Counter.stories.tsx") ?? "";
    expect(story).toContain("<Provider store={store}>");
    expect(story).toContain("satisfies Meta<typeof Counter>");
  });

  it("installs the Vue plugins the counter needs in the preview", async () => {
    const files = await project("vue", ["storybook", "pinia"], "js");
    const preview = files.get(".storybook/preview.js") ?? "";
    expect(preview).toContain("app.use(createPinia());");
    expect(files.has("src/components/CounterCard.stories.js")).toBe(true);
  });

  it("keeps ESLint out of the static build", async () => {
    const files = await project("svelte", ["storybook", "eslint"]);
    expect(files.get("eslint.config.js")).toContain('"storybook-static"');
    expect(files.get(".gitignore")).toContain("storybook-static");
  });
});

describe("express", () => {
  async function project(
    language: "js" | "ts",
    framework: FrameworkId = "react",
  ) {
    const result = await generate({
      name: "acme",
      framework,
      language,
      packageManager: "pnpm",
      modules: ["express"],
    });
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    return result.files;
  }

  it("writes the app to web/ and the API to server/", async () => {
    const files = await project("ts");
    expect(files.has("web/package.json")).toBe(true);
    expect(files.has("package.json")).toBe(false);
    const pkg = JSON.parse(files.get("server/package.json") ?? "");
    expect(pkg.name).toBe("acme-server");
    expect(pkg.scripts.dev).toBe("tsx watch src/index.ts");
    expect(pkg.dependencies.express).toBe(knownGoodVersion("express", "react"));
    expect(files.get("server/src/index.ts")).toContain('from "./app.js"');
    expect(files.get("README.md")).toContain(
      "cd server && pnpm install && pnpm dev",
    );
  });

  it("runs plain Node with --watch in JS", async () => {
    const files = await project("js", "vue");
    const pkg = JSON.parse(files.get("server/package.json") ?? "");
    expect(pkg.scripts.dev).toBe("node --watch src/index.js");
    expect(pkg.devDependencies).toBeUndefined();
    expect(files.has("server/tsconfig.json")).toBe(false);
  });

  it("is offered for the SPAs only", () => {
    expect(getModule("express")?.frameworks).not.toContain("next");
  });

  it("proxies /api from the app and calls it from a widget", async () => {
    const react = await project("ts");
    expect(react.get("web/vite.config.ts")).toContain(
      'server: { proxy: { "/api": "http://localhost:3001" } },',
    );
    expect(react.get("web/src/components/ApiGreeting.tsx")).toContain(
      'fetch("/api/hello?name=acme")',
    );
    const angular = await project("ts", "angular");
    expect(JSON.parse(angular.get("web/proxy.conf.json") ?? "")).toEqual({
      "/api": { target: "http://localhost:3001", secure: false },
    });
    expect(angular.get("web/angular.json")).toContain(
      '"proxyConfig": "proxy.conf.json"',
    );
  });
});

describe("nestjs", () => {
  async function project(framework: FrameworkId = "react") {
    const result = await generate({
      name: "acme",
      framework,
      language: "ts",
      packageManager: "npm",
      modules: ["nestjs"],
    });
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    return result.files;
  }

  it("writes the starter's layout to server/ with an /api prefix", async () => {
    const files = await project();
    const pkg = JSON.parse(files.get("server/package.json") ?? "");
    expect(pkg.scripts.dev).toBe("nest start --watch");
    expect(pkg.dependencies["@nestjs/core"]).toBe(
      knownGoodVersion("@nestjs/core", "react"),
    );
    expect(files.get("server/src/main.ts")).toContain(
      'app.setGlobalPrefix("api");',
    );
    expect(files.get("server/src/app.controller.ts")).toContain(
      '@Get("hello")',
    );
    expect(files.has("server/nest-cli.json")).toBe(true);
    expect(files.has("server/src/app.ts")).toBe(false);
    expect(files.get("web/vite.config.ts")).toContain(
      '"/api": "http://localhost:3001"',
    );
  });

  it("is TypeScript only and excludes Express", async () => {
    const js = await generate({
      name: "acme",
      framework: "react",
      language: "js",
      packageManager: "npm",
      modules: ["nestjs"],
    });
    expect(js.ok).toBe(false);
    const both = await generate({
      name: "acme",
      framework: "react",
      language: "ts",
      packageManager: "npm",
      modules: ["nestjs", "express"],
    });
    expect(both.ok).toBe(false);
  });
});

describe("mongodb", () => {
  it("connects before listening and adds todo routes and docker-compose", async () => {
    const result = await generate({
      name: "acme",
      framework: "react",
      language: "ts",
      packageManager: "npm",
      modules: ["mongodb"],
    });
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    expect(result.autoAdded).toContain("express");
    const files = result.files;
    const index = files.get("server/src/index.ts") ?? "";
    expect(index).toContain(
      'await connectDb(process.env.MONGODB_URI ?? "mongodb://localhost:27017/acme");',
    );
    expect(index.indexOf("connectDb(")).toBeLessThan(
      index.indexOf("app.listen"),
    );
    expect(files.get("server/src/app.ts")).toContain('app.post("/api/todos"');
    expect(files.get("server/.env.example")).toContain(
      "MONGODB_URI=mongodb://localhost:27017/acme",
    );
    expect(files.get("docker-compose.yml")).toContain("image: mongo:8");
    expect(
      JSON.parse(files.get("server/package.json") ?? "").dependencies.mongoose,
    ).toBe(knownGoodVersion("mongoose", "react"));
    expect(files.get("README.md")).toContain("docker compose up -d");
  });
});
