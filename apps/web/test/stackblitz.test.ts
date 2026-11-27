import { generate } from "@stackforge/core";
import { describe, expect, it } from "vitest";
import { quickCombos } from "../../../scripts/smoke-combos";
import { forLivePreview, runnableProject } from "../src/lib/stackblitz";

describe("runnableProject", () => {
  it("opens the whole project when it has a root package.json", () => {
    const files = new Map([
      ["package.json", "{}"],
      ["src/App.tsx", "app"],
    ]);
    expect(runnableProject(files, "src/App.tsx")).toEqual({
      files: { "package.json": "{}", "src/App.tsx": "app" },
      folder: null,
      openFile: "src/App.tsx",
    });
  });

  it("opens web/ alone when the API lives in server/", () => {
    const files = new Map([
      ["README.md", "root"],
      ["docker-compose.yml", "db"],
      ["web/package.json", "{}"],
      ["web/src/App.tsx", "app"],
      ["server/package.json", "{}"],
      ["server/src/index.ts", "api"],
    ]);
    const project = runnableProject(files, "web/src/App.tsx");
    expect(project.folder).toBe("web");
    expect(project.files).toEqual({
      "package.json": "{}",
      "src/App.tsx": "app",
    });
    expect(project.openFile).toBe("src/App.tsx");
    // A file outside web/ falls back to package.json.
    expect(runnableProject(files, "server/src/index.ts").openFile).toBe(
      "package.json",
    );
  });

  it("opens the first project when there is no web/ (e.g. host and remote)", () => {
    const files = new Map([
      ["remote/package.json", "{}"],
      ["host/package.json", "{}"],
      ["host/src/main.ts", "m"],
    ]);
    const project = runnableProject(files, "host/src/main.ts");
    expect(project.folder).toBe("host");
    expect(Object.keys(project.files)).toEqual(["package.json", "src/main.ts"]);
  });
});

/** Files only test runners, linters, formatters, Storybook or git hooks read. */
const toolFile =
  /\.(test|spec|stories)\.|(^|\/)(e2e|tests?|__tests__|\.storybook|\.husky)\/|(^|\/)(eslint|prettier|vitest|playwright|lint-staged|biome)\.config\.|(^|\/)\.(prettierrc|lintstagedrc)|(^|\/)biome\.json|(^|\/)(setupTests|vitest\.setup|test-setup)\.|(^|\/)tsconfig\.(vitest|spec|test)\.json$/;

const dependencies = (json: string | undefined) => {
  const pkg = JSON.parse(json ?? "{}") as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  return new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ]);
};

describe("forLivePreview", () => {
  it("drops dev-only tools and the prepare script", () => {
    const pkg = {
      scripts: { dev: "vite", prepare: "husky" },
      dependencies: { react: "^19" },
      devDependencies: { vite: "^8", eslint: "^10", vitest: "^4", husky: "^9" },
    };
    const { files } = forLivePreview({
      files: { "package.json": JSON.stringify(pkg) },
      folder: null,
      openFile: "package.json",
    });
    expect(JSON.parse(files["package.json"] ?? "")).toEqual({
      scripts: { dev: "vite" },
      dependencies: { react: "^19" },
      devDependencies: { vite: "^8" },
    });
  });

  it("keeps what the dev server loads, in every smoke stack", async () => {
    for (const combo of quickCombos) {
      const result = await generate({
        name: "app",
        packageManager: "npm",
        ...combo,
      });
      if (!result.ok) continue;
      const full = runnableProject(result.files, "package.json");
      const live = forLivePreview(full);
      const removed = [...dependencies(full.files["package.json"])].filter(
        (name) => !dependencies(live.files["package.json"]).has(name),
      );
      for (const [path, text] of Object.entries(live.files)) {
        if (toolFile.test(path)) continue;
        // angular.json names angular-eslint for `ng lint` and `ng generate`; `ng serve`
        // loads neither (checked in a live preview of Angular with ESLint).
        // Of package.json, only the dev script runs in the preview.
        const content = path.endsWith("package.json")
          ? JSON.stringify(
              (JSON.parse(text) as { scripts?: { dev?: string } }).scripts
                ?.dev ?? "",
            )
          : path === "angular.json"
            ? text
                .replace(/"schematicCollections":[^\]]*\]/, "")
                .replace(/"builder": "@angular-eslint\/[^"]*"/g, "")
            : text;
        for (const name of removed) {
          const quoted = `["']${name.replace(/[/.]/g, "\\$&")}(/[^"']*)?["']`;
          // Code uses a package by importing it; JSON (angular.json) names it as a string.
          const use = path.endsWith(".json")
            ? new RegExp(quoted)
            : new RegExp(
                `(\\bfrom|\\bimport|\\brequire\\(|\\bimport\\()\\s*${quoted}`,
              );
          expect(
            use.test(content),
            `${combo.framework} ${combo.modules.join(",")}: ${path} uses ${name}`,
          ).toBe(false);
        }
      }
    }
  });
});
