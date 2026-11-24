import { describe, expect, it } from "vitest";
import { getFramework, getModule } from "../src";
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
