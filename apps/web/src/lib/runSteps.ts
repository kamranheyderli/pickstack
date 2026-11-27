import {
  devPorts,
  installCommand,
  runCommand,
  type Selection,
} from "@stackforge/core";
import type { MessageKey } from "../i18n";

export interface RunStep {
  /** What the step does, as a message key. */
  label: MessageKey;
  /** Values for the label, e.g. the project folder. */
  vars?: Record<string, string>;
  /** Shell lines for one terminal, run in order. */
  commands: string[];
}

export interface RunGuide {
  steps: RunStep[];
  /** Where the app runs once started. */
  url: string;
  /** Better Auth needs a secret in server/.env before sign-in works. */
  needsSecret: boolean;
}

/**
 * How to run a generated project, read off its files: one project, a web app with its API in
 * server/ (database first, then the API, then the app), or several independent projects.
 * `start` is how the folder arrives: unzipping the download or cloning the new repository.
 */
export function runGuide(
  files: ReadonlyMap<string, string>,
  selection: Selection,
  name: string,
  start: { kind: "zip" } | { kind: "clone"; url: string },
): RunGuide {
  const pm = selection.packageManager;
  const install = installCommand(pm);
  const dev = runCommand(pm, "dev");
  const steps: RunStep[] = [
    start.kind === "zip"
      ? { label: "run.unzip", commands: [`unzip ${name}.zip`, `cd ${name}`] }
      : {
          label: "run.clone",
          commands: [`git clone ${start.url}`, `cd ${name}`],
        },
  ];
  const url = `http://localhost:${devPorts[selection.framework]}`;

  if (files.has("package.json")) {
    steps.push({ label: "run.start", commands: [install, dev] });
    return { steps, url, needsSecret: false };
  }

  const server = files.get("server/package.json");
  if (server && files.has("web/package.json")) {
    if (files.has("docker-compose.yml"))
      steps.push({ label: "run.database", commands: ["docker compose up -d"] });
    const scripts = (JSON.parse(server) as { scripts?: Record<string, string> })
      .scripts;
    steps.push({
      label: "run.api",
      commands: [
        "cd server",
        ...(files.has("server/.env.example") ? ["cp .env.example .env"] : []),
        install,
        ...(scripts?.["db:push"] ? [runCommand(pm, "db:push")] : []),
        dev,
      ],
    });
    steps.push({
      label: "run.app",
      commands: [`cd ${name}/web`, install, dev],
    });
    return {
      steps,
      url,
      needsSecret:
        files.get("server/.env.example")?.includes("BETTER_AUTH_SECRET=") ??
        false,
    };
  }

  // Several independent projects (e.g. a module federation host and remote): one terminal each.
  const folders = [...files.keys()]
    .filter((path) => /^[^/]+\/package\.json$/.test(path))
    .map((path) => path.slice(0, path.indexOf("/")))
    .sort();
  for (const folder of folders)
    steps.push({
      label: "run.project",
      vars: { folder },
      commands: [`cd ${name}/${folder}`, install, dev],
    });
  return { steps, url, needsSecret: false };
}
