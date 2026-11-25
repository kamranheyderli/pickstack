import type { Module } from "../types";
import { agentsMdModule } from "./ai/agents-md";
import { claudeCode } from "./ai/claude-code";
import { copilot } from "./ai/copilot";
import { cursor } from "./ai/cursor";
import { axios } from "./data/axios";
import { biome } from "./quality/biome";
import { eslint } from "./quality/eslint";
import { huskyLintStaged } from "./quality/husky-lint-staged";
import { prettier } from "./quality/prettier";
import { preactIso } from "./routing/preact-iso";
import { reactRouter } from "./routing/react-router";
import { solidRouter } from "./routing/solid-router";
import { vueRouter } from "./routing/vue-router";
import { builtin } from "./state/builtin";
import { pinia } from "./state/pinia";
import { aio } from "./seo/aio";
import { seo } from "./seo/seo";
import { reduxToolkit } from "./state/redux-toolkit";
import { zustand } from "./state/zustand";
import { sass } from "./style/sass";
import { tailwind } from "./style/tailwind";
import { angularMaterial } from "./ui/angular-material";
import { chakraUi } from "./ui/chakra-ui";
import { mantine } from "./ui/mantine";
import { mui } from "./ui/mui";
import { shadcn } from "./ui/shadcn";
import { primevue } from "./ui/primevue";
import { shadcnSvelte } from "./ui/shadcn-svelte";
import { shadcnVue } from "./ui/shadcn-vue";
import { vuetify } from "./ui/vuetify";
import { moduleFederation } from "./tooling/module-federation";
import { turborepo } from "./tooling/turborepo";
import { testingLibrary } from "./testing/testing-library";
import { vitest } from "./testing/vitest";

export const modules: readonly Module[] = [
  tailwind,
  sass,
  shadcn,
  mui,
  chakraUi,
  mantine,
  shadcnVue,
  primevue,
  vuetify,
  shadcnSvelte,
  angularMaterial,
  reduxToolkit,
  zustand,
  pinia,
  builtin,
  reactRouter,
  vueRouter,
  solidRouter,
  preactIso,
  axios,
  vitest,
  testingLibrary,
  eslint,
  prettier,
  biome,
  huskyLintStaged,
  seo,
  aio,
  turborepo,
  moduleFederation,
  agentsMdModule,
  claudeCode,
  cursor,
  copilot,
];

const byId = new Map(modules.map((m) => [m.id, m]));

export function getModule(id: string): Module | undefined {
  return byId.get(id);
}
