import { knownGoodVersion, packageManagerRange } from "../versions/known-good";
import type { Ctx, MonorepoSpec, ProjectModel } from "../types";
import { file, json } from "./code";

/** Package name and folder of the app inside the workspace (`apps/web`). */
export const APP_NAME = "web";

/** Tasks the root delegates to turbo, when the app has a script for them. */
const TASKS = ["build", "dev", "typecheck", "lint", "test"] as const;
type Task = (typeof TASKS)[number];

function taskConfig(task: Task, spec: MonorepoSpec): Record<string, unknown> {
  switch (task) {
    case "build":
      return {
        dependsOn: ["^build"],
        inputs: ["$TURBO_DEFAULT$", ".env*"],
        outputs: spec.outputs,
        ...(spec.buildEnv.length ? { env: spec.buildEnv } : {}),
      };
    case "dev":
      return { cache: false, persistent: true };
    case "typecheck":
      // `next build`/`svelte-kit sync` write the types typecheck reads; running both at once
      // races on the same files.
      return {
        dependsOn: spec.typecheckAfterBuild
          ? ["^typecheck", "build"]
          : ["^typecheck"],
      };
    default:
      return { dependsOn: [`^${task}`] };
  }
}

/**
 * Moves every file under `apps/web` and writes the workspace root: package.json (turbo,
 * `devEngines.packageManager`, which turbo requires), turbo.json, the workspace declaration
 * and a .gitignore with `.turbo` (without it turbo hashes its own logs and never hits the
 * cache). Returns the root script names for the README.
 */
export function writeTurborepo(
  model: ProjectModel,
  ctx: Ctx,
  spec: MonorepoSpec,
): string[] {
  const { name, packageManager: pm, framework } = ctx.selection;
  const app = [...model.files];
  model.files.clear();
  for (const [path, content] of app) {
    model.files.set(`apps/${APP_NAME}/${path}`, content);
  }

  const tasks = TASKS.filter((task) => task in model.pkg.scripts);
  const scripts = Object.fromEntries(
    tasks.map((task) => [task, `turbo run ${task}`]),
  );
  const workspaces = ["apps/*", "packages/*"];
  model.files.set(
    "package.json",
    json({
      name,
      private: true,
      scripts,
      devDependencies: { turbo: knownGoodVersion("turbo", framework) },
      devEngines: {
        packageManager: { name: pm, version: packageManagerRange(pm) },
      },
      ...(pm === "pnpm" ? {} : { workspaces }),
    }),
  );
  if (pm === "pnpm") {
    model.files.set(
      "pnpm-workspace.yaml",
      file(["packages:", ...workspaces.map((w) => `  - "${w}"`)]),
    );
  }
  model.files.set(
    "turbo.json",
    json({
      $schema: "https://turborepo.dev/schema.json",
      ui: "tui",
      tasks: Object.fromEntries(
        tasks.map((task) => [task, taskConfig(task, spec)]),
      ),
    }),
  );
  model.files.set(
    ".gitignore",
    file([
      "node_modules",
      ".turbo",
      ".env",
      ".env.local",
      ".DS_Store",
      ...model.gitignore,
    ]),
  );
  return Object.keys(scripts);
}
