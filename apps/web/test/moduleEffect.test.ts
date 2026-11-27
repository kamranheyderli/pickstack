import type { Selection } from "@stackforge/core";
import { describe, expect, it } from "vitest";
import { moduleEffect } from "../src/lib/moduleEffect";

const react: Selection = {
  name: "shop",
  framework: "react",
  language: "ts",
  packageManager: "npm",
  modules: [],
};

describe("moduleEffect", () => {
  it("lists the packages and files a module brings to this project", async () => {
    const result = await moduleEffect(react, "tailwind");
    if (!result.ok) throw new Error(result.error.message);
    expect(result.effect.packages).toContain("tailwindcss");
    expect(result.effect.changed).toContain("vite.config.ts");
    expect(result.effect.alsoAdded).toEqual([]);
  });

  it("takes the place of the current pick in a pick-one category", async () => {
    const result = await moduleEffect(
      { ...react, modules: ["redux-toolkit"] },
      "zustand",
    );
    if (!result.ok) throw new Error(result.error.message);
    expect(result.effect.packages).toContain("zustand");
  });

  it("explains why a module can't be picked yet", async () => {
    const result = await moduleEffect(react, "better-auth");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("missing-one-of");
  });

  it("measures a module against the rest of the picks, picked or not", async () => {
    const withServer = {
      ...react,
      modules: ["express", "mongodb", "better-auth"],
    };
    const result = await moduleEffect(withServer, "better-auth");
    if (!result.ok) throw new Error(result.error.message);
    expect(result.effect.added).toContain("server/src/auth.ts");
    expect(result.effect.packages).toEqual(
      expect.arrayContaining(["better-auth"]),
    );
  });
});
