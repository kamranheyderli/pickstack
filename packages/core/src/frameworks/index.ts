import type { FrameworkAdapter, FrameworkId } from "../types";
import { preactAdapter } from "./preact/adapter";
import { reactAdapter } from "./react/adapter";
import { solidAdapter } from "./solid/adapter";
import { svelteAdapter } from "./svelte/adapter";
import { sveltekitAdapter } from "./sveltekit/adapter";
import { vueAdapter } from "./vue/adapter";

export const frameworks: readonly FrameworkAdapter[] = [
  reactAdapter,
  vueAdapter,
  svelteAdapter,
  solidAdapter,
  preactAdapter,
  sveltekitAdapter,
];

const byId = new Map<string, FrameworkAdapter>(
  frameworks.map((f) => [f.id, f]),
);

export function getFramework(
  id: FrameworkId | string,
): FrameworkAdapter | undefined {
  return byId.get(id);
}
