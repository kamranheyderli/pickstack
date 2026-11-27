import { generate } from "@stackforge/core";
import { describe, expect, it } from "vitest";
import {
  extras,
  goals,
  preferences,
  recommend,
  type Extra,
} from "../src/lib/wizard";
import { defaultSelection } from "../src/state/selection";

describe("recommend", () => {
  it("gives a stack that generates for every answer", async () => {
    // Every goal and preference, with no extras and with all of them.
    for (const goal of goals)
      for (const preference of preferences)
        for (const picked of [[], extras] as Extra[][]) {
          const { selection } = recommend(
            { goal, preference, extras: picked },
            defaultSelection,
          );
          const result = await generate(selection);
          expect(
            result.ok ? [] : result.errors.map((e) => e.message),
            `${goal} ${preference} ${picked.join(",")}`,
          ).toEqual([]);
        }
  });

  it("builds content sites on a meta-framework with SEO", () => {
    const { selection } = recommend(
      { goal: "content", preference: "any", extras: [] },
      defaultSelection,
    );
    expect(selection.framework).toBe("astro");
    expect(selection.modules).toEqual(
      expect.arrayContaining(["tailwind", "seo", "aio"]),
    );
  });

  it("gives full-stack projects an API, a database and sign-in", () => {
    const vue = recommend(
      { goal: "fullstack", preference: "vue", extras: ["forms"] },
      defaultSelection,
    );
    expect(vue.selection.framework).toBe("vue");
    expect(vue.selection.modules).toEqual(
      expect.arrayContaining([
        "express",
        "drizzle",
        "better-auth",
        "tanstack-form",
        "zod",
      ]),
    );
    const angular = recommend(
      { goal: "fullstack", preference: "angular", extras: [] },
      defaultSelection,
    );
    expect(angular.selection.modules).toContain("nestjs");
  });

  it("keeps the name and package manager, and says which extras don't fit", () => {
    const { selection, unavailable } = recommend(
      { goal: "app", preference: "svelte", extras: ["i18n", "tests"] },
      { ...defaultSelection, name: "shop", packageManager: "pnpm" },
    );
    expect(selection.name).toBe("shop");
    expect(selection.packageManager).toBe("pnpm");
    expect(unavailable).toEqual(["i18n"]);
  });
});
