/**
 * Measures how much client JavaScript each module adds, by building real projects: each
 * framework's minimal project, then the same project with one module (on top of the modules it
 * needs). It counts the JavaScript the home page loads: the scripts and module preloads in its
 * HTML and everything they import statically, in gzip bytes; lazy chunks (a component library's
 * unused components, other routes) are left out, and tree-shaking is counted. Writes
 * apps/web/src/data/bundle-sizes.json; rerun after changing known-good versions.
 *
 *   pnpm bundle-size                 every framework
 *   pnpm bundle-size --filter=vue    only these frameworks (comma-separated)
 */
import { spawn } from "node:child_process";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { availableParallelism, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { gzipSync } from "node:zlib";
import {
  frameworkCatalog,
  generate,
  getFramework,
  modules,
  type FrameworkId,
  type Selection,
} from "../packages/core/src";

const out = join(import.meta.dirname, "../apps/web/src/data/bundle-sizes.json");
const root = join(tmpdir(), "stackforge-bundle-size");
const only = process.argv
  .find((a) => a.startsWith("--filter="))
  ?.slice("--filter=".length)
  .split(",");

/** Where builds keep the home page's HTML, with the folder its "/" URLs start from. */
const htmlFiles: [html: string, publicRoot: string][] = [
  ["dist/index.html", "dist"],
  ["dist/browser/index.html", "dist/browser"],
  [".next/server/app/index.html", ".next/.."],
  [".output/public/index.html", ".output/public"],
];

function run(
  cmd: string,
  args: string[],
  cwd: string,
  env: Record<string, string> = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      env: { ...process.env, CI: "1", ...env },
    });
    let output = "";
    child.stdout.on("data", (d: Buffer) => (output += d.toString()));
    child.stderr.on("data", (d: Buffer) => (output += d.toString()));
    child.on("close", (code) =>
      code === 0
        ? resolve(output)
        : reject(new Error(`${cmd} ${args.join(" ")} in ${cwd}\n${output}`)),
    );
  });
}

let nextPort = 4700;
/** The home page from the built server, for builds that render it on request (Nuxt, SvelteKit). */
async function servedHome(app: string): Promise<string | null> {
  const nuxt = await readFile(join(app, ".output/server/index.mjs")).then(
    () => true,
    () => false,
  );
  const kit = await readdir(join(app, ".svelte-kit/output")).then(
    () => true,
    () => false,
  );
  if (!nuxt && !kit) return null;
  const port = nextPort++;
  const child = nuxt
    ? spawn("node", [".output/server/index.mjs"], {
        cwd: app,
        env: { ...process.env, PORT: String(port) },
      })
    : spawn("pnpm", ["exec", "vite", "preview", "--port", String(port)], {
        cwd: app,
      });
  try {
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const html = await fetch(`http://localhost:${port}/`).then(
        (res) => (res.ok ? res.text() : null),
        () => null,
      );
      if (html) return html;
    }
    throw new Error(`${app}: the built server didn't answer on ${port}`);
  } finally {
    child.kill();
  }
}

/** The .js files a page loads up front: its scripts, module preloads and their static imports. */
async function initialJs(
  html: string,
  htmlDir: string,
  publicRoot: string,
): Promise<string[]> {
  const resolveUrl = (url: string, from: string) => {
    const clean = url.split(/[?#]/)[0] ?? url;
    if (clean.startsWith("/_next/"))
      return join(publicRoot, ".next", clean.slice("/_next/".length));
    return clean.startsWith("/") ? join(publicRoot, clean) : join(from, clean);
  };
  const queue = [
    ...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g),
    ...html.matchAll(/<link\b[^>]*\brel="modulepreload"[^>]*\bhref="([^"]+)"/g),
    ...html.matchAll(/<link\b[^>]*\bhref="([^"]+)"[^>]*\brel="modulepreload"/g),
  ]
    .map((m) => m[1] ?? "")
    .filter((url) => /\.m?js(\?|$)/.test(url) && !/^(https?:)?\/\//.test(url))
    .map((url) => resolveUrl(url, htmlDir));
  // SvelteKit starts its app with inline `import("./_app/...")` calls in the page.
  for (const m of html.matchAll(/import\(\s*"([^"]+\.m?js)"\s*\)/g))
    if (m[1]) queue.push(resolveUrl(m[1], htmlDir));
  const seen = new Set<string>();
  while (queue.length) {
    const file = queue.pop() as string;
    if (seen.has(file)) continue;
    const code = await readFile(file, "utf8").catch(() => null);
    if (code === null) continue;
    seen.add(file);
    // Static imports only: `import"./a.js"`, `from"./a.js"`; `import("./a.js")` stays lazy.
    for (const m of code.matchAll(
      /(?:\bimport|\bfrom)\s*["']([^"']+\.m?js)["']/g,
    ))
      if (m[1]) queue.push(resolveUrl(m[1], dirname(file)));
  }
  return [...seen];
}

/** Builds the selection and returns its client JS in gzip bytes. */
async function measure(selection: Selection, key: string): Promise<number> {
  const result = await generate(selection);
  if (!result.ok) throw new Error(`${key}: ${result.errors[0]?.message}`);
  const dir = join(root, key);
  await rm(dir, { recursive: true, force: true });
  for (const [path, content] of result.files) {
    const target = join(dir, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  // With an API in server/, only the app in web/ reaches the browser; a Turborepo builds from
  // the root and keeps the app in apps/web.
  const project = result.files.has("web/package.json") ? join(dir, "web") : dir;
  const app = result.files.has("apps/web/package.json")
    ? join(dir, "apps/web")
    : project;
  // Modules that stay off until configured (Sentry's DSN, an analytics site ID) would be
  // dropped as dead code; every variable in .env.example gets a placeholder.
  const env: Record<string, string> = {};
  for (const [path, content] of result.files)
    if (path.endsWith(".env.example"))
      for (const match of content.matchAll(/^([A-Z][A-Z0-9_]*)=/gm))
        if (match[1]) env[match[1]] = "https://example.com/1";
  await run(
    "pnpm",
    ["install", "--prefer-offline", "--config.confirmModulesPurge=false"],
    project,
  );
  await run("pnpm", ["run", "build"], project, env);
  let page: { html: string; dir: string; root: string } | null = null;
  for (const [html, publicRoot] of htmlFiles) {
    const text = await readFile(join(app, html), "utf8").catch(() => null);
    if (text !== null) {
      page = {
        html: text,
        dir: dirname(join(app, html)),
        root: join(app, publicRoot),
      };
      break;
    }
  }
  if (!page) {
    // Angular puts the app in dist/<name>/browser.
    const names = await readdir(join(app, "dist")).catch(() => []);
    for (const name of names) {
      const html = join(app, "dist", name, "browser/index.html");
      const text = await readFile(html, "utf8").catch(() => null);
      if (text !== null)
        page = { html: text, dir: dirname(html), root: dirname(html) };
    }
  }
  if (!page) {
    const html = await servedHome(app);
    const root = (await readdir(join(app, ".output/public")).then(
      () => true,
      () => false,
    ))
      ? join(app, ".output/public")
      : join(app, ".svelte-kit/output/client");
    if (html) page = { html, dir: root, root };
  }
  if (!page) {
    await rm(dir, { recursive: true, force: true });
    throw new Error(`${key}: no home page found`);
  }
  const files = await initialJs(page.html, page.dir, page.root);
  let bytes = 0;
  for (const file of files) bytes += gzipSync(await readFile(file)).length;
  await rm(dir, { recursive: true, force: true });
  return bytes;
}

async function pool<T>(
  items: T[],
  size: number,
  fn: (item: T) => Promise<void>,
) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) await fn(items[next++] as T);
    }),
  );
}

interface Job {
  framework: FrameworkId;
  /** The modules built together; the empty set is the minimal project. */
  modules: string[];
}

const selectionFor = (framework: FrameworkId, picked: string[]): Selection => {
  const language = getFramework(framework)?.languages.includes("ts")
    ? "ts"
    : "js";
  return {
    name: "size-app",
    packageManager: "pnpm",
    framework,
    language,
    modules: picked,
  };
};
const jobKey = (job: Job) =>
  [
    job.framework,
    ...(job.modules.length ? [...job.modules].sort() : ["minimal"]),
  ].join("-");

// Each module is measured against the minimal project plus the modules it pulls in, so the
// numbers add up: shadcn/ui's doesn't count Tailwind again.
const plan: { framework: FrameworkId; module: string; base: Job; with: Job }[] =
  [];
for (const fw of frameworkCatalog) {
  if (only && !only.includes(fw.id)) continue;
  for (const mod of modules) {
    const result = await generate(selectionFor(fw.id, [mod.id]));
    if (!result.ok) continue;
    const needs = result.autoAdded.filter((m) => m !== mod.id);
    plan.push({
      framework: fw.id,
      module: mod.id,
      base: { framework: fw.id, modules: needs },
      with: { framework: fw.id, modules: [...needs, mod.id] },
    });
  }
}
const jobs = new Map<string, Job>();
for (const p of plan) {
  jobs.set(jobKey(p.base), p.base);
  jobs.set(jobKey(p.with), p.with);
}
for (const fw of new Set(plan.map((p) => p.framework)))
  jobs.set(jobKey({ framework: fw, modules: [] }), {
    framework: fw,
    modules: [],
  });

console.log(`Bundle size: ${jobs.size} builds in ${root}`);
const sizes = new Map<string, number>();
const failed: string[] = [];
let done = 0;
await pool(
  [...jobs.entries()],
  Math.max(1, Math.min(4, availableParallelism() - 1)),
  async ([key, job]) => {
    try {
      sizes.set(
        key,
        await measure(selectionFor(job.framework, job.modules), key),
      );
    } catch (error) {
      failed.push(key);
      console.error(String(error).slice(0, 2000));
    }
    console.log(`${++done}/${jobs.size} ${key} ${sizes.get(key) ?? "failed"}`);
  },
);

// Earlier results stay for frameworks this run skipped.
const previous = (
  await readFile(out, "utf8")
    .then((text) => JSON.parse(text) as { frameworks: Record<string, unknown> })
    .catch(() => ({ frameworks: {} }))
).frameworks;
const frameworks: Record<
  string,
  { base: number; modules: Record<string, number> }
> = {};
for (const [id, value] of Object.entries(previous))
  if (only && !only.includes(id)) frameworks[id] = value as never;
for (const fw of new Set(plan.map((p) => p.framework))) {
  const base = sizes.get(jobKey({ framework: fw, modules: [] }));
  if (base === undefined) continue;
  const mods: Record<string, number> = {};
  for (const p of plan.filter((p) => p.framework === fw)) {
    const before = sizes.get(jobKey(p.base));
    const after = sizes.get(jobKey(p.with));
    if (before === undefined || after === undefined) continue;
    // Chunk hashes and names shift a few bytes; under 100 B is noise.
    const delta = after - before;
    mods[p.module] = Math.abs(delta) < 100 ? 0 : delta;
  }
  frameworks[fw] = { base, modules: mods };
}
await mkdir(dirname(out), { recursive: true });
await writeFile(
  out,
  `${JSON.stringify({ unit: "gzip bytes of client JavaScript", frameworks }, null, 2)}\n`,
);
console.log(`\nWrote ${out}`);
if (failed.length) {
  console.error(`Failed: ${failed.join(", ")}`);
  process.exitCode = 1;
}
