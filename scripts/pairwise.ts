import {
  frameworks,
  getModule,
  modules,
  requiredOneOf,
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

function errorsOf(combo: Combo) {
  const result = validate({ name: "smoke", packageManager: "pnpm", ...combo });
  return result.ok ? [] : result.errors;
}

/** Errors a later pick can still fix (a module that needs one of several others). */
const fixable = new Set(["missing-one-of"]);

/** Small seeded PRNG (mulberry32), so the same modules always give the same combos. */
function random(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How many candidate rows to build per pick; more covers pairs in fewer rows. */
const CANDIDATES = 12;

/**
 * Greedy all-pairs in the style of AETG: each row starts from a pair no row covers yet and
 * fills every other parameter with the value that covers the most uncovered pairs, skipping
 * values the validator rejects. The best of a few candidates is kept. Unlike enumerating
 * every row (over 10^11 for React), memory grows only with the number of pairs.
 */
function allPairs(framework: FrameworkAdapter): Combo[] {
  const params = paramsFor(framework);
  const next = random(framework.id.length * 7919);
  const pairKey = (i: number, a: string, j: number, b: string) =>
    `${i}=${a}|${j}=${b}`;
  // A module's place in the row: its parameter and the value that turns it on.
  const where = new Map<string, number>();
  params.forEach((p, i) => {
    for (const v of p.values) if (v !== NONE) where.set(v, i);
  });

  const uncovered = new Set<string>();
  params.forEach((p, i) => {
    for (let j = i + 1; j < params.length; j++) {
      for (const a of p.values) {
        for (const b of params[j]?.values ?? [])
          uncovered.add(pairKey(i, a, j, b));
      }
    }
  });

  const newPairs = (row: (string | undefined)[], i: number, value: string) => {
    let count = 0;
    row.forEach((other, j) => {
      if (other === undefined || j === i) return;
      const key =
        i < j ? pairKey(i, value, j, other) : pairKey(j, other, i, value);
      if (uncovered.has(key)) count++;
    });
    return count;
  };
  // Unset parameters take their first value: "none" for modules, a supported language.
  const filled = (row: (string | undefined)[]) =>
    row.map((v, k) => v ?? params[k]?.values[0] ?? NONE);
  const hardErrors = (row: (string | undefined)[]) =>
    errorsOf(toCombo(framework, filled(row))).filter(
      (e) => !fixable.has(e.code),
    );

  /** A valid row containing the seed pair, or undefined if none was found. */
  const build = (seed: [number, string, number, string]) => {
    const [i, a, j, b] = seed;
    const row: (string | undefined)[] = params.map(() => undefined);
    row[i] = a;
    row[j] = b;
    // Language first (parameter 0), so a TS-only module is not judged against JS.
    row[0] ??= params[0]?.values.find((language) => {
      row[0] = language;
      return !hardErrors(row).length;
    });
    if (row[0] === undefined || hardErrors(row).length) return undefined;
    const order = params
      .map((_, k) => k)
      .filter((k) => k !== 0 && k !== i && k !== j)
      .sort(() => next() - 0.5);
    for (const k of order) {
      let best: string | undefined;
      let bestScore = -1;
      for (const value of params[k]?.values ?? []) {
        row[k] = value;
        const score = hardErrors(row).length
          ? -1
          : newPairs(row, k, value) + next();
        if (score > bestScore) [best, bestScore] = [value, score];
      }
      row[k] = best ?? NONE;
    }
    // Fix "needs one of" errors: drop the module, or turn on an option it needs.
    for (let attempt = 0; attempt < 5; attempt++) {
      const errors = errorsOf(toCombo(framework, filled(row)));
      if (!errors.length) return filled(row);
      for (const error of errors) {
        const at = where.get(error.moduleId ?? "");
        if (at === undefined) return undefined;
        if (at !== i && at !== j) {
          row[at] = NONE;
          continue;
        }
        const mod = getModule(error.moduleId ?? "");
        const option = (mod ? (requiredOneOf(mod, framework.id) ?? []) : [])
          .map((id) => [where.get(id), id] as const)
          .find(([k, id]) => {
            if (k === undefined || k === i || k === j) return false;
            const trial = [...row];
            trial[k] = id;
            return !hardErrors(trial).length;
          });
        if (!option) return undefined;
        row[option[0] as number] = option[1];
      }
    }
    return undefined;
  };

  const pairsOf = (row: string[]) => {
    const keys: string[] = [];
    for (let i = 0; i < row.length; i++) {
      for (let j = i + 1; j < row.length; j++)
        keys.push(pairKey(i, row[i] ?? "", j, row[j] ?? ""));
    }
    return keys;
  };

  const chosen: string[][] = [];
  while (uncovered.size) {
    const key = uncovered.values().next().value as string;
    const [left, right] = key.split("|") as [string, string];
    const [i, a] = left.split("=") as [string, string];
    const [j, b] = right.split("=") as [string, string];
    let best: string[] | undefined;
    let bestScore = 0;
    for (let c = 0; c < CANDIDATES; c++) {
      const row = build([Number(i), a, Number(j), b]);
      if (!row) continue;
      const score = pairsOf(row).filter((k) => uncovered.has(k)).length;
      if (score > bestScore) [best, bestScore] = [row, score];
    }
    // No valid row holds this pair (e.g. a TS-only module in JS): nothing to cover.
    if (!best) {
      uncovered.delete(key);
      continue;
    }
    chosen.push(best);
    for (const k of pairsOf(best)) uncovered.delete(k);
  }
  return chosen.map((row) => toCombo(framework, row));
}

export function pairwiseCombos(): Combo[] {
  return frameworks.flatMap(allPairs);
}
