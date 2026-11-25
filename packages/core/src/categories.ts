import type { Category } from "./types";

/** Categories where at most one module can be picked. */
export const singleSelectCategories: ReadonlySet<Category> = new Set([
  "ui",
  "state",
  "routing",
  "forms",
]);

export const categoryOrder: readonly Category[] = [
  "style",
  "ui",
  "state",
  "routing",
  "data",
  "forms",
  "testing",
  "quality",
  "seo",
  "tooling",
  "deploy",
  "ai",
];
