import { describe, expect, it } from "vitest";
import { fill, renderImports } from "../src/engine/code";

describe("renderImports", () => {
  it("merges imports from the same source and orders them like Biome", () => {
    expect(
      renderImports([
        { from: "./index.css" },
        { from: "./App", default: "App" },
        { from: "react", named: ["useState"] },
        { from: "@/lib/site", named: ["siteName"] },
        { from: "react", named: ["StrictMode", "useState"] },
        { from: "node:url", named: ["fileURLToPath"] },
        { from: "./store", named: ["store"], types: ["RootState"] },
      ]),
    ).toEqual([
      'import { fileURLToPath } from "node:url";',
      'import { StrictMode, useState } from "react";',
      'import { siteName } from "@/lib/site";',
      'import App from "./App";',
      'import type { RootState } from "./store";',
      'import { store } from "./store";',
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
