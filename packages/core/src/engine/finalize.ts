import { knownGoodVersion } from "../versions/known-good";
import type {
  Ctx,
  FederationSpec,
  PackageManager,
  ProjectModel,
} from "../types";
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
      name: model.monorepo
        ? APP_NAME
        : model.federation
          ? `${ctx.selection.name}-host`
          : ctx.selection.name,
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
  if (model.federation) {
    writeFederation(model, ctx, model.federation);
    return;
  }
  model.files.set(
    "README.md",
    readme(model, ctx, Object.keys(model.pkg.scripts)),
  );
}

/**
 * Micro-frontends: the app goes to `host/` and the remote to `remote/`, two independent
 * projects (own install, own repository). A short root README explains how to run them.
 */
function writeFederation(
  model: ProjectModel,
  ctx: Ctx,
  spec: FederationSpec,
): void {
  const { name, packageManager: pm } = ctx.selection;
  const hostName = `${name}-host`;
  const remoteName = `${name}-remote`;
  model.files.set(
    "README.md",
    readme(model, ctx, Object.keys(model.pkg.scripts), hostName),
  );
  const host = [...model.files];
  model.files.clear();
  for (const [path, content] of host) model.files.set(`host/${path}`, content);
  for (const [path, content] of spec.remote) {
    model.files.set(`remote/${path}`, content);
  }
  model.files.set(
    "remote/README.md",
    file([
      `# ${remoteName}`,
      "",
      `Module Federation remote. It exposes \`./Counter\` at \`http://localhost:${spec.remotePort}/remoteEntry.js\`, which the host loads at runtime.`,
      "",
      "```bash",
      installCommand(pm),
      runCommand(pm, "dev"),
      "```",
      "",
      "Before deploying, set `REMOTE_ORIGIN` in vite.config to the URL the remote is served from, and serve it with CORS headers so the host's origin can load it.",
    ]),
  );
  const start = (dir: string) =>
    `cd ${dir} && ${installCommand(pm)} && ${runCommand(pm, "dev")}`;
  model.files.set(
    "README.md",
    file([
      `# ${name}`,
      "",
      "Micro-frontends with Module Federation, as two independent projects:",
      "",
      `- \`host/\` (${hostName}): the app, on port ${spec.hostPort}. It loads \`Counter\` from the remote at runtime.`,
      `- \`remote/\` (${remoteName}): exposes \`./Counter\`, on port ${spec.remotePort}.`,
      "",
      "Each has its own dependencies and can live in its own repository and deploy on its own schedule.",
      "",
      "## Getting started",
      "",
      "Start the remote, then the host, in two terminals:",
      "",
      "```bash",
      start("remote"),
      "```",
      "",
      "```bash",
      start("host"),
      "```",
      "",
      `Open http://localhost:${spec.hostPort}. If the remote is not running, the host page stays blank.`,
    ]),
  );
}

function readme(
  model: ProjectModel,
  ctx: Ctx,
  scriptNames: string[],
  title = ctx.selection.name,
): string {
  const { packageManager: pm } = ctx.selection;
  const name = title;
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
