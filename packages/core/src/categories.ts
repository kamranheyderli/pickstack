import type { Category } from "./types";

/** Categories where at most one module can be picked. */
export const singleSelectCategories: ReadonlySet<Category> = new Set([
  "ui",
  "state",
  "routing",
  "forms",
  "i18n",
  "backend",
]);

export const categoryOrder: readonly Category[] = [
  "style",
  "ui",
  "state",
  "routing",
  "data",
  "forms",
  "i18n",
  "backend",
  "testing",
  "quality",
  "seo",
  "tooling",
  "deploy",
  "ai",
];
