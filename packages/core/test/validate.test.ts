import { describe, expect, it } from "vitest";
import {
  blockerFor,
  getModule,
  resolve,
  toProjectName,
  validate,
} from "../src";
import { sortModules } from "../src/engine/resolve";
import type { FrameworkId, Module } from "../src";
import { fakeModule, selection } from "./helpers";

function lookupOf(mods: Module[]) {
  const map = new Map(mods.map((m) => [m.id, m]));
  return (id: string) => map.get(id);
}

describe("validate", () => {
  it("accepts every prototype module together (one per single-select category)", () => {
    const result = validate(
      selection({
        modules: [
          "tailwind",
          "redux-toolkit",
          "react-router",
          "axios",
          "prettier",
        ],
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("rejects invalid project names", () => {
    const result = validate(selection({ name: "My App" }));
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors.map((e) => e.code)).toEqual(["invalid-name"]);
  });

  it("rejects frameworks without an adapter", () => {
    const result = validate(selection({ framework: "ember" as FrameworkId }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]?.code).toBe("unknown-framework");
  });

  it("rejects unknown modules", () => {
    const result = validate(selection({ modules: ["nope"] }));
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors[0]).toMatchObject({
        code: "unknown-module",
        moduleId: "nope",
      });
  });

  it("allows only one state library", () => {
    const result = validate(
      selection({ modules: ["redux-toolkit", "zustand"] }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual([
        expect.objectContaining({
          code: "single-category",
          moduleId: "redux-toolkit",
          otherId: "zustand",
        }),
      ]);
    }
  });

  it("rejects modules not available for the framework", () => {
    const vueOnly = fakeModule({ id: "pinia", frameworks: ["vue"] });
    const result = validate(
      selection({ modules: ["pinia"] }),
      lookupOf([vueOnly]),
    );
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors[0]).toMatchObject({
        code: "framework-mismatch",
        moduleId: "pinia",
      });
  });

  it("rejects modules not available for the language", () => {
    const tsOnly = fakeModule({ id: "shadcn", languages: ["ts"] });
    const result = validate(
      selection({ language: "js", modules: ["shadcn"] }),
      lookupOf([tsOnly]),
    );
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors[0]).toMatchObject({ code: "language-mismatch" });
  });

  it("reports conflicts declared on either side, including via requires", () => {
    const mods = [
      fakeModule({ id: "a", requires: ["b"] }),
      fakeModule({ id: "b" }),
      fakeModule({ id: "c", conflicts: ["b"] }),
    ];
    const result = validate(selection({ modules: ["a", "c"] }), lookupOf(mods));
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors[0]).toMatchObject({ code: "conflict" });
  });

  it("checks real module conflicts against the registry", () => {
    for (const id of ["tailwind", "prettier", "eslint"]) {
      const mod = getModule(id);
      expect(mod?.conflicts?.length).toBeGreaterThan(0);
    }
  });

  it("accepts eslint with prettier on every framework", () => {
    const all: FrameworkId[] = [
      "react",
      "vue",
      "svelte",
      "solid",
      "preact",
      "angular",
      "next",
      "nuxt",
      "sveltekit",
      "astro",
    ];
    for (const framework of all) {
      const result = validate(
        selection({ framework, modules: ["eslint", "prettier"] }),
      );
      expect(result.ok).toBe(true);
    }
  });
});

describe("biome", () => {
  it("conflicts with ESLint and Prettier", () => {
    for (const other of ["eslint", "prettier"]) {
      const result = validate(selection({ modules: ["biome", other] }));
      expect(result.ok).toBe(false);
      if (!result.ok)
        expect(result.errors[0]).toMatchObject({ code: "conflict" });
    }
  });
});

describe("husky-lint-staged", () => {
  it("needs ESLint, Prettier or Biome to run", () => {
    const alone = validate(selection({ modules: ["husky-lint-staged"] }));
    expect(alone.ok).toBe(false);
    if (!alone.ok)
      expect(alone.errors[0]).toMatchObject({ code: "missing-one-of" });
    for (const tool of ["eslint", "prettier", "biome"]) {
      expect(
        validate(selection({ modules: ["husky-lint-staged", tool] })).ok,
      ).toBe(true);
    }
  });
});

describe("testing modules", () => {
  it("auto-adds vitest for testing-library and applies it first", () => {
    const result = resolve(["testing-library"]);
    expect(result.autoAdded).toEqual(["vitest"]);
    expect(result.modules.map((m) => m.id)).toEqual([
      "vitest",
      "testing-library",
    ]);
  });

  it("offers testing-library only where a binding exists", () => {
    for (const framework of ["sveltekit", "astro"] as const) {
      const result = validate(
        selection({ framework, modules: ["vitest", "testing-library"] }),
      );
      expect(result.ok).toBe(false);
      if (!result.ok)
        expect(result.errors[0]).toMatchObject({
          code: "framework-mismatch",
          moduleId: "testing-library",
        });
    }
    expect(getModule("vitest")?.frameworks).toHaveLength(10);
  });
});

describe("resolve", () => {
  it("adds transitive requires and reports them as auto-added", () => {
    const mods = [
      fakeModule({ id: "superforms", requires: ["zod"] }),
      fakeModule({ id: "zod", requires: ["base"] }),
      fakeModule({ id: "base" }),
    ];
    const result = resolve(["superforms"], lookupOf(mods));
    expect(result.autoAdded).toEqual(["base", "zod"]);
    expect(result.modules.map((m) => m.id)).toEqual([
      "base",
      "zod",
      "superforms",
    ]);
  });

  it("orders by category, then order, then id", () => {
    const mods = [
      fakeModule({ id: "z", category: "quality" }),
      fakeModule({ id: "router", category: "routing", order: 20 }),
      fakeModule({ id: "tw", category: "style" }),
      fakeModule({ id: "store", category: "state", order: 10 }),
    ];
    expect(sortModules(mods).map((m) => m.id)).toEqual([
      "tw",
      "store",
      "router",
      "z",
    ]);
  });

  it("throws on circular requires", () => {
    const mods = [
      fakeModule({ id: "a", requires: ["b"] }),
      fakeModule({ id: "b", requires: ["a"] }),
    ];
    expect(() => sortModules(mods)).toThrow(/Circular/);
  });
});

describe("blockerFor", () => {
  it("does not block replacing the single-select choice", () => {
    expect(
      blockerFor(selection({ modules: ["redux-toolkit"] }), "zustand"),
    ).toBeNull();
  });

  it("explains why a module cannot be added", () => {
    expect(blockerFor(selection(), "nope")).toMatchObject({
      code: "unknown-module",
      moduleId: "nope",
    });
  });

  it("returns null for modules that are already selected", () => {
    expect(blockerFor(selection({ modules: ["axios"] }), "axios")).toBeNull();
  });
});

describe("toProjectName", () => {
  it("slugifies input", () => {
    expect(toProjectName("  My Cool App!! ")).toBe("my-cool-app");
    expect(toProjectName("***")).toBe("my-app");
  });
});

describe("requiresOneOf", () => {
  const mods = [
    fakeModule({ id: "hooks", requiresOneOf: ["lint", "fmt"] }),
    fakeModule({ id: "lint" }),
    fakeModule({ id: "fmt" }),
  ];
  const lookup = (id: string) => mods.find((m) => m.id === id);

  it("fails when none of the alternatives is selected", () => {
    const result = validate(selection({ modules: ["hooks"] }), lookup);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors[0]).toMatchObject({
        code: "missing-one-of",
        moduleId: "hooks",
      });
  });

  it("passes with any one of them", () => {
    expect(validate(selection({ modules: ["hooks", "fmt"] }), lookup).ok).toBe(
      true,
    );
  });
});
