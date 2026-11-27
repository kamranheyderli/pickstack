import type { Category } from "./types";

/** Categories where at most one module can be picked. */
export const singleSelectCategories: ReadonlySet<Category> = new Set([
  "ui",
  "state",
  "routing",
  "forms",
  "validation",
  "i18n",
  "backend",
  "database",
  "auth",
  "monitoring",
]);

export const categoryOrder: readonly Category[] = [
  "style",
  "ui",
  "state",
  "routing",
  "data",
  "forms",
  "validation",
  "i18n",
  "backend",
  "database",
  "auth",
  "monitoring",
  "testing",
  "quality",
  "seo",
  "tooling",
  "deploy",
  "ai",
];
