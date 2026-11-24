import type { FrameworkId } from "../types";

/**
 * Version sets that were installed and built together (see `pnpm smoke`).
 * This is the only place package versions may appear.
 *
 * TypeScript stays on 6.0: typescript-eslint 8.x peers on `typescript <6.1`.
 */
type VersionSet = Readonly<Record<string, string>>;

const shared: VersionSet = {
  typescript: "~6.0.3",
  tailwindcss: "^4.3.5",
  "@tailwindcss/vite": "^4.3.5",
  axios: "^1.21.1",
  prettier: "^3.10.1",
  "prettier-plugin-svelte": "^4.2.0",
  "prettier-plugin-astro": "^1.1.2",
  "@types/node": "^24.19.2",
  "@tailwindcss/postcss": "^4.3.5",
  postcss: "^8.5.33",
};

const frameworks: Partial<Record<FrameworkId, VersionSet>> = {
  react: {
    react: "^19.3.1",
    "react-dom": "^19.3.1",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    vite: "^8.3.8",
    "@vitejs/plugin-react": "^6.3.0",
    "@reduxjs/toolkit": "^2.15.0",
    "react-redux": "^9.3.1",
    zustand: "^5.1.0",
    "react-router": "^8.5.2",
  },
  vue: {
    vue: "^3.5.46",
    vite: "^8.3.8",
    "@vitejs/plugin-vue": "^6.0.11",
    "vue-tsc": "^3.3.14",
    "@vue/tsconfig": "^0.9.1",
    "@tsconfig/node24": "^24.0.6",
    "@types/node": "^24.19.2",
    pinia: "^4.1.0",
    "@vue/devtools-api": "^8.2.1",
    "vue-router": "^5.5.1",
  },
  svelte: {
    svelte: "^5.59.1",
    "@sveltejs/vite-plugin-svelte": "^7.3.2",
    vite: "^8.3.8",
    "svelte-check": "^4.7.8",
    "@tsconfig/svelte": "^5.0.9",
  },
  sveltekit: {
    "@sveltejs/kit": "^3.4.0",
    "@sveltejs/adapter-static": "^4.0.1",
    "@sveltejs/vite-plugin-svelte": "^7.3.2",
    svelte: "^5.59.1",
    vite: "^8.3.8",
    "svelte-check": "^4.7.8",
  },
  solid: {
    "solid-js": "^1.9.20",
    "vite-plugin-solid": "^2.11.17",
    "@solidjs/router": "^1.0.3",
    vite: "^8.3.8",
  },
  preact: {
    preact: "^11.2.0",
    "@preact/preset-vite": "^2.10.6",
    "preact-iso": "^2.12.2",
    "preact-render-to-string": "^6.8.3",
    vite: "^8.3.8",
  },
  next: {
    next: "^16.4.6",
    react: "^19.3.1",
    "react-dom": "^19.3.1",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "@reduxjs/toolkit": "^2.15.0",
    "react-redux": "^9.3.1",
    zustand: "^5.1.0",
  },
  nuxt: {
    nuxt: "^4.7.0",
    vue: "^3.5.46",
    "vue-router": "^5.5.1",
    "vue-tsc": "^3.3.14",
    pinia: "^4.1.0",
    "@pinia/nuxt": "^1.0.3",
    "@vue/devtools-api": "^8.2.1",
  },
  astro: {
    astro: "^7.4.13",
    "@astrojs/check": "^0.9.12",
  },
  angular: {
    "@angular/build": "^22.3.0",
    "@angular/cli": "^22.3.0",
    "@angular/common": "^22.3.0",
    "@angular/compiler": "^22.3.0",
    "@angular/compiler-cli": "^22.3.0",
    "@angular/core": "^22.3.0",
    "@angular/forms": "^22.3.0",
    "@angular/platform-browser": "^22.3.0",
    "@angular/router": "^22.3.0",
    rxjs: "~7.8.2",
    tslib: "^2.9.1",
  },
};

export class UnknownVersionError extends Error {
  constructor(pkg: string, framework: FrameworkId) {
    super(
      `No known-good version for "${pkg}" (framework: ${framework}). Add it to versions/known-good.ts.`,
    );
    this.name = "UnknownVersionError";
  }
}

export function knownGoodVersion(pkg: string, framework: FrameworkId): string {
  const version = frameworks[framework]?.[pkg] ?? shared[pkg];
  if (!version) throw new UnknownVersionError(pkg, framework);
  return version;
}
