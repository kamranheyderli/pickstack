/**
 * Generates real projects and runs install, build, typecheck, lint and format checks.
 *
 *   pnpm smoke --quick         curated set (scripts/smoke-combos.ts)
 *   pnpm smoke                 full pairwise set
 *   pnpm smoke --filter=react  only combos whose id contains "react"
 *   pnpm smoke --presets       only the ready-made stacks (presets.ts)
 *   pnpm smoke --shard=2/4     the 2nd of 4 equal slices (parallel CI jobs)
 *   pnpm smoke --keep          keep generated projects for inspection
 */
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { availableParallelism, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { generate, modules } from "../packages/core/src";
import { pairwiseCombos } from "./pairwise";
import { presetCombos, quickCombos, type Combo } from "./smoke-combos";

interface Outcome {
  id: string;
  ok: boolean;
  /** Seconds per step, to spot slow tools. */
  timings?: string;
  step?: string;
  output?: string;
  ms: number;
}

const args = new Set(process.argv.slice(2));
const filter = [...args]
  .find((a) => a.startsWith("--filter="))
  ?.slice("--filter=".length);
/** `--shard=2/4` as { index: 2, count: 4 }; exits on a malformed value. */
function parseShard(): { index: number; count: number } | undefined {
  const value = [...args]
    .find((a) => a.startsWith("--shard="))
    ?.slice("--shard=".length);
  if (value === undefined) return undefined;
  const [index, count] = value.split("/").map(Number);
  if (!index || !count || index < 1 || index > count) {
    console.error("Use --shard=<index>/<count>, e.g. --shard=1/4.");
    process.exit(1);
  }
  return { index, count };
}
const shard = parseShard();
const keep = args.has("--keep");
const root = join(tmpdir(), "stackforge-smoke");

const comboId = (c: Combo) =>
  [
    c.framework,
    c.language,
    ...(c.modules.length ? c.modules : ["minimal"]),
  ].join("-");

function run(
  cmd: string,
  cmdArgs: string[],
  cwd: string,
): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, cmdArgs, {
      cwd,
      env: { ...process.env, CI: "1" },
    });
    let output = "";
    child.stdout.on("data", (d: Buffer) => (output += d.toString()));
    child.stderr.on("data", (d: Buffer) => (output += d.toString()));
    child.on("close", (code) => resolve({ code: code ?? 1, output }));
  });
}

async function smoke(combo: Combo): Promise<Outcome> {
  const id = comboId(combo);
  const started = Date.now();
  const dir = join(root, id);
  const result = await generate({
    name: "smoke-app",
    packageManager: "pnpm",
    ...combo,
  });
  if (!result.ok) {
    return {
      id,
      ok: false,
      step: "generate",
      output: result.errors.map((e) => e.message).join("\n"),
      ms: 0,
    };
  }

  await rm(dir, { recursive: true, force: true });
  for (const [path, content] of result.files) {
    const target = join(dir, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }

  // One project at the root, or several independent ones side by side (micro-frontends).
  const projects = result.files.has("package.json")
    ? [""]
    : [...result.files.keys()]
        .filter((path) => /^[^/]+\/package\.json$/.test(path))
        .map((path) => path.slice(0, path.indexOf("/")));

  const timings: string[] = [];
  for (const project of projects) {
    const prefix = project ? `${project}:` : "";
    const scripts = Object.keys(
      (
        JSON.parse(
          result.files.get(
            project ? `${project}/package.json` : "package.json",
          ) ?? "{}",
        ) as { scripts?: Record<string, string> }
      ).scripts ?? {},
    );
    const steps: [string, string[]][] = [
      [
        "install",
        ["install", "--prefer-offline", "--config.confirmModulesPurge=false"],
      ],
      ...["build", "typecheck", "lint", "format:check", "check", "test"]
        .filter((s) => scripts.includes(s))
        .map((s): [string, string[]] => [s, ["run", s]]),
    ];

    for (const [name, pnpmArgs] of steps) {
      const step = prefix + name;
      const stepStarted = Date.now();
      const { code, output } = await run("pnpm", pnpmArgs, join(dir, project));
      timings.push(
        `${step} ${((Date.now() - stepStarted) / 1000).toFixed(0)}s`,
      );
      if (code !== 0) {
        return {
          id,
          ok: false,
          step,
          output,
          ms: Date.now() - started,
          timings: timings.join(", "),
        };
      }
    }
  }
  if (!keep) await rm(dir, { recursive: true, force: true });
  return {
    id,
    ok: true,
    ms: Date.now() - started,
    timings: timings.join(", "),
  };
}

async function pool<T, R>(
  items: T[],
  size: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index] as T);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, worker),
  );
  return results;
}

const uncovered = modules.filter(
  (m) => !quickCombos.some((c) => c.modules.includes(m.id)),
);
if (uncovered.length) {
  console.error(
    `Add these modules to scripts/smoke-combos.ts: ${uncovered.map((m) => m.id).join(", ")}`,
  );
  process.exit(1);
}

const source = args.has("--presets")
  ? presetCombos
  : args.has("--quick")
    ? quickCombos
    : pairwiseCombos();
const combos = source
  .filter((c) => !filter || comboId(c).includes(filter))
  // Every n-th combo, so each slice mixes frameworks and takes about as long.
  .filter((_, i) => !shard || i % shard.count === shard.index - 1);
console.log(`Smoke: ${combos.length} combos in ${root}\n`);

const outcomes = await pool(
  combos,
  Math.max(1, Math.min(4, availableParallelism() - 1)),
  async (c) => {
    const outcome = await smoke(c);
    const status = outcome.ok ? "ok  " : `FAIL (${outcome.step})`;
    console.log(
      `${status} ${outcome.id} ${(outcome.ms / 1000).toFixed(1)}s (${outcome.timings ?? ""})`,
    );
    return outcome;
  },
);

const failed = outcomes.filter((o) => !o.ok);
for (const f of failed) {
  console.log(
    `\n--- ${f.id} failed at ${f.step} ---\n${(f.output ?? "").trim().split("\n").slice(-40).join("\n")}`,
  );
}
console.log(`\n${outcomes.length - failed.length}/${outcomes.length} passed`);
process.exitCode = failed.length ? 1 : 0;
