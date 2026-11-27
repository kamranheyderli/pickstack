import { describe, expect, it } from "vitest";
import az from "../src/i18n/az.json";
import en from "../src/i18n/en.json";
import ru from "../src/i18n/ru.json";
import { browserLocale, translate } from "../src/i18n";

const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("i18n", () => {
  it("every locale has the same keys", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(az).sort());
    expect(Object.keys(ru).sort()).toEqual(Object.keys(az).sort());
  });

  it("every translation keeps the English placeholders", () => {
    for (const [key, text] of Object.entries(en)) {
      expect(placeholders(az[key as keyof typeof az]), key).toEqual(
        placeholders(text),
      );
      expect(placeholders(ru[key as keyof typeof ru]), key).toEqual(
        placeholders(text),
      );
    }
  });

  it("interpolates variables", () => {
    expect(translate("en", "field.nameHint", { name: "app" })).toBe(
      "Folder name: app",
    );
    expect(translate("ru", "field.nameHint", { name: "app" })).toBe(
      "Имя папки: app",
    );
  });
});

describe("browserLocale", () => {
  it("opens in the first of the browser's languages the site speaks", () => {
    expect(browserLocale(["az-AZ", "en-US"])).toBe("az");
    expect(browserLocale(["ru-RU", "AZ"])).toBe("ru");
    expect(browserLocale(["tr-TR", "az"])).toBe("az");
    expect(browserLocale(["en-US", "ru"])).toBe("en");
    expect(browserLocale([])).toBe("en");
  });

  it("opens in Russian for Ukrainian, Belarusian and Kazakh browsers", () => {
    expect(browserLocale(["uk-UA"])).toBe("ru");
    expect(browserLocale(["be"])).toBe("ru");
    expect(browserLocale(["kk-KZ", "en"])).toBe("ru");
  });

  it("falls back to English", () => {
    expect(browserLocale(["tr-TR", "de"])).toBe("en");
  });
});
