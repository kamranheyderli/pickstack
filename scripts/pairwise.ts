import {
  frameworks,
  modules,
  singleSelectCategories,
  validate,
  type Category,
  type FrameworkAdapter,
} from "../packages/core/src";
import type { Combo } from "./smoke-combos";

/** One test dimension: language, a single-select category (incl. "none") or a module on/off. */
interface Param {
  key: string;
  values: string[];
}

const NONE = "-";

function paramsFor(framework: FrameworkAdapter): Param[] {
  const available = modules.filter(
    (m) => m.frameworks === "all" || m.frameworks.includes(framework.id),
  );
  const params: Param[] = [
    { key: "language", values: [...framework.languages] },
  ];
  const byCategory = new Map<Category, string[]>();
  for (const mod of available) {
    byCategory.set(mod.category, [
      ...(byCategory.get(mod.category) ?? []),
      mod.id,
    ]);
  }
  for (const [category, ids] of byCategory) {
    if (singleSelectCategories.has(category)) {
      params.push({ key: category, values: [NONE, ...ids] });
    } else {
      for (const id of ids) params.push({ key: id, values: [NONE, id] });
    }
  }
  return params;
}

function toCombo(framework: FrameworkAdapter, row: string[]): Combo {
  const [language, ...rest] = row;
  return {
    framework: framework.id,
    language: language === "ts" ? "ts" : "js",
    modules: rest.filter((v) => v !== NONE),
  };
}

function isValid(combo: Combo): boolean {
  return validate({ name: "smoke", packageManager: "pnpm", ...combo }).ok;
}

/**
 * Greedy all-pairs: repeatedly pick the candidate row covering the most uncovered value pairs.
 * Small parameter counts make the exhaustive candidate scan cheap.
 */
function allPairs(framework: FrameworkAdapter): Combo[] {
  const params = paramsFor(framework);
  const rows = cartesian(params.map((p) => p.values)).filter((row) =>
    isValid(toCombo(framework, row)),
  );
  const pairKey = (i: number, a: string, j: number, b: string) =>
    `${i}=${a}|${j}=${b}`;
  const pairsOf = (row: string[]) => {
    const keys: string[] = [];
    for (let i = 0; i < row.length; i++) {
      for (let j = i + 1; j < row.length; j++)
        keys.push(pairKey(i, row[i] ?? "", j, row[j] ?? ""));
    }
    return keys;
  };

  const uncovered = new Set(rows.flatMap(pairsOf));
  const chosen: string[][] = [];
  while (uncovered.size) {
    let best: string[] | undefined;
    let bestScore = 0;
    for (const row of rows) {
      const score = pairsOf(row).filter((k) => uncovered.has(k)).length;
      if (score > bestScore) [best, bestScore] = [row, score];
    }
    if (!best) break;
    chosen.push(best);
    for (const key of pairsOf(best)) uncovered.delete(key);
  }
  return chosen.map((row) => toCombo(framework, row));
}

function cartesian(lists: string[][]): string[][] {
  return lists.reduce<string[][]>(
    (acc, list) => acc.flatMap((row) => list.map((value) => [...row, value])),
    [[]],
  );
}

export function pairwiseCombos(): Combo[] {
  return frameworks.flatMap(allPairs);
}
