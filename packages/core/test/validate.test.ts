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
    for (const id of ["tailwind", "prettier"]) {
      const mod = getModule(id);
      expect(mod?.conflicts?.length).toBeGreaterThan(0);
    }
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
