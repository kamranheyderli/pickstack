import { describe, expect, it } from "vitest";
import { fill, renderImports } from "../src/engine/code";

describe("renderImports", () => {
  it("merges imports from the same source and orders packages, relative, side-effect", () => {
    expect(
      renderImports([
        { from: "./index.css" },
        { from: "./App", default: "App" },
        { from: "react", named: ["useState"] },
        { from: "react", named: ["StrictMode", "useState"] },
        { from: "./store", named: ["store"], types: ["RootState"] },
      ]),
    ).toEqual([
      'import { StrictMode, useState } from "react";',
      'import App from "./App";',
      'import { store } from "./store";',
      'import type { RootState } from "./store";',
      'import "./index.css";',
    ]);
  });
});

describe("fill", () => {
  it("replaces placeholders", () => {
    expect(fill("<title>{{name}}</title>", { name: "app" })).toBe(
      "<title>app</title>",
    );
  });

  it("throws on unknown placeholders", () => {
    expect(() => fill("{{missing}}", {})).toThrow(/missing/);
  });
});
