import type { FrameworkId, LocalizedText } from "./types";

/** A ready-made stack: a framework and the modules that go well with it. */
export interface Preset {
  id: string;
  name: string;
  description: LocalizedText;
  framework: FrameworkId;
  modules: string[];
}

const quality = ["eslint", "prettier"];
const tests = ["vitest", "testing-library"];

export const presets: readonly Preset[] = [
  {
    id: "react-shadcn",
    name: "React + shadcn/ui",
    description: {
      az: "Vite, shadcn/ui, TanStack Router və Query, Zustand.",
      en: "Vite, shadcn/ui, TanStack Router and Query, Zustand.",
      ru: "Vite, shadcn/ui, TanStack Router и Query, Zustand.",
    },
    framework: "react",
    modules: [
      "tailwind",
      "shadcn",
      "zustand",
      "tanstack-router",
      "tanstack-query",
      ...tests,
      ...quality,
    ],
  },
  {
    id: "react-fullstack",
    name: "Full-stack: React + Express",
    description: {
      az: "React, Express 5 API və Mongoose ilə MongoDB; web/ və server/ ayrıca.",
      en: "React, an Express 5 API and MongoDB with Mongoose; web/ and server/ side by side.",
      ru: "React, API на Express 5 и MongoDB с Mongoose; web/ и server/ рядом.",
    },
    framework: "react",
    modules: [
      "express",
      "mongodb",
      "tailwind",
      "tanstack-query",
      ...tests,
      ...quality,
    ],
  },
  {
    id: "next-shadcn",
    name: "Next.js + shadcn/ui",
    description: {
      az: "App Router, shadcn/ui, Zustand, SEO və AI görünürlüyü.",
      en: "App Router, shadcn/ui, Zustand, SEO and AI visibility.",
      ru: "App Router, shadcn/ui, Zustand, SEO и видимость для ИИ.",
    },
    framework: "next",
    modules: [
      "tailwind",
      "shadcn",
      "zustand",
      "seo",
      "aio",
      ...tests,
      ...quality,
    ],
  },
  {
    id: "vue-pinia",
    name: "Vue + Pinia",
    description: {
      az: "Vite, Vue Router, Pinia, TanStack Query, Tailwind.",
      en: "Vite, Vue Router, Pinia, TanStack Query, Tailwind.",
      ru: "Vite, Vue Router, Pinia, TanStack Query, Tailwind.",
    },
    framework: "vue",
    modules: [
      "tailwind",
      "pinia",
      "vue-router",
      "tanstack-query",
      ...tests,
      ...quality,
    ],
  },
  {
    id: "nuxt-shadcn",
    name: "Nuxt + shadcn-vue",
    description: {
      az: "Nuxt, shadcn-vue, Pinia, SEO.",
      en: "Nuxt, shadcn-vue, Pinia, SEO.",
      ru: "Nuxt, shadcn-vue, Pinia, SEO.",
    },
    framework: "nuxt",
    modules: ["tailwind", "shadcn-vue", "pinia", "seo", ...tests, ...quality],
  },
  {
    id: "sveltekit-shadcn",
    name: "SvelteKit + shadcn-svelte",
    description: {
      az: "SvelteKit, shadcn-svelte, SEO, Vitest.",
      en: "SvelteKit, shadcn-svelte, SEO, Vitest.",
      ru: "SvelteKit, shadcn-svelte, SEO, Vitest.",
    },
    framework: "sveltekit",
    modules: ["tailwind", "shadcn-svelte", "seo", "vitest", ...quality],
  },
  {
    id: "angular-material",
    name: "Angular + Material",
    description: {
      az: "Angular Material, TanStack Query, Vitest.",
      en: "Angular Material, TanStack Query, Vitest.",
      ru: "Angular Material, TanStack Query, Vitest.",
    },
    framework: "angular",
    modules: ["angular-material", "tanstack-query", ...tests, ...quality],
  },
  {
    id: "angular-nestjs",
    name: "Full-stack: Angular + NestJS",
    description: {
      az: "Angular Material və NestJS API: hər ikisində modul, DI və decorator-lar; web/ və server/ ayrıca.",
      en: "Angular Material and a NestJS API: modules, DI and decorators on both sides; web/ and server/ side by side.",
      ru: "Angular Material и API на NestJS: модули, DI и декораторы с обеих сторон; web/ и server/ рядом.",
    },
    framework: "angular",
    modules: ["nestjs", "angular-material", ...tests, ...quality],
  },
  {
    id: "astro-content",
    name: "Astro content site",
    description: {
      az: "Astro, Tailwind, SEO, llms.txt ilə AI görünürlüyü.",
      en: "Astro, Tailwind, SEO, AI visibility with llms.txt.",
      ru: "Astro, Tailwind, SEO, видимость для ИИ с llms.txt.",
    },
    framework: "astro",
    modules: ["tailwind", "seo", "aio", ...quality],
  },
];

export function getPreset(id: string): Preset | undefined {
  return presets.find((p) => p.id === id);
}
