import { getFramework } from "../frameworks";
import type { Ctx, GenerateResult, Selection } from "../types";
import { finalize } from "./finalize";
import { formatFiles } from "./format";
import { validate } from "./validate";

export interface GenerateOptions {
  /** Run Prettier over the output (default: true). */
  format?: boolean;
}

export function createCtx(
  selection: Selection,
  moduleIds: readonly string[],
): Ctx {
  const framework = getFramework(selection.framework);
  if (!framework) throw new Error(`Unknown framework "${selection.framework}"`);
  const ids = new Set(moduleIds);
  const isTs = selection.language === "ts";
  return {
    selection,
    has: (id) => ids.has(id),
    isTs,
    ext: {
      script: isTs ? "ts" : "js",
      component: framework.componentExt(selection.language),
    },
  };
}

export async function generate(
  selection: Selection,
  options: GenerateOptions = {},
): Promise<GenerateResult> {
  const validation = validate(selection);
  if (!validation.ok) return validation;

  const framework = getFramework(selection.framework);
  if (!framework)
    throw new Error("unreachable: validated framework is missing");

  const moduleIds = validation.modules.map((m) => m.id);
  const ctx = createCtx(selection, moduleIds);

  const model = framework.base(ctx);
  for (const mod of validation.modules) mod.apply(model, ctx);
  framework.render(model, ctx);
  finalize(model, ctx);

  const sorted = new Map(
    [...model.files].sort(([a], [b]) => a.localeCompare(b)),
  );
  const files = options.format === false ? sorted : await formatFiles(sorted);

  return {
    ok: true,
    files,
    modules: moduleIds,
    autoAdded: validation.autoAdded,
    warnings: model.warnings,
  };
}
