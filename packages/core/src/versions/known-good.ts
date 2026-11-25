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
  wrangler: "^4.168.0",
  zod: "^4.6.7",
  "react-hook-form": "^7.92.0",
  "@hookform/resolvers": "^7.0.9",
  "@tanstack/react-form": "^1.33.5",
  "@tanstack/vue-form": "^1.33.5",
  "@tanstack/solid-form": "^1.33.5",
  "@tanstack/svelte-form": "^1.33.5",
  "@tanstack/angular-form": "^1.33.5",
  // shadcn-svelte's registry pins tailwind-variants 3 for its components.
  "shadcn-svelte": "^1.8.1",
  "tailwind-variants": "^3.3.0",
  cn: "^0.5.2",
  "tw-animate-css": "^1.4.0",
  "@fontsource-variable/inter": "^5.3.0",
  "@angular/material": "^22.3.0",
  "@angular/cdk": "^22.3.0",
  "shadcn-vue": "^2.9.0",
  "shadcn-nuxt": "^2.9.0",
  "reka-ui": "^2.11.0",
  "class-variance-authority": "^0.7.1",
  // PrimeVue 5 and @primeuix/themes 3 moved to the PrimeUI license (key required); v4 is MIT.
  primevue: "^4.5.5",
  "@primeuix/themes": "^2.0.3",
  "@primevue/nuxt-module": "^4.5.5",
  "tailwindcss-primeui": "^0.6.1",
  vuetify: "^4.3.4",
  "vite-plugin-vuetify": "^2.1.3",
  "@mdi/font": "^7.4.47",
  shadcn: "^4.23.0",
  "radix-ui": "^1.8.1",
  "@mui/material": "^9.6.0",
  "@mui/material-nextjs": "^9.6.0",
  "@emotion/react": "^11.14.0",
  "@emotion/styled": "^11.14.1",
  "@emotion/cache": "^11.14.0",
  "@chakra-ui/react": "^3.38.0",
  "next-themes": "^0.4.6",
  "react-icons": "^5.7.0",
  // Mantine 9 peers on react ^19.2.
  "@mantine/core": "^9.8.2",
  "@mantine/hooks": "^9.8.2",
  "postcss-preset-mantine": "^1.18.0",
  "postcss-simple-vars": "^7.0.1",
  "@tanstack/react-router": "^1.170.46",
  "@tanstack/solid-router": "^1.170.43",
  "@tanstack/router-plugin": "^1.169.0",
  "@tanstack/react-query": "^5.108.4",
  "@tanstack/solid-query": "^5.108.4",
  "@tanstack/vue-query": "^5.108.4",
  // v6 is the Svelte 5 (runes) version.
  "@tanstack/svelte-query": "^6.4.7",
  // Replaces the deprecated @tanstack/angular-query-experimental.
  "@tanstack/angular-query": "^5.108.4",
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
    "@module-federation/vite": "^1.25.0",
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

/**
 * GitHub Actions used by the generated CI workflow, pinned to their current major (checked
 * against each action's releases). Node 24 is what setup-node's examples use.
 */
/** Base images and settings for the Dockerfile and wrangler.json the deploy modules write. */
export const deploy = {
  node: "node:24-alpine",
  nginx: "nginx:1.29-alpine",
  bun: "oven/bun:1",
  pnpm: "10",
  /** Cloudflare's `compatibility_date`: the runtime behaviour the project was tested with. */
  cloudflareCompatibilityDate: "2026-11-25",
} as const;

export const githubActions = {
  checkout: "actions/checkout@v7",
  setupNode: "actions/setup-node@v7",
  setupPnpm: "pnpm/action-setup@v6",
  setupBun: "oven-sh/setup-bun@v2",
  node: "24",
  pnpm: "10",
} as const;
