import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";

/** True when `dir` doesn't exist yet or is empty, so writing there overwrites nothing. */
export function isFreeTarget(dir: string): boolean {
  return !existsSync(dir) || readdirSync(dir).length === 0;
}

export async function writeProject(
  dir: string,
  files: ReadonlyMap<string, string>,
): Promise<void> {
  const root = resolve(dir);
  for (const [path, content] of files) {
    const target = join(root, path);
    // Generated paths are relative; refuse anything that would land outside the project.
    if (!target.startsWith(root + sep)) throw new Error(`Unsafe path: ${path}`);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }
}

/**
 * Directories holding a package.json, relative to the project: the root, or (when the generator
 * wrote several independent projects, like a host and a remote) each of those.
 */
export function packageDirs(files: ReadonlyMap<string, string>): string[] {
  if (files.has("package.json")) return ["."];
  return [...files.keys()]
    .filter((p) => /^[^/]+\/package\.json$/.test(p))
    .map((p) => p.slice(0, p.indexOf("/")))
    .sort();
}

/** Runs a shell command in `cwd`; `quiet` captures output and shows it only on failure. */
export function run(
  command: string,
  cwd: string,
  quiet = false,
): Promise<void> {
  return new Promise((done, fail) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      stdio: quiet ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let output = "";
    child.stdout?.on("data", (d: Buffer) => (output += d.toString()));
    child.stderr?.on("data", (d: Buffer) => (output += d.toString()));
    child.on("error", fail);
    child.on("close", (code) =>
      code === 0
        ? done()
        : fail(new Error(`"${command}" failed (exit ${code})\n${output}`)),
    );
  });
}
