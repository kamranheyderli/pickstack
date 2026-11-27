import {
  getModule,
  singleSelectCategories,
  type Selection,
  type ValidationError,
} from "@stackforge/core";

export interface ModuleEffect {
  /** Files the module adds to this project. */
  added: string[];
  /** Files it changes. */
  changed: string[];
  /** npm packages it brings, across every package.json in the project. */
  packages: string[];
  /** Modules picked along with it because it needs them. */
  alsoAdded: string[];
}

export type ModuleEffectResult =
  { ok: true; effect: ModuleEffect } | { ok: false; error: ValidationError };

const packageNames = (json: string | undefined): Set<string> => {
  if (!json) return new Set();
  const pkg = JSON.parse(json) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  return new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ]);
};

/**
 * What picking `id` does to this selection: the project is generated with and without it and
 * the two are compared, so the answer is exact for this framework, language and other picks.
 */
export async function moduleEffect(
  selection: Selection,
  id: string,
): Promise<ModuleEffectResult> {
  const { generate } = await import("@stackforge/core/generate");
  // In a pick-one category it takes the place of the current pick, as choosing it would.
  const category = getModule(id)?.category;
  const replaces = (m: string) =>
    category !== undefined &&
    singleSelectCategories.has(category) &&
    getModule(m)?.category === category;
  const others = selection.modules.filter((m) => m !== id && !replaces(m));
  const [without, withIt] = await Promise.all([
    generate({ ...selection, modules: others }),
    generate({ ...selection, modules: [...others, id] }),
  ]);
  if (!withIt.ok) {
    // The error about this module (an invalid result always has one), worded by the caller
    // like the chips' own reasons.
    const [first] = withIt.errors;
    const error =
      withIt.errors.find((e) => e.moduleId === id || e.otherId === id) ?? first;
    if (!error) throw new Error("generation failed without an error");
    return { ok: false, error };
  }
  // The selection without it can be invalid too (another pick needs it); compare against nothing.
  const before = without.ok ? without.files : new Map<string, string>();
  const added: string[] = [];
  const changed: string[] = [];
  const packages = new Set<string>();
  for (const [path, content] of withIt.files) {
    const old = before.get(path);
    if (old === undefined) added.push(path);
    else if (old !== content) changed.push(path);
    if (path.endsWith("package.json")) {
      const had = packageNames(old);
      for (const name of packageNames(content))
        if (!had.has(name)) packages.add(name);
    }
  }
  return {
    ok: true,
    effect: {
      added,
      changed,
      packages: [...packages].sort(),
      alsoAdded: withIt.autoAdded.filter((m) => !selection.modules.includes(m)),
    },
  };
}
