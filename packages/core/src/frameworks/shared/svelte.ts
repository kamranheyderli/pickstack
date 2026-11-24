import { file, indent, renderImports } from "../../engine/code";
import type { CounterSpec, Ctx, ImportSpec, ProjectModel } from "../../types";
import { aboutText, type DemoClasses } from "./demo";

/**
 * Svelte 5 components shared by the Vite SPA and SvelteKit adapters.
 * Counter specs use Svelte syntax: `value` goes in `{}`, handlers in `onclick={...}`.
 */
export const localSvelteCounter: CounterSpec = {
  imports: [],
  setup: ["let count = $state(0);"],
  value: "count",
  increment: "() => count++",
  decrement: "() => count--",
};

/** A component: `<script>` (omitted when empty) followed by markup. */
export function svelteComponent(
  ctx: Ctx,
  imports: ImportSpec[],
  setup: string[],
  markup: string[],
): string {
  const script = [
    ...renderImports(imports),
    ...(imports.length && setup.length ? [""] : []),
    ...setup,
  ];
  const lang = ctx.isTs ? ' lang="ts"' : "";
  return file([
    ...(script.length
      ? [`<script${lang}>`, ...indent(script), "</script>", ""]
      : []),
    ...markup,
  ]);
}

export function svelteCounter(
  spec: CounterSpec,
  ctx: Ctx,
  cls: DemoClasses,
): string {
  return svelteComponent(ctx, spec.imports, spec.setup, [
    `<div class="${cls.card}">`,
    `  <p class="${cls.count}">{${spec.value}}</p>`,
    `  <div class="${cls.row}">`,
    `    <button type="button" class="${cls.btn}" onclick={${spec.decrement}}>-1</button>`,
    `    <button type="button" class="${cls.btn}" onclick={${spec.increment}}>+1</button>`,
    "  </div>",
    "</div>",
  ]);
}

export function svelteHome(
  ctx: Ctx,
  cls: DemoClasses,
  counterFrom: string,
  tag: "main" | "section",
): string {
  return svelteComponent(
    ctx,
    [{ from: counterFrom, default: "Counter" }],
    [],
    [
      `<${tag} class="${tag === "main" ? cls.main : cls.page}">`,
      `  <h1 class="${cls.title}">${ctx.selection.name}</h1>`,
      "  <Counter />",
      `</${tag}>`,
    ],
  );
}

export function svelteAbout(
  model: ProjectModel,
  ctx: Ctx,
  cls: DemoClasses,
): string {
  return svelteComponent(
    ctx,
    [],
    [],
    [
      `<section class="${cls.page}">`,
      `  <h1 class="${cls.title}">About</h1>`,
      `  <p class="${cls.text}">${aboutText(model)}</p>`,
      "</section>",
    ],
  );
}
