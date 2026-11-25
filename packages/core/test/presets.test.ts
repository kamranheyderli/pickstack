import { describe, expect, it } from "vitest";
import { generate, getModule, presets } from "../src";

describe("presets", () => {
  it("have unique ids", () => {
    expect(new Set(presets.map((p) => p.id)).size).toBe(presets.length);
  });

  it.each(presets.map((p) => [p.id, p] as const))(
    "%s generates without errors or warnings",
    async (_, preset) => {
      for (const id of preset.modules) expect(getModule(id)).toBeDefined();
      const result = await generate({
        name: "preset",
        framework: preset.framework,
        language: "ts",
        packageManager: "npm",
        modules: preset.modules,
      });
      if (!result.ok) throw new Error(JSON.stringify(result.errors));
      expect(result.warnings).toEqual([]);
    },
  );
});
