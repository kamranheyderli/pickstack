import { describe, expect, it } from "vitest";
import { formatFiles, generate, modules } from "../src";
import type { Language } from "../src";
import { selection } from "./helpers";

const ALL_REACT = [
  "tailwind",
  "redux-toolkit",
  "react-router",
  "axios",
  "prettier",
];

async function files(language: Language, mods: string[]) {
  const result = await generate(selection({ language, modules: mods }));
  if (!result.ok)
    throw new Error(result.errors.map((e) => e.message).join("\n"));
  return result.files;
}

describe("react snapshots", () => {
  for (const language of ["js", "ts"] as const) {
    it(`minimal (${language})`, async () => {
      expect(Object.fromEntries(await files(language, []))).toMatchSnapshot();
    });

    it(`everything (${language})`, async () => {
      expect(
        Object.fromEntries(await files(language, ALL_REACT)),
      ).toMatchSnapshot();
    });
  }

  it("zustand without router (ts)", async () => {
    const result = await files("ts", ["zustand"]);
    expect(result.get("src/components/Counter.tsx")).toMatchSnapshot();
  });
});

describe("generate", () => {
  it("returns validation errors instead of files", async () => {
    const result = await generate(
      selection({ modules: ["redux-toolkit", "zustand"] }),
    );
    expect(result.ok).toBe(false);
  });

  it("gives every package a known-good version for every valid combination", async () => {
    const ids = modules.map((m) => m.id);
    let generated = 0;
    for (let mask = 0; mask < 1 << ids.length; mask++) {
      const picked = ids.filter((_, i) => mask & (1 << i));
      for (const language of ["js", "ts"] as const) {
        const result = await generate(
          selection({ language, modules: picked }),
          { format: false },
        );
        if (!result.ok) {
          expect(result.errors.every((e) => e.code === "single-category")).toBe(
            true,
          );
          continue;
        }
        generated++;
        const pkg = JSON.parse(result.files.get("package.json") ?? "{}") as {
          dependencies: Record<string, string>;
        };
        expect(
          Object.values(pkg.dependencies).every((v) => /^[~^]?\d/.test(v)),
        ).toBe(true);
      }
    }
    expect(generated).toBeGreaterThan(0);
  });

  it("is deterministic", async () => {
    const a = await files("ts", ALL_REACT);
    const b = await files("ts", [...ALL_REACT].reverse());
    expect([...a]).toEqual([...b]);
  });

  it("produces output that Prettier leaves unchanged", async () => {
    const generated = await files("ts", ALL_REACT);
    expect([...(await formatFiles(generated))]).toEqual([...generated]);
  });

  it("writes package-manager specific commands into the README", async () => {
    const result = await generate(selection({ packageManager: "bun" }));
    if (!result.ok) throw new Error("generation failed");
    expect(result.files.get("README.md")).toContain("bun run dev");
  });
});
