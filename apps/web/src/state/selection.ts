import {
  blockerFor,
  categoryOrder,
  getFramework,
  getModule,
  modules,
  singleSelectCategories,
  type Category,
  type FrameworkId,
  type Module,
  type Selection,
  type ValidationError,
} from "@stackforge/core";

export const defaultSelection: Selection = {
  name: "my-app",
  framework: "react",
  language: "ts",
  packageManager: "npm",
  modules: ["tailwind", "redux-toolkit", "react-router", "prettier"],
};

export interface ModuleOption {
  module: Module;
  checked: boolean;
  blocker: ValidationError | null;
}

export interface CategoryGroup {
  category: Category;
  single: boolean;
  options: ModuleOption[];
}

const availableFor = (mod: Module, framework: FrameworkId) =>
  mod.frameworks === "all" || mod.frameworks.includes(framework);

/** Modules for the current framework grouped by category, each with why it is blocked (if it is). */
export function groupOptions(selection: Selection): CategoryGroup[] {
  return categoryOrder
    .map((category) => ({
      category,
      single: singleSelectCategories.has(category),
      options: modules
        .filter(
          (m) =>
            m.category === category && availableFor(m, selection.framework),
        )
        .map((module) => ({
          module,
          checked: selection.modules.includes(module.id),
          blocker: blockerFor(selection, module.id),
        })),
    }))
    .filter((group) => group.options.length > 0);
}

/** Adds or removes a module; in single-select categories picking one replaces the previous. */
export function toggleModule(selection: Selection, id: string): Selection {
  if (selection.modules.includes(id)) {
    return { ...selection, modules: selection.modules.filter((m) => m !== id) };
  }
  const mod = getModule(id);
  const keep = selection.modules.filter((m) => {
    const other = getModule(m);
    return !(
      mod &&
      other &&
      singleSelectCategories.has(mod.category) &&
      other.category === mod.category
    );
  });
  return { ...selection, modules: [...keep, id] };
}

/** Picks `id` (or nothing) in a single-select category. */
export function chooseSingle(
  selection: Selection,
  category: Category,
  id: string | null,
): Selection {
  const rest = selection.modules.filter(
    (m) => getModule(m)?.category !== category,
  );
  return { ...selection, modules: id ? [...rest, id] : rest };
}

/**
 * Drops modules that are not available for the selection's framework or language.
 * Called after framework/language changes so the user never lands on an invalid combination.
 */
export function pruneIncompatible(input: Selection): {
  selection: Selection;
  removed: string[];
} {
  // Frameworks with a single language (Angular: TS only) force it.
  const languages = getFramework(input.framework)?.languages ?? [
    input.language,
  ];
  const selection = languages.includes(input.language)
    ? input
    : { ...input, language: languages[0] ?? input.language };
  const removed = selection.modules.filter((id) => {
    const mod = getModule(id);
    if (!mod || !availableFor(mod, selection.framework)) return true;
    return (
      mod.languages !== undefined && !mod.languages.includes(selection.language)
    );
  });
  if (!removed.length) return { selection, removed };
  return {
    selection: {
      ...selection,
      modules: selection.modules.filter((id) => !removed.includes(id)),
    },
    removed,
  };
}
