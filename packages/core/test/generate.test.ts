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

/**
 * Every module available for the framework, taking the first option in single-select categories.
 * Biome (replaces ESLint + Prettier), Turborepo and Module Federation (both change the
 * layout, and conflict) have their own snapshots.
 */
function everything(framework: FrameworkId): string[] {
  const taken = new Set<string>();
  return modules
    .filter((m) => m.frameworks === "all" || m.frameworks.includes(framework))
    .filter(
      (m) =>
        ![
          "biome",
          "turborepo",
          "module-federation",
          "express",
          "nestjs",
          "mongodb",
          "drizzle",
          "better-auth",
        ].includes(m.id),
    )
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

describe("express snapshot", () => {
  it("puts the app in web/ and the API in server/ (ts)", async () => {
    expect(await files("ts", ["express"])).toMatchSnapshot();
  });
});

describe("better-auth snapshot", () => {
  it("adds Better Auth to the Express API (ts)", async () => {
    expect(
      await files("ts", ["express", "mongodb", "better-auth"]),
    ).toMatchSnapshot();
  });
});

describe("nestjs snapshot", () => {
  it("puts a NestJS API in server/ (ts)", async () => {
    expect(await files("ts", ["nestjs"])).toMatchSnapshot();
  });
});

describe("drizzle snapshot", () => {
  it("adds PostgreSQL with Drizzle to Next.js (ts)", async () => {
    expect(
      await files("ts", ["drizzle", "tailwind"], "next"),
    ).toMatchSnapshot();
  });
});

describe("biome snapshots", () => {
  // Biome replaces ESLint + Prettier, so the "everything" snapshots leave it out.
  for (const framework of ["react", "vue", "astro"] as const) {
    it(`${framework} with biome and tailwind (ts)`, async () => {
      const result = await files("ts", ["biome", "tailwind"], framework);
      expect(Object.fromEntries(result)).toMatchSnapshot();
    });
  }
});

describe("sass snapshots", () => {
  // "everything" pairs Sass with Tailwind, which keeps the stylesheet CSS.
  for (const framework of ["react", "angular"] as const) {
    it(`${framework} with sass (ts)`, async () => {
      const result = await files("ts", ["sass"], framework);
      expect(Object.fromEntries(result)).toMatchSnapshot();
    });
  }
});

describe("turborepo snapshots", () => {
  for (const framework of ["react", "next"] as const) {
    it(`${framework} in a turborepo (ts)`, async () => {
      const result = await files("ts", ["turborepo", "eslint"], framework);
      expect(Object.fromEntries(result)).toMatchSnapshot();
    });
  }
});

describe("module federation snapshot", () => {
  it("react host and remote (ts)", async () => {
    const result = await files("ts", ["module-federation"]);
    expect(Object.fromEntries(result)).toMatchSnapshot();
  });
});

describe("tanstack router snapshots", () => {
  for (const framework of ["react", "solid"] as const) {
    it(`${framework} with file routes (ts)`, async () => {
      const result = await files("ts", ["tanstack-router"], framework);
      expect(Object.fromEntries(result)).toMatchSnapshot();
    });
  }
});

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
    it(`gives every package a known-good version for ${framework.id} modules alone and in pairs`, async () => {
      const ids = modules
        .filter(
          (m) => m.frameworks === "all" || m.frameworks.includes(framework.id),
        )
        .map((m) => m.id);
      // Every module alone and every pair: versions are looked up per package, and pairs
      // cover dependencies one module adds because of another (e.g. tailwindcss-primeui).
      const combos: string[][] = [
        [],
        ...ids.map((id) => [id]),
        ...ids.flatMap((a, i) => ids.slice(i + 1).map((b) => [a, b])),
      ];
      let generated = 0;
      for (const picked of combos) {
        for (const language of framework.languages) {
          const result = await generate(
            selection({ framework: framework.id, language, modules: picked }),
            { format: false },
          );
          if (!result.ok) {
            // Only expected rejections: two picks in a single-select category, Biome
            // alongside ESLint/Prettier, Husky without a tool to run, or a TS-only
            // module (NestJS) in JS.
            expect(
              result.errors.every((e) =>
                [
                  "single-category",
                  "conflict",
                  "missing-one-of",
                  "language-mismatch",
                ].includes(e.code),
              ),
            ).toBe(true);
            continue;
          }
          generated++;
          // Every package.json: the app, a workspace root, or host and remote projects.
          const manifests = [...result.files]
            .filter(([path]) => path.endsWith("package.json"))
            .map(
              ([, content]) =>
                JSON.parse(content) as {
                  dependencies?: Record<string, string>;
                  devDependencies?: Record<string, string>;
                },
            );
          expect(manifests.length).toBeGreaterThan(0);
          for (const pkg of manifests) {
            const versions = Object.values({
              ...pkg.dependencies,
              ...pkg.devDependencies,
            });
            expect(versions.length).toBeGreaterThan(0);
            expect(versions.every((v) => /^[~^]?\d/.test(v))).toBe(true);
          }
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
