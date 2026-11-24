import { file, json, renderImports } from "../../engine/code";
import { createModel } from "../../engine/model";
import type { FrameworkAdapter } from "../../types";
import { demoClasses, globalCss } from "../shared/demo";
import { viteEnv } from "../shared/env";
import {
  localSvelteCounter,
  svelteAbout,
  svelteComponent,
  svelteCounter,
  svelteHome,
} from "../shared/svelte";

/**
 * SvelteKit 3, following `sv create --template minimal`: kit options live in `vite.config`,
 * `#lib` is a package.json import alias. adapter-static + `prerender = true` gives a deployable
 * build without picking a host (adapter-auto builds nothing deployable without one).
 */
export const sveltekitAdapter: FrameworkAdapter = {
  id: "sveltekit",
  name: "SvelteKit",
  kind: "meta",
  languages: ["js", "ts"],
  srcDir: "src",
  publicEnv: viteEnv,
  ignore: [".svelte-kit", "build"],
  componentExt: () => "svelte",

  base(ctx) {
    const model = createModel();
    const { pkg } = model;
    pkg.devDependencies
      .add("@sveltejs/kit")
      .add("@sveltejs/adapter-static")
      .add("@sveltejs/vite-plugin-svelte")
      .add("svelte")
      .add("vite");
    pkg.fields["imports"] = {
      "#lib": "./src/lib/index.js",
      "#lib/*": "./src/lib/*",
    };
    pkg.scripts["dev"] = "vite dev";
    pkg.scripts["build"] = "vite build";
    pkg.scripts["preview"] = "vite preview";
    pkg.scripts["prepare"] = "svelte-kit sync || echo ''";
    if (ctx.isTs) {
      pkg.devDependencies.add("typescript").add("svelte-check");
      pkg.scripts["typecheck"] =
        "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json";
      model.files.set(
        "src/app.d.ts",
        file([
          "// See https://svelte.dev/docs/kit/types#app.d.ts",
          "declare global {",
          "  namespace App {",
          "    // interface Error {}",
          "    // interface Locals {}",
          "    // interface PageData {}",
          "    // interface PageState {}",
          "    // interface Platform {}",
          "  }",
          "}",
          "",
          "export {};",
        ]),
      );
    }
    model.files.set(
      ctx.isTs ? "tsconfig.json" : "jsconfig.json",
      json({
        extends: "$app/tsconfig",
        compilerOptions: { strict: true },
        include: ["src", `vite.config.${ctx.ext.script}`],
      }),
    );
    model.files.set(
      "src/app.html",
      file([
        "<!doctype html>",
        '<html lang="en">',
        "  <head>",
        '    <meta charset="utf-8" />',
        '    <meta name="viewport" content="width=device-width, initial-scale=1" />',
        "    %sveltekit.head%",
        "  </head>",
        '  <body data-sveltekit-preload-data="hover">',
        '    <div style="display: contents">%sveltekit.body%</div>',
        "  </body>",
        "</html>",
      ]),
    );
    model.files.set(
      `src/lib/index.${ctx.ext.script}`,
      file([
        "// Place files you want to import through the `#lib` alias in this folder.",
      ]),
    );
    model.files.set(
      `src/routes/+layout.${ctx.ext.script}`,
      file(["export const prerender = true;"]),
    );
    model.files.set(
      "static/robots.txt",
      file([
        "# allow crawling everything by default",
        "User-agent: *",
        "Disallow:",
      ]),
    );
    model.readme.stack.push(
      "SvelteKit",
      "Svelte 5",
      ...(ctx.isTs ? ["TypeScript"] : []),
    );
    return model;
  },

  render(model, ctx) {
    const cls = demoClasses(model);
    model.files.set(`vite.config.${ctx.ext.script}`, viteConfig(model));
    model.files.set("src/routes/layout.css", globalCss(model));
    model.files.set(
      "src/lib/Counter.svelte",
      svelteCounter(model.demo.counter ?? localSvelteCounter, ctx, cls),
    );
    model.files.set(
      "src/routes/+layout.svelte",
      svelteComponent(
        ctx,
        [
          { from: "./layout.css" },
          { from: "$app/paths", named: ["resolve"] },
          ...(ctx.isTs ? [{ from: "./$types", types: ["LayoutProps"] }] : []),
        ],
        [
          ctx.isTs
            ? "let { children }: LayoutProps = $props();"
            : "let { children } = $props();",
        ],
        [
          `<main class="${cls.main}">`,
          `  <nav class="${cls.nav}">`,
          `    <a class="${cls.link}" href={resolve("/")}>Home</a>`,
          `    <a class="${cls.link}" href={resolve("/about")}>About</a>`,
          "  </nav>",
          "  {@render children()}",
          "</main>",
        ],
      ),
    );
    model.files.set(
      "src/routes/+page.svelte",
      svelteHome(ctx, cls, "#lib/Counter.svelte", "section"),
    );
    model.files.set(
      "src/routes/about/+page.svelte",
      svelteAbout(model, ctx, cls),
    );
  },
};

function viteConfig(model: Parameters<FrameworkAdapter["render"]>[0]): string {
  const plugins = model.bundler.plugins;
  return file([
    ...renderImports([
      { from: "@sveltejs/adapter-static", default: "adapter" },
      { from: "@sveltejs/kit/vite", named: ["sveltekit"] },
      { from: "vite", named: ["defineConfig"] },
      ...plugins.map((p) => p.import),
    ]),
    "",
    "export default defineConfig({",
    "  plugins: [",
    // Other plugins (e.g. Tailwind) go before sveltekit(), as `sv add` does.
    ...plugins.map((p) => `    ${p.call},`),
    "    sveltekit({",
    "      compilerOptions: {",
    "        // Force runes mode for the project, except for libraries. Can be removed in svelte 6.",
    "        runes: ({ filename }) =>",
    '          filename.split(/[/\\\\]/).includes("node_modules") ? undefined : true,',
    "      },",
    "      adapter: adapter(),",
    "    }),",
    "  ],",
    "});",
  ]);
}
