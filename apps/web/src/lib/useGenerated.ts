import {
  toProjectName,
  type GenerateResult,
  type Selection,
} from "@stackforge/core";
import { useEffect, useRef, useState } from "react";

export interface Generated {
  result: GenerateResult | null;
  /** Paths that were added or changed by the latest generation (empty on first render). */
  changed: Set<string>;
  /** Files from the generation before the latest one, to diff a changed file against. */
  before: Map<string, string> | null;
  pending: boolean;
}

/** Regenerates on every selection change; only the latest run wins. */
export function useGenerated(selection: Selection): Generated {
  const [state, setState] = useState<Generated>({
    result: null,
    changed: new Set(),
    before: null,
    pending: true,
  });
  const previous = useRef<Map<string, string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, pending: true }));
    const timer = setTimeout(async () => {
      // Loaded on first use: the generator brings Prettier and every template, which the
      // page doesn't need to show its first screen.
      const { generate } = await import("@stackforge/core/generate");
      const result = await generate({
        ...selection,
        name: toProjectName(selection.name),
      });
      if (cancelled) return;
      const changed = new Set<string>();
      if (result.ok && previous.current) {
        for (const [path, content] of result.files) {
          if (previous.current.get(path) !== content) changed.add(path);
        }
      }
      const before = previous.current;
      if (result.ok) previous.current = result.files;
      setState({ result, changed, before, pending: false });
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [selection]);

  return state;
}
