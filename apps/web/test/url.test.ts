import { presets, type Selection } from "@stackforge/core";
import { describe, expect, it } from "vitest";
import { selectionFromQuery, selectionToQuery } from "../src/lib/url";
import { defaultSelection } from "../src/state/selection";

const selection: Selection = {
  name: "shop",
  framework: "vue",
  language: "js",
  packageManager: "pnpm",
  siteUrl: "https://shop.example",
  modules: ["tailwind", "pinia", "vue-router"],
};

describe("shared links", () => {
  it("round-trips a selection", () => {
    const query = selectionToQuery(selection);
    expect(query).toBe(
      "?f=vue&l=js&pm=pnpm&n=shop&s=https%3A%2F%2Fshop.example&m=tailwind,pinia,vue-router",
    );
    expect(selectionFromQuery(query, defaultSelection)).toEqual(selection);
  });

  it("keeps the defaults out of the link", () => {
    expect(selectionToQuery({ ...defaultSelection, modules: [] })).toBe(
      "?f=react",
    );
  });

  it("returns null without a framework", () => {
    expect(selectionFromQuery("", defaultSelection)).toBeNull();
    expect(selectionFromQuery("?f=cobol", defaultSelection)).toBeNull();
  });

  it("drops unknown and incompatible modules and bad values", () => {
    expect(
      selectionFromQuery(
        "?f=vue&l=py&m=pinia,nope,redux-toolkit",
        defaultSelection,
      ),
    ).toMatchObject({ framework: "vue", language: "ts", modules: ["pinia"] });
  });

  it("opens a preset, which other keys can refine", () => {
    const preset = presets[0];
    if (!preset) throw new Error("no presets");
    expect(
      selectionFromQuery(`?p=${preset.id}`, defaultSelection),
    ).toMatchObject({
      framework: preset.framework,
      modules: preset.modules,
    });
    expect(
      selectionFromQuery(`?p=${preset.id}&pm=bun`, defaultSelection),
    ).toMatchObject({ packageManager: "bun", modules: preset.modules });
  });
});
