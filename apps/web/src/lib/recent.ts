import type { Selection } from "@stackforge/core";
import { selectionToQuery } from "./url";

const KEY = "stackforge:recent";
const MAX = 5;

/**
 * Stacks this browser took (downloaded, copied, ran or put on GitHub), newest first, as the
 * same query strings shared links use. Storage can be unavailable; then there are none.
 */
export function readRecent(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value)
      ? value.filter((q): q is string => typeof q === "string").slice(0, MAX)
      : [];
  } catch {
    return [];
  }
}

/** Puts the stack first, without repeats; returns the new list. */
export function addRecent(selection: Selection): string[] {
  const query = selectionToQuery(selection);
  const next = [query, ...readRecent().filter((q) => q !== query)].slice(
    0,
    MAX,
  );
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode and the like: the list just isn't kept.
  }
  return next;
}
