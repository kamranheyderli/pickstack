import { describe, expect, it } from "vitest";
import sizes from "../src/data/bundle-sizes.json";
import { formatSize, moduleSize, stackSize } from "../src/lib/bundleSize";

const preact = sizes.frameworks.preact;

describe("bundle sizes", () => {
  it("adds the modules' sizes to the framework's minimal project", () => {
    expect(stackSize("preact", [])).toBe(preact.base);
    expect(stackSize("preact", ["tailwind", "preact-iso"])).toBe(
      preact.base + preact.modules.tailwind + preact.modules["preact-iso"],
    );
    // A module listed twice (picked and pulled in) counts once.
    expect(stackSize("preact", ["tailwind", "tailwind"])).toBe(
      preact.base + preact.modules.tailwind,
    );
  });

  it("gives no total rather than a low one when something wasn't measured", () => {
    expect(stackSize("preact", ["not-a-module"])).toBeUndefined();
    expect(stackSize("cobol", [])).toBeUndefined();
    expect(moduleSize("preact", "not-a-module")).toBeUndefined();
  });

  it("formats in KB, with a decimal under 10 KB", () => {
    expect(formatSize(5939, "en")).toBe("5.8 KB");
    expect(formatSize(5939, "ru")).toBe("5,8 KB");
    expect(formatSize(86_000, "az")).toBe("84 KB");
    expect(formatSize(0, "en")).toBe("0 KB");
  });
});
