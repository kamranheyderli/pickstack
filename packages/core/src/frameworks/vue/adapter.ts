import { file, fill, indent, json, renderImports } from "../../engine/code";
import { createModel } from "../../engine/model";
import type {
  CounterSpec,
  Ctx,
  FrameworkAdapter,
  ProjectModel,
  RouteSpec,
} from "../../types";
import {
  aboutText,
  demoClasses,
  globalCss,
  type DemoClasses,
} from "../shared/demo";
import indexHtml from "../shared/templates/index-html";

/**
 * Vue 3 + Vite, following the layout of the official `create-vue` scaffold:
 * `src/assets/main.css`, `src/views/*View.vue`, `@` alias to `src`, `vue-tsc --build`.
 *
 * Counter specs from modules use Vue template syntax: `value` is interpolated in
 * `{{ }}`, `increment`/`decrement` are `@click` handler statements.
 */
/** Prettier's default print width, and the indentation of nav links inside `<template>`. */
const PRINT_WIDTH = 80;
const LINK_INDENT = 6;

const localCounter: CounterSpec = {
  imports: [{ from: "vue", named: ["ref"] }],
  setup: ["const count = ref(0);"],
  value: "count",
  increment: "count++",
  decrement: "count--",
};

export const vueAdapter: FrameworkAdapter = {
  id: "vue",
  name: "Vue",
  kind: "spa",
  languages: ["js", "ts"],
  componentExt: () => "vue",

  base(ctx) {
    const model = createModel();
    const { pkg } = model;

    pkg.dependencies.add("vue");
    pkg.devDependencies.add("vite").add("@vitejs/plugin-vue");
    pkg.scripts["dev"] = "vite";
    pkg.scripts["build"] = ctx.isTs
      ? "vue-tsc --build && vite build"
      : "vite build";
    pkg.scripts["preview"] = "vite preview";

    if (ctx.isTs) {
      pkg.devDependencies
        .add("typescript")
        .add("vue-tsc")
        .add("@vue/tsconfig")
        .add("@tsconfig/node24")
        .add("@types/node");
      pkg.scripts["typecheck"] = "vue-tsc --build";
      writeTsconfigs(model);
      model.files.set(
        "env.d.ts",
        file(['/// <reference types="vite/client" />']),
      );
    } else {
      model.files.set(
        "jsconfig.json",
        json({
          compilerOptions: { paths: { "@/*": ["./src/*"] } },
          exclude: ["node_modules", "dist"],
        }),
      );
    }

    model.bundler.plugins.push({
      import: { from: "@vitejs/plugin-vue", default: "vue" },
      call: "vue()",
    });
    model.entry.imports.push(
      { from: "vue", named: ["createApp"] },
      { from: "./App.vue", default: "App" },
      { from: "./assets/main.css" },
    );
    model.files.set(
      "index.html",
      fill(indexHtml, {
        name: ctx.selection.name,
        mountId: "app",
        entry: `main.${ctx.ext.script}`,
      }),
    );
    model.readme.stack.push(
      "Vue 3",
      "Vite",
      ...(ctx.isTs ? ["TypeScript"] : []),
    );
    return model;
  },

  render(model, ctx) {
    const cls = demoClasses(model);
    model.files.set(`vite.config.${ctx.ext.script}`, viteConfig(model));
    model.files.set(`src/main.${ctx.ext.script}`, mainEntry(model));
    model.files.set("src/assets/main.css", globalCss(model));
    model.files.set(
      "src/components/CounterCard.vue",
      counterCard(model.demo.counter ?? localCounter, ctx, cls),
    );

    if (model.routing && model.routes.length) {
      for (const route of model.routes) {
        model.files.set(
          `src/views/${route.component}.vue`,
          view(route, model, ctx, cls),
        );
      }
      model.files.set("src/App.vue", routedApp(model, ctx, cls));
    } else {
      model.files.set(
        "src/App.vue",
        sfc(
          ctx,
          ['import CounterCard from "./components/CounterCard.vue";'],
          [
            `<main class="${cls.main}">`,
            `  <h1 class="${cls.title}">${ctx.selection.name}</h1>`,
            "  <CounterCard />",
            "</main>",
          ],
        ),
      );
    }
  },
};

function writeTsconfigs(model: ProjectModel): void {
  model.files.set(
    "tsconfig.json",
    json({
      files: [],
      references: [
        { path: "./tsconfig.node.json" },
        { path: "./tsconfig.app.json" },
      ],
    }),
  );
  model.files.set(
    "tsconfig.app.json",
    json({
      extends: "@vue/tsconfig/tsconfig.dom.json",
      include: ["env.d.ts", "src/**/*", "src/**/*.vue"],
      exclude: ["src/**/__tests__/*"],
      compilerOptions: {
        noUncheckedIndexedAccess: true,
        paths: { "@/*": ["./src/*"] },
        tsBuildInfoFile: "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
      },
    }),
  );
  model.files.set(
    "tsconfig.node.json",
    json({
      extends: "@tsconfig/node24/tsconfig.json",
      include: ["vite.config.*", "vitest.config.*", "eslint.config.*"],
      compilerOptions: {
        module: "preserve",
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        types: ["node"],
        noEmit: true,
        tsBuildInfoFile: "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
      },
    }),
  );
}

function viteConfig(model: ProjectModel): string {
  const plugins = model.bundler.plugins;
  return file([
    ...renderImports([
      { from: "node:url", named: ["fileURLToPath", "URL"] },
      { from: "vite", named: ["defineConfig"] },
      ...plugins.map((p) => p.import),
    ]),
    "",
    "export default defineConfig({",
    `  plugins: [${plugins.map((p) => p.call).join(", ")}],`,
    "  resolve: {",
    "    alias: {",
    '      "@": fileURLToPath(new URL("./src", import.meta.url)),',
    "    },",
    "  },",
    "});",
  ]);
}

function mainEntry(model: ProjectModel): string {
  const uses = model.entry.appUses;
  return file([
    ...renderImports(model.entry.imports),
    "",
    ...model.entry.setup,
    ...(model.entry.setup.length ? [""] : []),
    ...(uses.length
      ? [
          "const app = createApp(App);",
          "",
          ...uses.map((u) => `app.use(${u});`),
          "",
          'app.mount("#app");',
        ]
      : ['createApp(App).mount("#app");']),
  ]);
}

/** A single-file component: `<script setup>` (omitted when empty) followed by `<template>`. */
function sfc(ctx: Ctx, script: string[], template: string[]): string {
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

function counterCard(spec: CounterSpec, ctx: Ctx, cls: DemoClasses): string {
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

function routedApp(model: ProjectModel, ctx: Ctx, cls: DemoClasses): string {
  const routing = model.routing;
  if (!routing) throw new Error("routedApp requires model.routing");
  return sfc(ctx, renderImports(routing.imports), [
    `<main class="${cls.main}">`,
    `  <nav class="${cls.nav}">`,
    ...model.routes.flatMap((route) => {
      const open = `<${routing.link} class="${cls.link}" ${routing.linkProp}="${route.path}">`;
      const close = `</${routing.link}>`;
      // Prettier treats router links as inline: glued text stays clean only while the line
      // fits; longer links need the label on its own line or it splits at `>Home</RouterLink`.
      const glued = `${open}${route.label}${close}`;
      return LINK_INDENT + glued.length <= PRINT_WIDTH
        ? [`    ${glued}`]
        : [`    ${open}`, `      ${route.label}`, `    ${close}`];
    }),
    "  </nav>",
    ...indent(routing.outlet),
    "</main>",
  ]);
}

function view(
  route: RouteSpec,
  model: ProjectModel,
  ctx: Ctx,
  cls: DemoClasses,
): string {
  if (route.page === "home") {
    return sfc(
      ctx,
      ['import CounterCard from "../components/CounterCard.vue";'],
      [
        `<section class="${cls.page}">`,
        `  <h1 class="${cls.title}">${ctx.selection.name}</h1>`,
        "  <CounterCard />",
        "</section>",
      ],
    );
  }
  return sfc(
    ctx,
    [],
    [
      `<section class="${cls.page}">`,
      `  <h1 class="${cls.title}">${route.label}</h1>`,
      `  <p class="${cls.text}">${aboutText(model)}</p>`,
      "</section>",
    ],
  );
}
