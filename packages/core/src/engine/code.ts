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
    (a, b) => rank(a) - rank(b) || compareSources(a.from, b.from),
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

/**
 * Compares module paths as Biome does: segment by segment (`@mui/material/styles` sorts before
 * `@mui/material-nextjs` because `material` is a prefix), and `../` paths before `./` ones.
 */
function compareSources(a: string, b: string): number {
  // Relative paths: the farther a path climbs (`../`), the earlier it sorts.
  const depth = (path: string) => (path.match(/\.\.\//g) ?? []).length;
  const climb = depth(b) - depth(a);
  if (climb !== 0) return climb;
  const left = a.split("/");
  const right = b.split("/");
  for (let i = 0; i < Math.min(left.length, right.length); i++) {
    const order = (left[i] as string).localeCompare(right[i] as string);
    if (order !== 0) return order;
  }
  return left.length - right.length;
}

/**
 * Orders imported names like Biome: letters compare case-insensitively, and where only the
 * case differs the uppercase letter comes first (`MantineProvider` before `mantineHtmlProps`).
 */
function byName(a: string, b: string): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const x = a[i] as string;
    const y = b[i] as string;
    if (x === y) continue;
    const order = x.toLowerCase().localeCompare(y.toLowerCase());
    if (order !== 0) return order;
    return x === x.toUpperCase() ? -1 : 1;
  }
  return a.length - b.length;
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

/** Code to print as-is inside a config object, e.g. an imported identifier. */
export interface RawCode {
  readonly raw: string;
}

export function raw(code: string): RawCode {
  return { raw: code };
}

function isRaw(value: unknown): value is RawCode {
  return typeof value === "object" && value !== null && "raw" in value;
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/** A JS literal for config files: like JSON, with bare keys and `raw()` values as code. */
export function jsLiteral(value: unknown): string {
  if (isRaw(value)) return value.raw;
  if (Array.isArray(value)) return `[${value.map(jsLiteral).join(", ")}]`;
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value).map(
      ([key, item]) =>
        `${IDENTIFIER.test(key) ? key : JSON.stringify(key)}: ${jsLiteral(item)}`,
    );
    return entries.length ? `{ ${entries.join(", ")} }` : "{}";
  }
  return JSON.stringify(value);
}

/** `StackList` → `stack-list`, Angular's file and selector naming. */
export function kebab(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}
