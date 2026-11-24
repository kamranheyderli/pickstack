import type { FrameworkId } from "../types";

export interface FrameworkInfo {
  id: FrameworkId;
  name: string;
  kind: "spa" | "meta";
  /** SPEC phase in which the adapter lands. */
  phase: number;
}

/** Every framework from SPEC §4, in display order. Only ids with an adapter are selectable. */
export const frameworkCatalog: readonly FrameworkInfo[] = [
  { id: "react", name: "React", kind: "spa", phase: 1 },
  { id: "vue", name: "Vue", kind: "spa", phase: 2 },
  { id: "angular", name: "Angular", kind: "spa", phase: 4 },
  { id: "svelte", name: "Svelte", kind: "spa", phase: 2 },
  { id: "solid", name: "SolidJS", kind: "spa", phase: 2 },
  { id: "preact", name: "Preact", kind: "spa", phase: 2 },
  { id: "next", name: "Next.js", kind: "meta", phase: 3 },
  { id: "nuxt", name: "Nuxt", kind: "meta", phase: 3 },
  { id: "sveltekit", name: "SvelteKit", kind: "meta", phase: 3 },
  { id: "astro", name: "Astro", kind: "meta", phase: 3 },
];
