#!/usr/bin/env node
import { createRequire } from "node:module";
import * as p from "@clack/prompts";
import {
  blockerFor,
  categoryOrder,
  frameworkCatalog,
  generate,
  getFramework,
  getPreset,
  presets,
  installCommand,
  modules,
  runCommand,
  singleSelectCategories,
  toProjectName,
  validate,
  type Category,
  type FrameworkId,
  type Module,
  type Selection,
} from "@stackforge/core";
import {
  detectPackageManager,
  helpText,
  parseCliArgs,
  type CliArgs,
} from "./args";
import { isFreeTarget, packageDirs, run, writeProject } from "./project";

const categoryLabels: Record<Category, string> = {
  style: "Styling",
  ui: "UI library",
  state: "State management",
  routing: "Routing",
  data: "Data fetching",
  forms: "Forms",
  i18n: "Internationalization",
  backend: "Backend",
  testing: "Testing",
  quality: "Code quality",
  seo: "SEO & AI visibility",
  tooling: "Tooling",
  deploy: "Deploy",
  ai: "AI agents",
};

const NAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

/** Frameworks that have an adapter, in display order. */
const availableFrameworks = frameworkCatalog.filter((f) => getFramework(f.id));

const supports = (mod: Module, framework: FrameworkId) =>
  mod.frameworks === "all" || mod.frameworks.includes(framework);

/** Ends the run when the user presses Ctrl+C or Esc in a prompt. */
function answer<T>(value: T): Exclude<T, symbol> {
  if (p.isCancel(value)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }
  return value as Exclude<T, symbol>;
}

function version(): string {
  const pkg = createRequire(import.meta.url)("../package.json") as {
    version: string;
  };
  return pkg.version;
}

function printList(): void {
  console.log("Presets:");
  for (const p of presets)
    console.log(`  ${p.id.padEnd(20)}${p.description.en}`);
  console.log("\nFrameworks:");
  for (const f of availableFrameworks)
    console.log(`  ${f.id.padEnd(12)}${f.name}`);
  for (const category of categoryOrder) {
    const inCategory = modules.filter((m) => m.category === category);
    if (!inCategory.length) continue;
    const single = singleSelectCategories.has(category) ? " (pick one)" : "";
    console.log(`\n${categoryLabels[category]}${single}:`);
    for (const m of inCategory) {
      const where = m.frameworks === "all" ? "all" : m.frameworks.join(", ");
      console.log(`  ${m.id.padEnd(20)}${m.name} — ${where}`);
    }
  }
}

/** Asks for each category's modules, re-asking a category whose picks don't fit together. */
async function pickModules(base: Selection): Promise<string[]> {
  let picked: string[] = [];
  for (const category of categoryOrder) {
    const options = modules.filter(
      (m) => m.category === category && supports(m, base.framework),
    );
    if (!options.length) continue;

    for (;;) {
      const current = { ...base, modules: picked };
      const choices = options.map((m) => {
        const blocker = blockerFor(current, m.id);
        return {
          value: m.id,
          label: m.name,
          hint: blocker ? blocker.message : m.description.en,
          disabled: blocker !== null,
        };
      });
      const label = categoryLabels[category];
      const chosen = singleSelectCategories.has(category)
        ? [
            answer(
              await p.select({
                message: label,
                options: [{ value: "", label: "None" }, ...choices],
              }),
            ),
          ].filter(Boolean)
        : answer(
            await p.multiselect({
              message: `${label} (space to toggle, enter to continue)`,
              options: choices,
              required: false,
            }),
          );

      const next = [...picked, ...chosen];
      const result = validate({ ...base, modules: next });
      const problems = result.ok
        ? []
        : result.errors.filter(
            (e) => e.moduleId && chosen.includes(e.moduleId),
          );
      if (!problems.length) {
        picked = next;
        break;
      }
      for (const e of problems) p.log.error(e.message);
    }
  }
  return picked;
}

/** Fills in everything the flags left open, asking unless --yes or there's no terminal. */
async function collect(
  input: CliArgs,
  interactive: boolean,
): Promise<Selection> {
  const preset =
    input.preset === undefined ? undefined : getPreset(input.preset);
  if (input.preset !== undefined && !preset)
    throw new Error(
      `Unknown preset "${input.preset}". Presets: ${presets.map((p) => p.id).join(", ")}.`,
    );
  // A preset answers the framework and module questions; explicit flags still win.
  const args: CliArgs = {
    ...input,
    framework: input.framework ?? preset?.framework,
    modules: input.modules ?? preset?.modules,
  };
  const packageManager =
    args.packageManager ??
    detectPackageManager(process.env.npm_config_user_agent);

  const name =
    args.name ??
    (interactive
      ? answer(
          await p.text({
            message: "Project name",
            placeholder: "my-app",
            defaultValue: "my-app",
            validate: (v) =>
              !v || NAME_PATTERN.test(v)
                ? undefined
                : `Use lowercase letters, digits, "-", "." or "_" (e.g. ${toProjectName(v)}).`,
          }),
        )
      : "my-app");

  const framework =
    args.framework ??
    (interactive
      ? answer(
          await p.select<FrameworkId>({
            message: "Framework",
            options: availableFrameworks.map((f) => ({
              value: f.id,
              label: f.name,
              hint: f.kind === "meta" ? "full-stack framework" : undefined,
            })),
          }),
        )
      : "react");

  const languages = getFramework(framework)?.languages ?? ["ts"];
  const language =
    args.language ??
    (interactive && languages.length > 1
      ? answer(
          await p.select({
            message: "Language",
            options: [
              { value: "ts" as const, label: "TypeScript" },
              { value: "js" as const, label: "JavaScript" },
            ].filter((l) => languages.includes(l.value)),
          }),
        )
      : languages.includes("ts")
        ? "ts"
        : (languages[0] ?? "ts"));

  const base: Selection = {
    name,
    framework,
    language,
    packageManager,
    siteUrl: args.siteUrl,
    modules: [],
  };
  const picked =
    args.modules ??
    (interactive && getFramework(framework) ? await pickModules(base) : []);
  return { ...base, modules: picked };
}

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.help) return console.log(helpText);
  if (args.version) return console.log(version());
  if (args.list) return printList();
  if (args.mcp) {
    // stdout carries the protocol, so nothing else may print there.
    const { startMcpServer } = await import("./mcp");
    return startMcpServer(version());
  }

  const interactive = !args.yes && process.stdin.isTTY === true;
  p.intro(`create-pickstack ${version()}`);
  const selection = await collect(args, interactive);

  const dir = selection.name;
  if (!isFreeTarget(dir))
    throw new Error(`Directory "${dir}" already exists and is not empty.`);

  const result = await generate(selection);
  if (!result.ok)
    throw new Error(result.errors.map((e) => e.message).join("\n"));
  if (result.autoAdded.length)
    p.log.info(`Also added: ${result.autoAdded.join(", ")}`);
  for (const w of result.warnings) p.log.warn(w);

  await writeProject(dir, result.files);
  p.log.success(`Created ${dir}/ (${result.files.size} files)`);

  let git = args.git;
  let install = args.install;
  if (interactive) {
    if (git)
      git = answer(
        await p.confirm({ message: "Initialize a git repository?" }),
      );
    if (install)
      install = answer(await p.confirm({ message: "Install dependencies?" }));
  }

  // Git first: a Husky `prepare` script needs the repository during install.
  if (git) {
    try {
      await run("git init -q", dir, true);
      p.log.success("Initialized a git repository");
    } catch {
      p.log.warn("Skipped git init (is git installed?)");
    }
  }

  const pm = selection.packageManager;
  const projects = packageDirs(result.files);
  if (install) {
    for (const project of projects) {
      const where = project === "." ? dir : `${dir}/${project}`;
      const spin = p.spinner();
      spin.start(`Installing dependencies in ${where} with ${pm}`);
      try {
        await run(installCommand(pm), where, true);
        spin.stop(`Installed dependencies in ${where}`);
      } catch (e) {
        spin.error(`Install failed in ${where}`);
        p.log.message((e as Error).message);
        install = false;
      }
    }
  }

  const steps = projects.map((project) =>
    [
      `cd ${project === "." ? dir : `${dir}/${project}`}`,
      ...(install ? [] : [installCommand(pm)]),
      runCommand(pm, "dev"),
    ].join(" && "),
  );
  p.note(steps.join("\n"), "Next steps");
  p.outro("Happy hacking!");
}

main().catch((e: unknown) => {
  p.log.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
