import { describe, expect, it } from "vitest";
import type { Selection } from "@stackforge/core";
import {
  chooseSingle,
  groupOptions,
  pruneIncompatible,
  toggleModule,
} from "../src/state/selection";

const base: Selection = {
  name: "app",
  framework: "react",
  language: "ts",
  packageManager: "npm",
  modules: ["redux-toolkit"],
};

describe("selection", () => {
  it("replaces the choice in single-select categories", () => {
    expect(toggleModule(base, "zustand").modules).toEqual(["zustand"]);
    expect(chooseSingle(base, "state", null).modules).toEqual([]);
  });

  it("toggles multi-select modules", () => {
    const withAxios = toggleModule(base, "axios");
    expect(withAxios.modules).toEqual(["redux-toolkit", "axios"]);
    expect(toggleModule(withAxios, "axios").modules).toEqual(["redux-toolkit"]);
  });

  it("prunes modules unknown for the framework", () => {
    const result = pruneIncompatible({
      ...base,
      modules: ["redux-toolkit", "pinia"],
    });
    expect(result.removed).toEqual(["pinia"]);
    expect(result.selection.modules).toEqual(["redux-toolkit"]);
  });

  it("groups options by category with single-select flags", () => {
    const groups = groupOptions(base);
    expect(groups.find((g) => g.category === "state")?.single).toBe(true);
    expect(
      groups.find((g) => g.category === "state")?.options.find((o) => o.checked)
        ?.module.id,
    ).toBe("redux-toolkit");
  });
});
