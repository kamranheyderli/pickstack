import { inject, track } from "@vercel/analytics";
import type { Selection } from "@stackforge/core";

/** Page views with Vercel Web Analytics: no cookies, nothing personal. */
export function startAnalytics(): void {
  inject();
}

export type Action =
  | "download"
  | "run-in-browser"
  | "create-on-github"
  | "copy-link"
  | "copy-command";

/**
 * Records what someone did with a stack, to see which stacks people take. Only the framework,
 * the language and the module ids are sent (custom events need a Vercel plan that has them).
 */
export function trackAction(action: Action, selection: Selection): void {
  track(action, {
    framework: selection.framework,
    language: selection.language,
    modules: selection.modules.length,
    stack: [selection.framework, ...[...selection.modules].sort()]
      .join(",")
      .slice(0, 255),
  });
}
