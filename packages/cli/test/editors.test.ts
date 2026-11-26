import { describe, expect, it } from "vitest";
import { parseCliArgs } from "../src/args";
import {
  installedEditors,
  launchFor,
  editors,
  type Host,
} from "../src/editors";

const editor = (id: string) => {
  const found = editors.find((e) => e.id === id);
  if (!found) throw new Error(id);
  return found;
};

function host(platform: NodeJS.Platform, path: string, files: string[]): Host {
  return {
    platform,
    path,
    home: "/Users/me",
    exists: (file) => files.includes(file),
  };
}

describe("editors", () => {
  it("runs the editor's command when it is on PATH", () => {
    const h = host("linux", "/usr/bin:/opt/cursor/bin", [
      "/opt/cursor/bin/cursor",
    ]);
    expect(launchFor(editor("cursor"), "shop", h)).toEqual({
      command: "/opt/cursor/bin/cursor",
      args: ["shop"],
    });
    expect(launchFor(editor("code"), "shop", h)).toBeNull();
  });

  it("falls back to the macOS app when the shell command isn't installed", () => {
    const h = host("darwin", "/usr/bin", [
      "/Applications/Visual Studio Code.app",
      "/Users/me/Applications/Zed.app",
    ]);
    expect(launchFor(editor("code"), "shop", h)).toEqual({
      command: "open",
      args: ["-a", "Visual Studio Code", "shop"],
    });
    expect(launchFor(editor("zed"), "shop", h)?.command).toBe("open");
    expect(installedEditors(h).map((e) => e.id)).toEqual(["code", "zed"]);
  });

  it("lets the Windows shell find the .cmd launcher", () => {
    // Only the file name matters here: node:path joins with this machine's separator.
    const h = host("win32", "C:\\Program Files\\Code\\bin", []);
    const found = launchFor(editor("code"), "shop", {
      ...h,
      exists: (f) => f.endsWith("code.cmd"),
    });
    expect(found).toEqual({ command: "code", args: ["shop"] });
  });

  it("finds nothing on a machine without editors", () => {
    expect(installedEditors(host("linux", "/usr/bin", []))).toEqual([]);
  });
});

describe("--open", () => {
  it("takes a known editor", () => {
    expect(parseCliArgs(["shop", "--open", "cursor"]).open).toBe("cursor");
    expect(parseCliArgs(["shop", "-o", "code"]).open).toBe("code");
    expect(parseCliArgs(["shop"]).open).toBeUndefined();
  });

  it("rejects an unknown editor", () => {
    expect(() => parseCliArgs(["shop", "--open", "notepad"])).toThrow(
      /--open must be one of: code, cursor, windsurf, zed/,
    );
  });
});
