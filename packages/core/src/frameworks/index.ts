import type { FrameworkAdapter, FrameworkId } from "../types";
import { angularAdapter } from "./angular/adapter";
import { astroAdapter } from "./astro/adapter";
import { nextAdapter } from "./next/adapter";
import { nuxtAdapter } from "./nuxt/adapter";
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
  nextAdapter,
  nuxtAdapter,
  sveltekitAdapter,
  astroAdapter,
  angularAdapter,
];

const byId = new Map<string, FrameworkAdapter>(
  frameworks.map((f) => [f.id, f]),
);

export function getFramework(
  id: FrameworkId | string,
): FrameworkAdapter | undefined {
  return byId.get(id);
}
