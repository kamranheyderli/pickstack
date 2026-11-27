import { describe, expect, it } from "vitest";
import { liveUpdate } from "../src/lib/liveUpdate";

const project = {
  "package.json": '{"name":"app"}',
  "src/App.tsx": "old",
  "src/old.ts": "x",
};

describe("liveUpdate", () => {
  it("embeds when nothing is running yet", () => {
    expect(liveUpdate(null, project)).toEqual({ kind: "embed" });
  });

  it("does nothing when no file changed", () => {
    expect(liveUpdate(project, { ...project })).toEqual({ kind: "none" });
  });

  it("sends only changed, new and removed files", () => {
    const rest: Record<string, string> = { ...project };
    delete rest["src/old.ts"];
    expect(
      liveUpdate(project, { ...rest, "src/App.tsx": "new", "src/new.ts": "y" }),
    ).toEqual({
      kind: "diff",
      diff: {
        create: { "src/App.tsx": "new", "src/new.ts": "y" },
        destroy: ["src/old.ts"],
      },
    });
  });

  it("embeds again when a package.json changed, since packages need an install", () => {
    expect(
      liveUpdate(project, { ...project, "package.json": '{"name":"b"}' }),
    ).toEqual({ kind: "embed" });
    expect(
      liveUpdate(project, { ...project, "server/package.json": "{}" }),
    ).toEqual({ kind: "embed" });
  });
});
