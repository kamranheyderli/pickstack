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

describe("browserLocale", () => {
  it("opens in Azerbaijani only for browsers that list it", async () => {
    const { browserLocale } = await import("../src/i18n");
    expect(browserLocale(["az-AZ", "en-US"])).toBe("az");
    expect(browserLocale(["ru-RU", "AZ"])).toBe("az");
    expect(browserLocale(["en-US", "tr-TR"])).toBe("en");
    expect(browserLocale([])).toBe("en");
  });
});
