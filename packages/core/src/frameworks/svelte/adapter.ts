import { file, json } from "../../engine/code";
import { createModel } from "../../engine/model";
import type { FrameworkAdapter, ProjectModel } from "../../types";
import { demoClasses, globalCss } from "../shared/demo";
import { viteEnv } from "../shared/env";
import { spaIndexHtml } from "../shared/index-html";
import {
  localSvelteCounter,
  svelteCounter,
  svelteHome,
} from "../shared/svelte";
import { svelteCounterTest } from "../shared/testing";
import { plainViteConfig } from "../shared/vite";

/**
 * Svelte 5 SPA on Vite, following create-vite's `svelte` / `svelte-ts` templates.
 * No router module exists for plain Svelte; the UI points users to SvelteKit instead.
 */
export const svelteAdapter: FrameworkAdapter = {
  id: "svelte",
  name: "Svelte",
  kind: "spa",
  languages: ["js", "ts"],
  srcDir: "src",
  publicEnv: viteEnv,
  componentExt: () => "svelte",

  base(ctx) {
    const model = createModel();
    const { pkg } = model;
    pkg.devDependencies
      .add("svelte")
      .add("@sveltejs/vite-plugin-svelte")
      .add("vite");
    pkg.scripts["dev"] = "vite";
    pkg.scripts["build"] = "vite build";
    pkg.scripts["preview"] = "vite preview";

    if (ctx.isTs) {
      pkg.devDependencies
        .add("typescript")
        .add("svelte-check")
        .add("@tsconfig/svelte")
        .add("@types/node");
      pkg.scripts["typecheck"] =
        "svelte-check --tsconfig ./tsconfig.app.json && tsc -p tsconfig.node.json";
      writeTsconfigs(model);
    } else {
      model.files.set(
        "jsconfig.json",
        json({
          compilerOptions: {
            moduleResolution: "bundler",
            target: "ESNext",
            module: "ESNext",
            verbatimModuleSyntax: true,
            isolatedModules: true,
            resolveJsonModule: true,
            sourceMap: true,
            esModuleInterop: true,
            types: ["vite/client"],
            skipLibCheck: true,
            checkJs: true,
          },
          include: ["src/**/*.d.ts", "src/**/*.js", "src/**/*.svelte"],
        }),
      );
    }

    model.files.set(
      "svelte.config.js",
      file([
        '/** @type {import("@sveltejs/vite-plugin-svelte").SvelteConfig} */',
        "export default {};",
      ]),
    );
    model.bundler.plugins.push({
      import: { from: "@sveltejs/vite-plugin-svelte", named: ["svelte"] },
      call: "svelte()",
    });
    model.readme.stack.push(
      "Svelte 5",
      "Vite",
      ...(ctx.isTs ? ["TypeScript"] : []),
    );
    return model;
  },

  render(model, ctx) {
    model.files.set(
      "index.html",
      spaIndexHtml(model, ctx, "app", `main.${ctx.ext.script}`),
    );
    const cls = demoClasses(model);
    // Without Testing Library's Vite plugin, tests need Svelte's browser build (Svelte docs).
    const browserConditions =
      model.testing && !model.testing.library
        ? [
            'resolve: process.env.VITEST ? { conditions: ["browser"] } : undefined,',
          ]
        : [];
    model.files.set(
      `vite.config.${ctx.ext.script}`,
      plainViteConfig(model, ctx, browserConditions),
    );
    model.files.set(
      `src/main.${ctx.ext.script}`,
      file([
        'import { mount } from "svelte";',
        'import App from "./App.svelte";',
        'import "./app.css";',
        "",
        "const app = mount(App, {",
        `  target: document.getElementById("app")${ctx.isTs ? "!" : ""},`,
        "});",
        "",
        "export default app;",
      ]),
    );
    model.files.set("src/app.css", globalCss(model));
    model.files.set(
      "src/lib/Counter.svelte",
      svelteCounter(model.demo.counter ?? localSvelteCounter, ctx, cls),
    );
    model.files.set(
      "src/App.svelte",
      svelteHome(ctx, cls, "./lib/Counter.svelte", "main"),
    );
    if (model.testing) {
      model.files.set(
        `src/lib/Counter.test.${ctx.ext.script}`,
        svelteCounterTest(model),
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
        { path: "./tsconfig.app.json" },
        { path: "./tsconfig.node.json" },
      ],
    }),
  );
  model.files.set(
    "tsconfig.app.json",
    json({
      extends: "@tsconfig/svelte/tsconfig.json",
      compilerOptions: {
        tsBuildInfoFile: "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
        target: "es2023",
        module: "esnext",
        types: ["svelte", "vite/client"],
        allowArbitraryExtensions: true,
        noEmit: true,
        allowJs: true,
        checkJs: true,
        moduleDetection: "force",
      },
      include: ["src/**/*.ts", "src/**/*.js", "src/**/*.svelte"],
    }),
  );
  model.files.set(
    "tsconfig.node.json",
    json({
      compilerOptions: {
        tsBuildInfoFile: "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
        target: "es2023",
        lib: ["ES2023"],
        types: ["node"],
        skipLibCheck: true,
        module: "nodenext",
        allowImportingTsExtensions: true,
        verbatimModuleSyntax: true,
        moduleDetection: "force",
        noEmit: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        erasableSyntaxOnly: true,
        noFallthroughCasesInSwitch: true,
      },
      include: ["vite.config.ts"],
    }),
  );
}
