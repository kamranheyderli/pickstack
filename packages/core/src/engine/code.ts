import type { ImportSpec } from "../types";

const isRelative = (from: string) =>
  from.startsWith(".") || from.startsWith("/");
/** Project aliases such as `@/lib`, `~/components`, `$app/env` and `#lib`. */
const isAlias = (from: string) => /^(@\/|[~$#%])/.test(from);
/** Built-ins with a protocol, such as `node:url`. */
const hasProtocol = (from: string) => /^[a-z]+:/.test(from);
const isSideEffect = (spec: ImportSpec) =>
  !spec.default && !spec.named?.length && !spec.types?.length;

/**
 * Merges imports from the same source and orders them the way Biome's organizeImports does
 * (Prettier leaves order alone): `node:` built-ins, packages, aliases, relative paths, then
 * side-effect imports.
 */
export function renderImports(specs: ImportSpec[]): string[] {
  const merged = new Map<string, Required<ImportSpec>>();
  for (const spec of specs) {
    const prev = merged.get(spec.from) ?? {
      from: spec.from,
      default: "",
      named: [],
      types: [],
    };
    merged.set(spec.from, {
      from: spec.from,
      default: spec.default ?? prev.default,
      named: unique([...prev.named, ...(spec.named ?? [])]),
      types: unique([...prev.types, ...(spec.types ?? [])]),
    });
  }

  const rank = (spec: ImportSpec) =>
    isSideEffect(spec)
      ? 4
      : isRelative(spec.from)
        ? 3
        : isAlias(spec.from)
          ? 2
          : hasProtocol(spec.from)
            ? 0
            : 1;
  const ordered = [...merged.values()].sort(
    (a, b) => rank(a) - rank(b) || a.from.localeCompare(b.from),
  );

  const lines: string[] = [];
  for (const spec of ordered) {
    if (isSideEffect(spec)) {
      lines.push(`import "${spec.from}";`);
      continue;
    }
    // Type-only imports come first, as Biome sorts them.
    if (spec.types.length) {
      lines.push(
        `import type { ${[...spec.types].sort(byName).join(", ")} } from "${spec.from}";`,
      );
    }
    const parts: string[] = [];
    if (spec.default) parts.push(spec.default);
    if (spec.named.length)
      parts.push(`{ ${[...spec.named].sort(byName).join(", ")} }`);
    if (parts.length)
      lines.push(`import ${parts.join(", ")} from "${spec.from}";`);
  }
  return lines;
}

function byName(a: string, b: string): number {
  return a.localeCompare(b);
}

export function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

/** Joins lines into file content with a trailing newline. */
export function file(lines: string[]): string {
  return lines.join("\n") + "\n";
}

export function indent(lines: string[], depth = 1): string[] {
  const pad = "  ".repeat(depth);
  return lines.map((line) => (line ? pad + line : line));
}

export function json(value: unknown): string {
  return JSON.stringify(value, null, 2) + "\n";
}

/** Replaces `{{key}}` placeholders. Unknown keys are an error, not a silent blank. */
export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = vars[key];
    if (value === undefined)
      throw new Error(`Template variable "${key}" is not defined`);
    return value;
  });
}

export function sortRecord(
  record: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record).sort(([a], [b]) => a.localeCompare(b)),
  );
}
