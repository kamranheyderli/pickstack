import type { FrameworkId, PackageManager } from "../types";

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
  eslint: "^10.15.0",
  "@eslint/js": "^10.0.1",
  globals: "^17.14.0",
  "typescript-eslint": "^8.74.0",
  "eslint-config-prettier": "^10.1.8",
  "eslint-plugin-react-hooks": "^7.1.1",
  "eslint-plugin-react-refresh": "^0.5.8",
  "eslint-plugin-solid": "^0.20.1",
  "eslint-plugin-svelte": "^3.24.1",
  "eslint-plugin-vue": "^10.12.1",
  "vue-eslint-parser": "^10.4.2",
  "@vue/eslint-config-typescript": "^14.9.0",
  jiti: "^2.7.0",
  "@nuxt/eslint": "^1.17.0",
  "eslint-plugin-astro": "^3.2.1",
  vitest: "^5.1.1",
  jsdom: "^31.0.1",
  "@types/jsdom": "^30.0.0",
  "@vue/test-utils": "^2.6.0",
  "@testing-library/dom": "^10.4.2",
  "@testing-library/jest-dom": "^8.0.0",
  "@testing-library/user-event": "^14.6.13",
  "@testing-library/react": "^16.3.3",
  "@testing-library/preact": "^3.2.6",
  "@solidjs/testing-library": "^0.8.10",
  "@testing-library/svelte": "^5.4.2",
  "@testing-library/vue": "^8.1.0",
  "@nuxt/test-utils": "^4.4.0",
  "happy-dom": "^21.0.4",
  "@testing-library/angular": "^19.6.0",
  // Exact: biome.json's $schema URL names this version (`biome init` pins with -E).
  "@biomejs/biome": "2.6.8",
  husky: "^9.1.7",
  // Needs Node.js >=22.22.1 (engines); the generated README says so.
  "lint-staged": "^17.6.2",
  sass: "^1.108.2",
  turbo: "^2.11.13",
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
    // create-next-app still scaffolds ESLint 9: eslint-plugin-react/import/jsx-a11y peer on <=9.
    eslint: "^9.39.5",
    "eslint-config-next": "^16.4.6",
    "@vitejs/plugin-react": "^6.3.0",
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
    "@astrojs/sitemap": "^3.7.6",
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
    "angular-eslint": "^22.8.0",
    "@angular-eslint/builder": "^22.8.0",
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

/**
 * `devEngines.packageManager.version` for a Turborepo root. turbo requires a range within one
 * major, and npm enforces it on install, so a caret range of the tested major is used.
 */
const packageManagerRanges: Record<PackageManager, string> = {
  npm: "^11.0.0",
  pnpm: "^10.0.0",
  yarn: "^1.22.0",
  bun: "^1.2.0",
};

export function packageManagerRange(pm: PackageManager): string {
  return packageManagerRanges[pm];
}
