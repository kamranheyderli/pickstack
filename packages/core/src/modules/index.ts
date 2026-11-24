import type { Module } from "../types";
import { axios } from "./data/axios";
import { biome } from "./quality/biome";
import { eslint } from "./quality/eslint";
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
import { tailwind } from "./style/tailwind";
import { testingLibrary } from "./testing/testing-library";
import { vitest } from "./testing/vitest";

export const modules: readonly Module[] = [
  tailwind,
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
  seo,
  aio,
];

const byId = new Map(modules.map((m) => [m.id, m]));

export function getModule(id: string): Module | undefined {
  return byId.get(id);
}
