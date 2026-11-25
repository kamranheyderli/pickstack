import { describe, expect, it } from "vitest";
import { diffStats, lineDiff } from "../src/lib/diff";

describe("lineDiff", () => {
  it("marks added and removed lines and keeps the rest", () => {
    const diff = lineDiff("a\nb\nc", "a\nB\nc\nd");
    expect(diff).toEqual([
      { type: "same", text: "a" },
      { type: "add", text: "B" },
      { type: "del", text: "b" },
      { type: "same", text: "c" },
      { type: "add", text: "d" },
    ]);
    expect(diffStats(diff)).toEqual({ added: 2, removed: 1 });
  });

  it("folds long unchanged runs, keeping three lines of context", () => {
    const lines = Array.from({ length: 20 }, (_, i) => `line ${i}`);
    const changed = [...lines];
    changed[10] = "changed";
    const diff = lineDiff(lines.join("\n"), changed.join("\n"));
    expect(diff[0]).toEqual({ type: "skip", count: 7 });
    expect(diff.at(-1)).toEqual({ type: "skip", count: 6 });
    expect(diffStats(diff)).toEqual({ added: 1, removed: 1 });
  });

  it("shows a new file as all added", () => {
    expect(diffStats(lineDiff("", "x\ny"))).toEqual({ added: 2, removed: 0 });
  });
});
