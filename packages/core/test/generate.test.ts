import { describe, expect, it } from "vitest";
import {
  formatFiles,
  frameworks,
  generate,
  modules,
  singleSelectCategories,
} from "../src";
import type { FrameworkId, Language } from "../src";
import { selection } from "./helpers";

const ALL_REACT = [
  "tailwind",
  "redux-toolkit",
  "react-router",
  "axios",
  "prettier",
];

async function files(
  language: Language,
  mods: string[],
  framework: FrameworkId = "react",
) {
  const result = await generate(
    selection({ framework, language, modules: mods }),
  );
  if (!result.ok)
    throw new Error(result.errors.map((e) => e.message).join("\n"));
  return result.files;
}

/** Every module available for the framework, taking the first option in single-select categories. */
function everything(framework: FrameworkId): string[] {
  const taken = new Set<string>();
  return modules
    .filter((m) => m.frameworks === "all" || m.frameworks.includes(framework))
    .filter((m) => {
      if (!singleSelectCategories.has(m.category)) return true;
      if (taken.has(m.category)) return false;
      taken.add(m.category);
      return true;
    })
    .map((m) => m.id);
}

for (const framework of frameworks) {
  describe(`${framework.id} snapshots`, () => {
    for (const language of framework.languages) {
      it(`minimal (${language})`, async () => {
        expect(
          Object.fromEntries(await files(language, [], framework.id)),
        ).toMatchSnapshot();
      });

      it(`everything (${language})`, async () => {
        expect(
          Object.fromEntries(
            await files(language, everything(framework.id), framework.id),
          ),
        ).toMatchSnapshot();
      });
    }
  });
}

describe("react extras", () => {
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

  for (const framework of frameworks) {
    it(`gives every package a known-good version for every valid ${framework.id} combination`, async () => {
      const ids = modules
        .filter(
          (m) => m.frameworks === "all" || m.frameworks.includes(framework.id),
        )
        .map((m) => m.id);
      let generated = 0;
      for (let mask = 0; mask < 1 << ids.length; mask++) {
        const picked = ids.filter((_, i) => mask & (1 << i));
        for (const language of framework.languages) {
          const result = await generate(
            selection({ framework: framework.id, language, modules: picked }),
            { format: false },
          );
          if (!result.ok) {
            expect(
              result.errors.every((e) => e.code === "single-category"),
            ).toBe(true);
            continue;
          }
          generated++;
          const pkg = JSON.parse(result.files.get("package.json") ?? "{}") as {
            dependencies?: Record<string, string>;
            devDependencies?: Record<string, string>;
          };
          const versions = Object.values({
            ...pkg.dependencies,
            ...pkg.devDependencies,
          });
          expect(versions.length).toBeGreaterThan(0);
          expect(versions.every((v) => /^[~^]?\d/.test(v))).toBe(true);
        }
      }
      expect(generated).toBeGreaterThan(0);
    });
  }

  it("rejects modules from another framework", async () => {
    const result = await generate(
      selection({ framework: "vue", modules: ["redux-toolkit"] }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]?.code).toBe("framework-mismatch");
  });

  it("is deterministic", async () => {
    const a = await files("ts", ALL_REACT);
    const b = await files("ts", [...ALL_REACT].reverse());
    expect([...a]).toEqual([...b]);
  });

  it("produces output that Prettier leaves unchanged", async () => {
    for (const framework of frameworks) {
      const generated = await files(
        "ts",
        everything(framework.id),
        framework.id,
      );
      const reformatted = await formatFiles(generated, framework.formatParsers);
      expect([...reformatted]).toEqual([...generated]);
    }
  });

  it("writes package-manager specific commands into the README", async () => {
    const result = await generate(selection({ packageManager: "bun" }));
    if (!result.ok) throw new Error("generation failed");
    expect(result.files.get("README.md")).toContain("bun run dev");
  });
});
