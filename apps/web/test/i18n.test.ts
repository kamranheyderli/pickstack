import { describe, expect, it } from "vitest";
import az from "../src/i18n/az.json";
import en from "../src/i18n/en.json";
import { translate } from "../src/i18n";

describe("i18n", () => {
  it("az and en have the same keys", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(az).sort());
  });

  it("interpolates variables", () => {
    expect(translate("en", "field.nameHint", { name: "app" })).toBe(
      "Folder name: app",
    );
  });
});
