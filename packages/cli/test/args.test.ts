import { createCommand, type Selection } from "@stackforge/core";
import { describe, expect, it } from "vitest";
import { detectPackageManager, parseCliArgs } from "../src/args";
import { packageDirs } from "../src/project";

/** The arguments the CLI receives from a command the web app shows. */
function argvOf(command: string): string[] {
  const words = command.split(" ");
  // Drop "<pm> create pickstack[@latest]" and npm's "--" separator.
  return words.slice(3).filter((w) => w !== "--");
}

const selection: Selection = {
  name: "shop",
  framework: "vue",
  language: "js",
  packageManager: "pnpm",
  siteUrl: "https://shop.example",
  modules: ["tailwind", "pinia", "vue-router"],
};

describe("parseCliArgs", () => {
  it("reads every flag", () => {
    expect(
      parseCliArgs([
        "my-app",
        "-f",
        "react",
        "--language",
        "js",
        "--pm",
        "bun",
        "--modules",
        "tailwind, zustand,",
        "--site-url",
        "https://x.dev",
        "--yes",
        "--no-install",
        "--no-git",
      ]),
    ).toEqual({
      name: "my-app",
      framework: "react",
      language: "js",
      packageManager: "bun",
      modules: ["tailwind", "zustand"],
      siteUrl: "https://x.dev",
      yes: true,
      install: false,
      git: false,
      help: false,
      version: false,
      list: false,
    });
  });

  it("leaves unset choices open so they can be asked", () => {
    const args = parseCliArgs([]);
    expect(args.name).toBeUndefined();
    expect(args.framework).toBeUndefined();
    expect(args.modules).toBeUndefined();
    expect(args.install).toBe(true);
    expect(args.git).toBe(true);
  });

  it("rejects invalid values and unknown flags", () => {
    expect(() => parseCliArgs(["--language", "py"])).toThrow(/--language/);
    expect(() => parseCliArgs(["--pm", "deno"])).toThrow(/--pm/);
    expect(() => parseCliArgs(["--colour"])).toThrow();
    expect(() => parseCliArgs(["a", "b"])).toThrow(/one project name/);
  });
});

describe("createCommand", () => {
  it.each(["npm", "pnpm", "yarn", "bun"] as const)(
    "round-trips through the CLI flags with %s",
    (packageManager) => {
      const command = createCommand({ ...selection, packageManager });
      const args = parseCliArgs(argvOf(command));
      expect(args).toMatchObject({
        name: selection.name,
        framework: selection.framework,
        language: selection.language,
        modules: selection.modules,
        siteUrl: selection.siteUrl,
        yes: true,
      });
    },
  );

  it("is short for the defaults", () => {
    expect(
      createCommand({
        name: "my-app",
        framework: "react",
        language: "ts",
        packageManager: "npm",
        modules: [],
      }),
    ).toBe("npm create pickstack@latest my-app -- --framework react --yes");
  });
});

describe("detectPackageManager", () => {
  it("uses the package manager that started the CLI", () => {
    expect(detectPackageManager("pnpm/10.34.9 npm/? node/v24.0.0")).toBe(
      "pnpm",
    );
    expect(detectPackageManager("bun/1.3.0 npm/? node/v24.0.0")).toBe("bun");
    expect(detectPackageManager("yarn/4.9.0 npm/? node/v24.0.0")).toBe("yarn");
    expect(detectPackageManager(undefined)).toBe("npm");
  });
});

describe("packageDirs", () => {
  it("finds the root project or each independent project", () => {
    expect(packageDirs(new Map([["package.json", "{}"]]))).toEqual(["."]);
    expect(
      packageDirs(
        new Map([
          ["README.md", ""],
          ["remote/package.json", "{}"],
          ["host/package.json", "{}"],
          ["host/src/x/package.json", "{}"],
        ]),
      ),
    ).toEqual(["host", "remote"]);
  });
});
