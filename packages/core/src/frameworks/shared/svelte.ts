import { file, indent, renderImports } from "../../engine/code";
import type {
  CounterSpec,
  CounterView,
  Ctx,
  ImportSpec,
  ProjectModel,
  ProviderSpec,
} from "../../types";
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
  view: CounterView | null = null,
): string {
  if (view) {
    return svelteComponent(
      ctx,
      [...view.imports, ...spec.imports],
      spec.setup,
      view.markup(spec),
    );
  }
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

/** What an app root adds around the home markup: widgets, and (SPA) providers with setup. */
export interface SvelteHomeExtras {
  widgets?: string[];
  providers?: ProviderSpec[];
  setup?: string[];
}

export function svelteHome(
  ctx: Ctx,
  cls: DemoClasses,
  counterFrom: string,
  tag: "main" | "section",
  title?: string,
  extras: SvelteHomeExtras = {},
): string {
  const dir = counterFrom.slice(0, counterFrom.lastIndexOf("/"));
  const widgets = extras.widgets ?? [];
  const providers = [...(extras.providers ?? [])].sort(
    (a, b) => a.order - b.order,
  );
  let markup = [
    `<${tag} class="${tag === "main" ? cls.main : cls.page}">`,
    `  <h1 class="${cls.title}">${ctx.selection.name}</h1>`,
    "  <Counter />",
    ...widgets.map((name) => `  <${name} />`),
    `</${tag}>`,
  ];
  for (const provider of [...providers].reverse()) {
    markup = [provider.open, ...indent(markup), provider.close];
  }
  return svelteComponent(
    ctx,
    [
      { from: counterFrom, default: "Counter" },
      ...widgets.map((name) => ({
        from: `${dir}/${name}.svelte`,
        default: name,
      })),
      ...providers.flatMap((p) => p.imports),
    ],
    extras.setup ?? [],
    [...headTitle(title), ...markup],
  );
}

export function svelteAbout(
  model: ProjectModel,
  ctx: Ctx,
  cls: DemoClasses,
  title?: string,
): string {
  return svelteComponent(
    ctx,
    [],
    [],
    [
      ...headTitle(title),
      `<section class="${cls.page}">`,
      `  <h1 class="${cls.title}">About</h1>`,
      `  <p class="${cls.text}">${aboutText(model)}</p>`,
      "</section>",
    ],
  );
}

function headTitle(title?: string): string[] {
  return title
    ? ["<svelte:head>", `  <title>${title}</title>`, "</svelte:head>", ""]
    : [];
}
