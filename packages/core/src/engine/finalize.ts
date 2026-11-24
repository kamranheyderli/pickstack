import { knownGoodVersion } from "../versions/known-good";
import type { Ctx, PackageManager, ProjectModel } from "../types";
import { file, json, sortRecord } from "./code";
import { APP_NAME, writeTurborepo } from "./monorepo";

const commands: Record<
  PackageManager,
  { install: string; run: (script: string) => string }
> = {
  npm: { install: "npm install", run: (s) => `npm run ${s}` },
  pnpm: { install: "pnpm install", run: (s) => `pnpm ${s}` },
  yarn: { install: "yarn", run: (s) => `yarn ${s}` },
  bun: { install: "bun install", run: (s) => `bun run ${s}` },
};

export function runCommand(pm: PackageManager, script: string): string {
  return commands[pm].run(script);
}

export function installCommand(pm: PackageManager): string {
  return commands[pm].install;
}

/**
 * Writes package.json, README and .gitignore from the model. With a monorepo, the app moves
 * to `apps/web` and the workspace root (with the README) is written around it.
 */
export function finalize(model: ProjectModel, ctx: Ctx): void {
  const { framework } = ctx.selection;
  const withVersions = (names: Set<string>) =>
    sortRecord(
      Object.fromEntries(
        [...names].map((n) => [n, knownGoodVersion(n, framework)]),
      ),
    );

  model.files.set(
    "package.json",
    json({
      name: model.monorepo ? APP_NAME : ctx.selection.name,
      private: true,
      version: "0.1.0",
      type: "module",
      ...model.pkg.fields,
      scripts: model.pkg.scripts,
      ...(model.pkg.dependencies.size
        ? { dependencies: withVersions(model.pkg.dependencies) }
        : {}),
      devDependencies: withVersions(model.pkg.devDependencies),
    }),
  );

  model.files.set(
    ".gitignore",
    file([
      "node_modules",
      "dist",
      ...ctx.ignore,
      ".env",
      ".env.local",
      ".DS_Store",
    ]),
  );
  if (model.monorepo) {
    const rootScripts = writeTurborepo(model, ctx, model.monorepo);
    model.readme.sections.unshift({
      title: "Monorepo",
      body: `This is a Turborepo workspace: the app lives in \`apps/${APP_NAME}\` and \`packages/\` is ready for shared code. Root scripts run the app's tasks through turbo, which caches their results.`,
    });
    model.files.set("README.md", readme(model, ctx, rootScripts));
    return;
  }
  model.files.set(
    "README.md",
    readme(model, ctx, Object.keys(model.pkg.scripts)),
  );
}

function readme(model: ProjectModel, ctx: Ctx, scriptNames: string[]): string {
  const { name, packageManager: pm } = ctx.selection;
  const scripts = scriptNames.filter((s) => s !== "dev");
  return file([
    `# ${name}`,
    "",
    `Stack: ${model.readme.stack.join(", ")}.`,
    "",
    "## Getting started",
    "",
    "```bash",
    installCommand(pm),
    runCommand(pm, "dev"),
    "```",
    "",
    "## Scripts",
    "",
    ...scripts.map((s) => `- \`${runCommand(pm, s)}\``),
    ...model.readme.sections.flatMap((section) => [
      "",
      `## ${section.title}`,
      "",
      section.body,
    ]),
    "",
    "## Push to GitHub",
    "",
    "Create an empty repository on GitHub, then:",
    "",
    "```bash",
    "git init",
    "git add .",
    'git commit -m "Initial commit"',
    "git branch -M main",
    `git remote add origin https://github.com/<your-username>/${name}.git`,
    "git push -u origin main",
    "```",
  ]);
}
