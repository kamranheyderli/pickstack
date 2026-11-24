import type { PublicEnv } from "../../types";

/** Vite exposes `VITE_*` variables on `import.meta.env`. */
export function viteEnv(name: string): PublicEnv {
  const key = `VITE_${name}`;
  return { key, read: `import.meta.env.${key}` };
}
