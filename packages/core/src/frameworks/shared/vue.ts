import { file, indent, renderImports } from "../../engine/code";
import type { CounterSpec, Ctx } from "../../types";
import type { DemoClasses } from "./demo";

/**
 * Vue SFC helpers shared by the Vue and Nuxt adapters. Counter specs use Vue template syntax:
 * `value` is interpolated in `{{ }}`, `increment`/`decrement` are `@click` handler statements.
 */
export const localVueCounter: CounterSpec = {
  imports: [{ from: "vue", named: ["ref"] }],
  setup: ["const count = ref(0);"],
  value: "count",
  increment: "count++",
  decrement: "count--",
};

/** A single-file component: `<script setup>` (omitted when empty) followed by `<template>`. */
export function sfc(ctx: Ctx, script: string[], template: string[]): string {
  const lang = ctx.isTs ? ' lang="ts"' : "";
  return file([
    ...(script.length
      ? [`<script setup${lang}>`, ...script, "</script>", ""]
      : []),
    "<template>",
    ...indent(template),
    "</template>",
  ]);
}

export function counterCard(
  spec: CounterSpec,
  ctx: Ctx,
  cls: DemoClasses,
): string {
  return sfc(
    ctx,
    [
      ...renderImports(spec.imports),
      ...(spec.imports.length ? [""] : []),
      ...spec.setup,
    ],
    [
      `<div class="${cls.card}">`,
      `  <p class="${cls.count}">{{ ${spec.value} }}</p>`,
      `  <div class="${cls.row}">`,
      `    <button type="button" class="${cls.btn}" @click="${spec.decrement}">-1</button>`,
      `    <button type="button" class="${cls.btn}" @click="${spec.increment}">+1</button>`,
      "  </div>",
      "</div>",
    ],
  );
}

/** Prettier's default print width, and the indentation of nav links inside `<template>`. */
const PRINT_WIDTH = 80;
const LINK_INDENT = 6;

/**
 * Nav links for a template. Prettier treats router links as inline: glued text stays clean
 * only while the line fits; longer links need the label on its own line.
 */
export function vueNavLinks(
  link: string,
  linkProp: string,
  routes: { path: string; label: string }[],
  cls: DemoClasses,
): string[] {
  return routes.flatMap((route) => {
    const open = `<${link} class="${cls.link}" ${linkProp}="${route.path}">`;
    const close = `</${link}>`;
    const glued = `${open}${route.label}${close}`;
    return LINK_INDENT + glued.length <= PRINT_WIDTH
      ? [`    ${glued}`]
      : [`    ${open}`, `      ${route.label}`, `    ${close}`];
  });
}
