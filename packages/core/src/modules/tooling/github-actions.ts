import { file } from "../../engine/code";
import { installCommand, runCommand } from "../../engine/finalize";
import { serverScripts } from "../../engine/server";
import { githubActions } from "../../versions/known-good";
import type { Module, PackageManager } from "../../types";

/** Checks in the order they fail fastest, then the build. */
const CHECKS = ["lint", "check", "format:check", "typecheck", "test", "build"];

/** Scripts a Turborepo root exposes (it delegates only these to turbo). */
const WORKSPACE_TASKS = new Set(["lint", "typecheck", "test", "build"]);

/** Steps that put the package manager on the runner (npm and yarn come with it). */
function setupSteps(pm: PackageManager): string[] {
  const node = [
    `      - uses: ${githubActions.setupNode}`,
    "        with:",
    `          node-version: ${githubActions.node}`,
    // Caching needs a committed lockfile, which a fresh project doesn't have yet.
    `          # Once the lockfile is committed, add \`cache: ${pm === "bun" ? "npm" : pm}\` to cache dependencies.`,
  ];
  switch (pm) {
    case "pnpm":
      return [
        `      - uses: ${githubActions.setupPnpm}`,
        "        with:",
        `          version: ${githubActions.pnpm}`,
        ...node,
      ];
    case "bun":
      return [`      - uses: ${githubActions.setupBun}`, ...node.slice(0, 3)];
    default:
      return node;
  }
}

/**
 * GitHub Actions CI: on pushes to main and on pull requests, install and run the project's
 * own checks (lint, format, typecheck, test) and build. Steps follow the generated scripts, so
 * the workflow runs exactly what `pnpm smoke` verifies for this combination.
 */
export const githubActionsModule: Module = {
  id: "github-actions",
  name: "GitHub Actions CI",
  category: "tooling",
  description: {
    az: "Hər push və PR-da lint, typecheck, test və build.",
    en: "Lint, typecheck, test and build on every push and PR.",
  },
  frameworks: "all",
  // After turborepo, whose workspace decides which scripts the root exposes.
  order: 90,
  apply(model, ctx) {
    const pm = ctx.selection.packageManager;
    const checks = (scripts: Record<string, string>) =>
      CHECKS.filter(
        (s) => s in scripts && (!model.monorepo || WORKSPACE_TASKS.has(s)),
      );
    /** One job: install and run the checks, in `dir` when the repository holds several projects. */
    const job = (name: string, scripts: string[], dir?: string) => [
      `  ${name}:`,
      "    runs-on: ubuntu-latest",
      ...(dir
        ? ["    defaults:", "      run:", `        working-directory: ${dir}`]
        : []),
      "    steps:",
      `      - uses: ${githubActions.checkout}`,
      ...setupSteps(pm),
      `      - run: ${installCommand(pm)}`,
      ...scripts.map((s) => `      - run: ${runCommand(pm, s)}`),
    ];
    // With an API in server/, the app is in web/: each project gets its own job.
    const jobs = model.server
      ? [
          ...job("web", checks(model.pkg.scripts), "web"),
          "",
          ...job("server", checks(serverScripts(model.server, ctx)), "server"),
        ]
      : job("ci", checks(model.pkg.scripts));
    model.repoFiles.set(
      ".github/workflows/ci.yml",
      file([
        "name: CI",
        "",
        "on:",
        "  push:",
        "    branches: [main]",
        "  pull_request:",
        "",
        "permissions:",
        "  contents: read",
        "",
        "jobs:",
        ...jobs,
      ]),
    );
    model.readme.stack.push("GitHub Actions");
  },
};
