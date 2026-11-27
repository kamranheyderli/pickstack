import { describe, expect, it } from "vitest";
import { inRange } from "./semver-range";

describe("inRange", () => {
  it("keeps a caret range within its major", () => {
    expect(inRange("5.4.0", "^5.1.2")).toBe(true);
    expect(inRange("6.0.0", "^5.1.2")).toBe(false);
  });
  it("treats 0.x carets as one minor", () => {
    expect(inRange("0.45.9", "^0.45.4")).toBe(true);
    expect(inRange("0.46.0", "^0.45.4")).toBe(false);
  });
  it("keeps a tilde range within its minor", () => {
    expect(inRange("6.0.9", "~6.0.3")).toBe(true);
    expect(inRange("6.1.0", "~6.0.3")).toBe(false);
  });
  it("doesn't judge ranges it can't read", () => {
    expect(inRange("1.0.0", "latest")).toBe(true);
  });
});
