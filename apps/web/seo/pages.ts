import {
  createCommand,
  frameworkCatalog,
  generate,
  getFramework,
  modules,
  presets,
  type FrameworkInfo,
  type Module,
  type Selection,
} from "@stackforge/core";
import { lineDiff, type DiffLine } from "../src/lib/diff";

/** One prerendered landing page for a stack people search for ("react tanstack query starter"). */
export interface StackPage {
  /** URL path with leading and trailing slash, e.g. `/stacks/react/tanstack-query/`. */
  path: string;
  title: string;
  description: string;
  heading: string;
  intro: string;
  framework: FrameworkInfo;
  module?: Module;
  selection: Selection;
  command: string;
  /** Opens the configurator with this selection. */
  configurator: string;
  packages: { name: string; version: string; dev: boolean }[];
  added: { path: string; content: string }[];
  changed: { path: string; diff: DiffLine[] }[];
  files: string[];
  related: { label: string; path: string }[];
  breadcrumb: { label: string; path: string }[];
}

/** Longest file shown in full; longer ones are cut with a note. */
export const MAX_LINES = 120;

const available = frameworkCatalog.filter((f) => getFramework(f.id));

const supports = (m: Module, fw: FrameworkInfo) =>
  m.frameworks === "all" || m.frameworks.includes(fw.id);

/** Cuts at a word boundary so a search snippet never ends mid-word. */
const clip = (text: string, max = 158) => {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,:;.]$/, "")}…`;
};

type Deps = Record<string, string>;
function packageDeps(files: Map<string, string>): { deps: Deps; dev: Deps } {
  const json = files.get("package.json");
  if (!json) return { deps: {}, dev: {} };
  const pkg = JSON.parse(json) as {
    dependencies?: Deps;
    devDependencies?: Deps;
  };
  return { deps: pkg.dependencies ?? {}, dev: pkg.devDependencies ?? {} };
}

async function filesFor(
  selection: Selection,
): Promise<Map<string, string> | null> {
  const result = await generate(selection);
  return result.ok ? result.files : null;
}

const selectionFor = (fw: FrameworkInfo, ids: string[]): Selection => ({
  name: "my-app",
  framework: fw.id,
  language: getFramework(fw.id)?.languages.includes("ts") ? "ts" : "js",
  packageManager: "npm",
  modules: ids,
});

const configuratorUrl = (s: Selection) =>
  `/?f=${s.framework}${s.modules.length ? `&m=${s.modules.join(",")}` : ""}`;

/** What `withModules` adds over the bare framework: packages, new files and changed files. */
function changes(base: Map<string, string>, files: Map<string, string>) {
  const before = packageDeps(base);
  const after = packageDeps(files);
  const packages = [
    ...Object.entries(after.deps)
      .filter(([name]) => !(name in before.deps))
      .map(([name, version]) => ({ name, version, dev: false })),
    ...Object.entries(after.dev)
      .filter(([name]) => !(name in before.dev))
      .map(([name, version]) => ({ name, version, dev: true })),
  ];
  const added = [...files]
    .filter(([path]) => !base.has(path))
    .map(([path, content]) => ({ path, content }));
  const changed = [...files]
    .filter(
      ([path, content]) =>
        path !== "package.json" &&
        path !== "README.md" &&
        base.has(path) &&
        base.get(path) !== content,
    )
    .map(([path, content]) => ({
      path,
      diff: lineDiff(base.get(path) ?? "", content),
    }));
  return { packages, added, changed };
}

/**
 * Every landing page: one per framework, one per framework + module it supports, and one per
 * preset. Module pages that need a companion (Husky needs a linter or formatter) get the
 * first one it accepts.
 */
export async function stackPages(): Promise<StackPage[]> {
  const pages: StackPage[] = [];
  const stacks = { label: "Starter templates", path: "/stacks/" };

  for (const fw of available) {
    const baseSelection = selectionFor(fw, []);
    const base = await filesFor(baseSelection);
    if (!base) continue;
    const fwPath = `/stacks/${fw.id}/`;
    const fwModules = modules.filter((m) => supports(m, fw));
    const lang = baseSelection.language === "ts" ? "TypeScript" : "JavaScript";

    pages.push({
      path: fwPath,
      title: `${fw.name} starter template (${lang}) | pickstack`,
      description: clip(
        `Create a ${fw.name} project in one command, then add any of ${fwModules.length} tested modules: UI kits, state, routing, testing, linting, deploy and AI agent configs.`,
      ),
      heading: `${fw.name} starter template`,
      intro: `A clean ${fw.name} ${fw.kind === "meta" ? "app" : "single-page app"} in ${lang}, generated with the official tooling's current versions. Pick the modules you need below, or create it as is.`,
      framework: fw,
      selection: baseSelection,
      command: createCommand(baseSelection),
      configurator: configuratorUrl(baseSelection),
      packages: Object.entries(packageDeps(base).deps).map(
        ([name, version]) => ({
          name,
          version,
          dev: false,
        }),
      ),
      added: [],
      changed: [],
      files: [...base.keys()].sort(),
      related: fwModules.map((m) => ({
        label: `${fw.name} + ${m.name}`,
        path: `${fwPath}${m.id}/`,
      })),
      breadcrumb: [stacks, { label: fw.name, path: fwPath }],
    });

    for (const mod of fwModules) {
      let ids = [mod.id];
      let files = await filesFor(selectionFor(fw, ids));
      if (!files && mod.requiresOneOf?.length) {
        ids = [mod.requiresOneOf[0] as string, mod.id];
        files = await filesFor(selectionFor(fw, ids));
      }
      if (!files) continue;
      const selection = selectionFor(fw, ids);
      const { packages, added, changed } = changes(base, files);
      pages.push({
        path: `${fwPath}${mod.id}/`,
        title: `${fw.name} + ${mod.name} starter template | pickstack`,
        description: clip(
          `${fw.name} with ${mod.name} set up and ready to run: ${mod.description.en} See the generated files and versions, then create it with one command.`,
        ),
        heading: `${fw.name} + ${mod.name}`,
        intro: `${mod.description.en} This page shows exactly what pickstack adds to a ${fw.name} project for ${mod.name}: the packages, the new files and the changes to existing ones. Every combination is installed, built, linted and tested in CI.`,
        framework: fw,
        module: mod,
        selection,
        command: createCommand(selection),
        configurator: configuratorUrl(selection),
        packages,
        added,
        changed,
        files: [...files.keys()].sort(),
        related: [
          ...fwModules
            .filter((m) => m.id !== mod.id && m.category === mod.category)
            .map((m) => ({
              label: `${fw.name} + ${m.name}`,
              path: `${fwPath}${m.id}/`,
            })),
          ...available
            .filter((other) => other.id !== fw.id && supports(mod, other))
            .map((other) => ({
              label: `${other.name} + ${mod.name}`,
              path: `/stacks/${other.id}/${mod.id}/`,
            })),
        ],
        breadcrumb: [
          stacks,
          { label: fw.name, path: fwPath },
          { label: mod.name, path: `${fwPath}${mod.id}/` },
        ],
      });
    }
  }

  for (const preset of presets) {
    const fw = available.find((f) => f.id === preset.framework);
    if (!fw) continue;
    const base = await filesFor(selectionFor(fw, []));
    const selection = selectionFor(fw, preset.modules);
    const files = await filesFor(selection);
    if (!base || !files) continue;
    const { packages, added, changed } = changes(base, files);
    const path = `/stacks/presets/${preset.id}/`;
    pages.push({
      path,
      title: `${preset.name} starter template | pickstack`,
      description: clip(
        `A ready-made ${preset.name} stack: ${preset.description.en} Generated, built and tested; create it with one command.`,
      ),
      heading: `${preset.name} starter`,
      intro: `${preset.description.en} A tested combination you can create in one command and keep extending.`,
      framework: fw,
      selection,
      command: createCommand(selection),
      configurator: `/?p=${preset.id}`,
      packages,
      added,
      changed,
      files: [...files.keys()].sort(),
      related: presets
        .filter((p) => p.id !== preset.id)
        .map((p) => ({ label: p.name, path: `/stacks/presets/${p.id}/` })),
      breadcrumb: [stacks, { label: preset.name, path }],
    });
  }
  return pages;
}
