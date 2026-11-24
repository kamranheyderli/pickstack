import { singleSelectCategories } from "../categories";
import { getFramework } from "../frameworks";
import type { Module, Selection, ValidationError } from "../types";
import { resolve, type ModuleLookup } from "./resolve";

export type ValidationResult =
  | { ok: true; modules: Module[]; autoAdded: string[] }
  | { ok: false; errors: ValidationError[] };

const NAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

export function toProjectName(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "my-app";
}

export function validate(
  selection: Selection,
  lookup?: ModuleLookup,
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!NAME_PATTERN.test(selection.name) || selection.name.length > 214) {
    errors.push({
      code: "invalid-name",
      message: `"${selection.name}" is not a valid package name (lowercase letters, digits, "-", "." and "_").`,
    });
  }

  const framework = getFramework(selection.framework);
  if (!framework) {
    return {
      ok: false,
      errors: [
        ...errors,
        {
          code: "unknown-framework",
          message: `Unknown framework "${selection.framework}".`,
        },
      ],
    };
  }
  if (!framework.languages.includes(selection.language)) {
    errors.push({
      code: "unsupported-language",
      message: `${framework.name} does not support language "${selection.language}".`,
    });
  }

  const { modules, autoAdded, unknown } = resolve(selection.modules, lookup);
  for (const id of unknown) {
    errors.push({
      code: "unknown-module",
      moduleId: id,
      message: `Unknown module "${id}".`,
    });
  }

  for (const mod of modules) {
    if (mod.frameworks !== "all" && !mod.frameworks.includes(framework.id)) {
      errors.push({
        code: "framework-mismatch",
        moduleId: mod.id,
        message: `${mod.name} is not available for ${framework.name}.`,
      });
    }
    if (mod.languages && !mod.languages.includes(selection.language)) {
      errors.push({
        code: "language-mismatch",
        moduleId: mod.id,
        message: `${mod.name} requires ${mod.languages.map((l) => l.toUpperCase()).join(" or ")}.`,
      });
    }
  }

  errors.push(...conflictErrors(modules), ...singleCategoryErrors(modules));

  return errors.length
    ? { ok: false, errors }
    : { ok: true, modules, autoAdded };
}

function conflictErrors(modules: Module[]): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const [i, a] of modules.entries()) {
    for (const b of modules.slice(i + 1)) {
      if (a.conflicts?.includes(b.id) || b.conflicts?.includes(a.id)) {
        errors.push({
          code: "conflict",
          moduleId: a.id,
          otherId: b.id,
          message: `${a.name} and ${b.name} cannot be used together.`,
        });
      }
    }
  }
  return errors;
}

function singleCategoryErrors(modules: Module[]): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const category of singleSelectCategories) {
    const inCategory = modules.filter((m) => m.category === category);
    const [first, ...rest] = inCategory;
    if (!first) continue;
    for (const other of rest) {
      errors.push({
        code: "single-category",
        moduleId: first.id,
        otherId: other.id,
        message: `Pick only one ${category} option: ${first.name} or ${other.name}.`,
      });
    }
  }
  return errors;
}

/**
 * Why `moduleId` cannot be added to the current selection, or `null` if it can.
 * Used by the UI to disable options and explain the reason.
 * Single-select categories are not reported: picking replaces the current choice.
 */
export function blockerFor(
  selection: Selection,
  moduleId: string,
): ValidationError | null {
  if (selection.modules.includes(moduleId)) return null;
  const result = validate({
    ...selection,
    modules: [...selection.modules, moduleId],
  });
  if (result.ok) return null;
  return (
    result.errors.find(
      (e) =>
        e.code !== "single-category" &&
        e.code !== "invalid-name" &&
        (e.moduleId === moduleId || e.otherId === moduleId),
    ) ?? null
  );
}
