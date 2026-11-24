import { describe, expect, it } from "vitest";
import { formatFiles, frameworks, generate, modules } from "../src";
import type { FrameworkId, Language } from "../src";
import { selection } from "./helpers";

const ALL_REACT = [
  "tailwind",
  "redux-toolkit",
  "react-router",
  "axios",
  "prettier",
];
const ALL_VUE = ["tailwind", "pinia", "vue-router", "axios", "prettier"];

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

describe("vue snapshots", () => {
  for (const language of ["js", "ts"] as const) {
    it(`minimal (${language})`, async () => {
      expect(
        Object.fromEntries(await files(language, [], "vue")),
      ).toMatchSnapshot();
    });

    it(`everything (${language})`, async () => {
      expect(
        Object.fromEntries(await files(language, ALL_VUE, "vue")),
      ).toMatchSnapshot();
    });
  }
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
            dependencies: Record<string, string>;
          };
          expect(
            Object.values(pkg.dependencies).every((v) => /^[~^]?\d/.test(v)),
          ).toBe(true);
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
    for (const [framework, all] of [
      ["react", ALL_REACT],
      ["vue", ALL_VUE],
    ] as const) {
      const generated = await files("ts", [...all], framework);
      expect([...(await formatFiles(generated))]).toEqual([...generated]);
    }
  });

  it("writes package-manager specific commands into the README", async () => {
    const result = await generate(selection({ packageManager: "bun" }));
    if (!result.ok) throw new Error("generation failed");
    expect(result.files.get("README.md")).toContain("bun run dev");
  });
});
