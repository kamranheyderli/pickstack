import { createCtx } from "../src/engine/generate";
import type { Ctx, FrameworkId, Language, Module, Selection } from "../src";

export function selection(overrides: Partial<Selection> = {}): Selection {
  return {
    name: "my-app",
    framework: "react",
    language: "ts",
    packageManager: "npm",
    modules: [],
    ...overrides,
  };
}

export function ctxFor(
  language: Language,
  modules: string[] = [],
  framework: FrameworkId = "react",
): Ctx {
  return createCtx(selection({ framework, language, modules }), modules);
}

export function fakeModule(
  overrides: Partial<Module> & { id: string },
): Module {
  return {
    name: overrides.id,
    category: "data",
    description: { az: "", en: "" },
    frameworks: "all",
    apply: () => {},
    ...overrides,
  };
}
