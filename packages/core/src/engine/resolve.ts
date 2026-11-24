import { categoryOrder } from "../categories";
import { getModule } from "../modules";
import type { Module } from "../types";

export type ModuleLookup = (id: string) => Module | undefined;

export interface Resolved {
  modules: Module[];
  autoAdded: string[];
  unknown: string[];
}

/** Adds transitive `requires`, then orders modules so dependencies apply first. */
export function resolve(
  ids: readonly string[],
  lookup: ModuleLookup = getModule,
): Resolved {
  const picked = new Set(ids);
  const found = new Map<string, Module>();
  const unknown: string[] = [];
  const queue = [...picked];

  while (queue.length) {
    const id = queue.shift() as string;
    if (found.has(id) || unknown.includes(id)) continue;
    const mod = lookup(id);
    if (!mod) {
      unknown.push(id);
      continue;
    }
    found.set(id, mod);
    queue.push(...(mod.requires ?? []));
  }

  const autoAdded = [...found.keys()].filter((id) => !picked.has(id)).sort();
  return { modules: sortModules([...found.values()]), autoAdded, unknown };
}

/**
 * Topological sort on `requires`; ties broken by category, `order`, then id, so output is stable.
 */
export function sortModules(modules: Module[]): Module[] {
  const byId = new Map(modules.map((m) => [m.id, m]));
  const pending = [...modules].sort(
    (a, b) =>
      categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category) ||
      (a.order ?? 50) - (b.order ?? 50) ||
      a.id.localeCompare(b.id),
  );
  const done = new Set<string>();
  const result: Module[] = [];

  while (pending.length) {
    const index = pending.findIndex((m) =>
      (m.requires ?? []).every((dep) => done.has(dep) || !byId.has(dep)),
    );
    if (index === -1) {
      throw new Error(
        `Circular requires between: ${pending.map((m) => m.id).join(", ")}`,
      );
    }
    const [next] = pending.splice(index, 1) as [Module];
    done.add(next.id);
    result.push(next);
  }
  return result;
}
