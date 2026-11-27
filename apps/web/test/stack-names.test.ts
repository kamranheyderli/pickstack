import { frameworkCatalog, modules, presets } from "@stackforge/core";
import { describe, expect, it } from "vitest";
import { stackFromQuery, stackTitle } from "../api/_stack";
import { frameworkNames, moduleNames, presetStacks } from "../api/_stack-names";

describe("share image names", () => {
  // The functions keep their own copy so they don't bundle the generator; regenerate the file
  // (see its header) when this fails.
  it("match the generator's frameworks, modules and presets", () => {
    expect(frameworkNames).toEqual(
      Object.fromEntries(frameworkCatalog.map((f) => [f.id, f.name])),
    );
    expect(moduleNames).toEqual(
      Object.fromEntries(modules.map((m) => [m.id, m.name])),
    );
    expect(presetStacks).toEqual(
      Object.fromEntries(
        presets.map((p) => [
          p.id,
          { framework: p.framework, modules: p.modules },
        ]),
      ),
    );
  });
});

describe("stackFromQuery", () => {
  const read = (query: string) => stackFromQuery(new URLSearchParams(query));

  it("reads a picked stack and drops unknown modules", () => {
    expect(read("f=vue&l=js&m=pinia,nope,tailwind")).toEqual({
      framework: "vue",
      frameworkName: "Vue",
      language: "js",
      modules: ["pinia", "tailwind"],
    });
  });

  it("starts from a preset, and lets the link's own modules win", () => {
    expect(read("p=vue-pinia")?.modules).toEqual(
      presetStacks["vue-pinia"]?.modules,
    );
    expect(read("p=vue-pinia&m=vitest")?.modules).toEqual(["vitest"]);
  });

  it("is null without a known framework", () => {
    expect(read("")).toBeNull();
    expect(read("f=cobol")).toBeNull();
  });

  it("titles the stack in one line", () => {
    const stack = read("f=react&m=tailwind,shadcn,zustand,vitest,eslint");
    expect(stack && stackTitle(stack)).toBe(
      "React + Tailwind CSS, shadcn/ui, Zustand +2",
    );
  });
});
