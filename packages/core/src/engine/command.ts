import type { PackageManager, Selection } from "../types";

/** The npm package behind `npm create pickstack` (npm resolves `create <x>` to `create-<x>`). */
export const cliPackage = "create-pickstack";

const runners: Record<PackageManager, string> = {
  npm: "npm create pickstack@latest",
  pnpm: "pnpm create pickstack",
  yarn: "yarn create pickstack",
  bun: "bun create pickstack",
};

/** The bare command that starts the interactive CLI with `pm`. */
export function startCommand(pm: PackageManager): string {
  return runners[pm];
}

/**
 * The one-line terminal command that creates the same project as `selection`. The package
 * manager isn't a flag: the CLI uses the one it was started with.
 */
export function createCommand(selection: Selection): string {
  const flags = [`--framework ${selection.framework}`];
  if (selection.language !== "ts")
    flags.push(`--language ${selection.language}`);
  if (selection.modules.length)
    flags.push(`--modules ${selection.modules.join(",")}`);
  if (selection.siteUrl) flags.push(`--site-url ${selection.siteUrl}`);
  flags.push("--yes");
  // npm passes flags through to the package only after `--`.
  const separator = selection.packageManager === "npm" ? " --" : "";
  return `${runners[selection.packageManager]} ${selection.name}${separator} ${flags.join(" ")}`;
}
