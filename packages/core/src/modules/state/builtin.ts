import { file } from "../../engine/code";
import type { Ctx, Module, ProjectModel } from "../../types";

/**
 * Shared counter state using the framework's own reactivity: Svelte runes, Solid signals,
 * Angular signals. No package is installed; only an idiomatic store module is added.
 */
export const builtin: Module = {
  id: "builtin",
  name: "Built-in",
  category: "state",
  description: {
    az: "Frameworkün öz reaktivliyi ilə paylaşılan store (runes / signals); paket yoxdur.",
    en: "Shared store using the framework's own reactivity (runes / signals); no package.",
  },
  frameworks: ["svelte", "sveltekit", "solid", "angular"],
  order: 10,
  apply(model, ctx) {
    switch (ctx.selection.framework) {
      case "svelte":
      case "sveltekit":
        svelteStore(model, ctx);
        break;
      case "solid":
        solidStore(model, ctx);
        break;
      case "angular":
        angularService(model);
        break;
      default:
        throw new Error(
          `builtin state is not defined for ${ctx.selection.framework}`,
        );
    }
  },
};

function svelteStore(model: ProjectModel, ctx: Ctx): void {
  // `.svelte.js` enables runes outside components. The name must not collide with Counter.svelte.
  model.files.set(
    `src/lib/counterStore.svelte.${ctx.ext.script}`,
    file([
      "export const counter = $state({ count: 0 });",
      "",
      "export function increment() {",
      "  counter.count += 1;",
      "}",
      "",
      "export function decrement() {",
      "  counter.count -= 1;",
      "}",
    ]),
  );
  model.demo.counter = {
    imports: [
      {
        from: "./counterStore.svelte.js",
        named: ["counter", "decrement", "increment"],
      },
    ],
    setup: [],
    value: "counter.count",
    increment: "increment",
    decrement: "decrement",
  };
  model.readme.stack.push("Svelte runes store");
}

function solidStore(model: ProjectModel, ctx: Ctx): void {
  model.files.set(
    `src/stores/counter.${ctx.ext.script}`,
    file([
      'import { createSignal } from "solid-js";',
      "",
      "const [count, setCount] = createSignal(0);",
      "",
      "export { count };",
      "",
      "export function increment() {",
      "  setCount((value) => value + 1);",
      "}",
      "",
      "export function decrement() {",
      "  setCount((value) => value - 1);",
      "}",
    ]),
  );
  model.demo.counter = {
    imports: [
      { from: "../stores/counter", named: ["count", "decrement", "increment"] },
    ],
    setup: [],
    value: "count()",
    increment: "increment",
    decrement: "decrement",
  };
  model.readme.stack.push("Solid signals store");
}

function angularService(model: ProjectModel): void {
  model.files.set(
    "src/app/services/counter.service.ts",
    file([
      'import { Injectable, signal } from "@angular/core";',
      "",
      '@Injectable({ providedIn: "root" })',
      "export class CounterService {",
      "  private readonly value = signal(0);",
      "  readonly count = this.value.asReadonly();",
      "",
      "  increment(): void {",
      "    this.value.update((value) => value + 1);",
      "  }",
      "",
      "  decrement(): void {",
      "    this.value.update((value) => value - 1);",
      "  }",
      "}",
    ]),
  );
  model.demo.counter = {
    imports: [
      { from: "@angular/core", named: ["inject"] },
      { from: "../../services/counter.service", named: ["CounterService"] },
    ],
    setup: ["protected readonly counter = inject(CounterService);"],
    value: "counter.count()",
    increment: "counter.increment()",
    decrement: "counter.decrement()",
  };
  model.readme.stack.push("Angular signals service");
}
