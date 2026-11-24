import { file, json, renderImports } from "../../engine/code";
import { createModel } from "../../engine/model";
import type { FrameworkAdapter, ProjectModel } from "../../types";
import { aboutText, demoClasses, globalCss } from "../shared/demo";
import { counterCard, localVueCounter, sfc, vueNavLinks } from "../shared/vue";

const routes = [
  { path: "/", label: "Home" },
  { path: "/about", label: "About" },
];

/**
 * Nuxt 4, following the `nuxt/starter` v4 template: source in `app/`, file-based pages,
 * auto-imported components. Config goes through `nuxt.config`, env through runtimeConfig.
 */
export const nuxtAdapter: FrameworkAdapter = {
  id: "nuxt",
  name: "Nuxt",
  kind: "meta",
  languages: ["js", "ts"],
  srcDir: "app",
  publicEnv: (name) => ({
    key: `NUXT_PUBLIC_${name}`,
    read: `useRuntimeConfig().public`,
  }),
  ignore: [".nuxt", ".output", ".data", ".nitro", ".cache"],
  componentExt: () => "vue",

  base(ctx) {
    const model = createModel();
    const { pkg } = model;
    pkg.dependencies.add("nuxt").add("vue").add("vue-router");
    pkg.scripts["build"] = "nuxt build";
    pkg.scripts["dev"] = "nuxt dev";
    pkg.scripts["generate"] = "nuxt generate";
    pkg.scripts["preview"] = "nuxt preview";
    pkg.scripts["postinstall"] = "nuxt prepare";
    if (ctx.isTs) {
      pkg.devDependencies.add("typescript").add("vue-tsc");
      pkg.scripts["typecheck"] = "nuxt typecheck";
      model.files.set(
        "tsconfig.json",
        json({
          files: [],
          references: [
            { path: "./.nuxt/tsconfig.app.json" },
            { path: "./.nuxt/tsconfig.server.json" },
            { path: "./.nuxt/tsconfig.shared.json" },
            { path: "./.nuxt/tsconfig.node.json" },
          ],
        }),
      );
    }
    model.files.set("public/robots.txt", file(["User-Agent: *", "Disallow:"]));
    model.readme.stack.push(
      "Nuxt 4",
      "Vue 3",
      ...(ctx.isTs ? ["TypeScript"] : []),
    );
    return model;
  },

  render(model, ctx) {
    const cls = demoClasses(model);
    model.files.set(`nuxt.config.${ctx.ext.script}`, nuxtConfig(model));
    model.files.set("app/assets/css/main.css", globalCss(model));
    model.files.set(
      "app/components/CounterCard.vue",
      counterCard(model.demo.counter ?? localVueCounter, ctx, cls),
    );
    model.files.set(
      "app/app.vue",
      sfc(
        ctx,
        [],
        [
          "<NuxtRouteAnnouncer />",
          `<main class="${cls.main}">`,
          `  <nav class="${cls.nav}">`,
          ...vueNavLinks("NuxtLink", "to", routes, cls),
          "  </nav>",
          "  <NuxtPage />",
          "</main>",
        ],
      ),
    );
    // Components in app/components are auto-imported.
    model.files.set(
      "app/pages/index.vue",
      sfc(
        ctx,
        [],
        [
          `<section class="${cls.page}">`,
          `  <h1 class="${cls.title}">${ctx.selection.name}</h1>`,
          "  <CounterCard />",
          "</section>",
        ],
      ),
    );
    model.files.set(
      "app/pages/about.vue",
      sfc(
        ctx,
        [],
        [
          `<section class="${cls.page}">`,
          `  <h1 class="${cls.title}">About</h1>`,
          `  <p class="${cls.text}">${aboutText(model)}</p>`,
          "</section>",
        ],
      ),
    );
  },
};

function nuxtConfig(model: ProjectModel): string {
  const { plugins, modules, config } = model.bundler;
  return file([
    ...renderImports(plugins.map((p) => p.import)),
    ...(plugins.length ? [""] : []),
    "// https://nuxt.com/docs/api/configuration/nuxt-config",
    "export default defineNuxtConfig({",
    '  compatibilityDate: "2025-07-15",',
    "  devtools: { enabled: true },",
    ...(modules.length ? [`  modules: ${JSON.stringify(modules)},`] : []),
    '  css: ["~/assets/css/main.css"],',
    ...(plugins.length
      ? [`  vite: { plugins: [${plugins.map((p) => p.call).join(", ")}] },`]
      : []),
    ...Object.entries(config).map(
      ([key, value]) => `  ${key}: ${JSON.stringify(value)},`,
    ),
    "});",
  ]);
}
