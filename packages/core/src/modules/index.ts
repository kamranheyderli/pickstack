import type { Module } from "../types";
import { axios } from "./data/axios";
import { prettier } from "./quality/prettier";
import { reactRouter } from "./routing/react-router";
import { reduxToolkit } from "./state/redux-toolkit";
import { zustand } from "./state/zustand";
import { tailwind } from "./style/tailwind";

export const modules: readonly Module[] = [
  tailwind,
  reduxToolkit,
  zustand,
  reactRouter,
  axios,
  prettier,
];

const byId = new Map(modules.map((m) => [m.id, m]));

export function getModule(id: string): Module | undefined {
  return byId.get(id);
}
