import { file, json, jsLiteral, renderImports } from "../../engine/code";
import { createModel } from "../../engine/model";
import type {
  Ctx,
  FrameworkAdapter,
  ProjectModel,
  SeoSpec,
  TestingSpec,
} from "../../types";
import { aboutText, demoClasses, globalCss, styleExt } from "../shared/demo";
import { testBlock, vueCounterTest } from "../shared/testing";
import {
  counterCard,
  localVueCounter,
  sfc,
  vueNavLinks,
  withAppShell,
} from "../shared/vue";

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
    model.files.set(`app/assets/css/main.${styleExt(model)}`, globalCss(model));
    model.files.set(
      "app/components/CounterCard.vue",
      counterCard(
        model.demo.counter ?? localVueCounter,
        ctx,
        cls,
        model.demo.view,
        true,
      ),
    );
    if (model.testing) {
      model.files.set(
        `vitest.config.${ctx.ext.script}`,
        vitestConfig(model.testing, ctx),
      );
      model.files.set(
        `test/nuxt/CounterCard.test.${ctx.ext.script}`,
        vueCounterTest(model, "nuxt"),
      );
    }
    model.files.set(
      "app/app.vue",
      sfc(ctx, model.seo ? appSeoScript(model.seo, ctx) : [], [
        "<NuxtRouteAnnouncer />",
        ...withAppShell(model.demo.view, [
          `<main class="${cls.main}">`,
          `  <nav class="${cls.nav}">`,
          ...vueNavLinks(
            "NuxtLink",
            "to",
            [...routes, ...model.demo.links],
            cls,
          ),
          "  </nav>",
          "  <NuxtPage />",
          "</main>",
        ]),
      ]),
    );
    // Components in app/components are auto-imported.
    model.files.set(
      "app/pages/index.vue",
      sfc(ctx, model.seo ? ['useSeoMeta({ title: "Home" });'] : [], [
        `<section class="${cls.page}">`,
        `  <h1 class="${cls.title}">${ctx.selection.name}</h1>`,
        "  <CounterCard />",
        "</section>",
      ]),
    );
    model.files.set(
      "app/pages/about.vue",
      sfc(ctx, model.seo ? ['useSeoMeta({ title: "About" });'] : [], [
        `<section class="${cls.page}">`,
        `  <h1 class="${cls.title}">About</h1>`,
        `  <p class="${cls.text}">${aboutText(model)}</p>`,
        "</section>",
      ]),
    );
  },
};

/** Site-wide head: canonical + og:url follow the route; JSON-LD WebSite. */
function appSeoScript(seo: SeoSpec, ctx: Ctx): string[] {
  const name = ctx.selection.name;
  return [
    "const { siteUrl } = useRuntimeConfig().public;",
    "const route = useRoute();",
    "",
    "useHead({",
    '  link: [{ rel: "canonical", href: () => `${siteUrl}${route.path}` }],',
    "  script: [",
    "    {",
    '      type: "application/ld+json",',
    `      innerHTML: JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", name: "${name}", url: siteUrl }),`,
    "    },",
    "  ],",
    "});",
    "",
    "useSeoMeta({",
    `  description: "${seo.description}",`,
    '  ogType: "website",',
    `  ogSiteName: "${name}",`,
    "  ogUrl: () => `${siteUrl}${route.path}`,",
    '  twitterCard: "summary",',
    "});",
  ];
}

function nuxtConfig(model: ProjectModel): string {
  const { plugins, modules, config, configImports } = model.bundler;
  const imports = [...plugins.map((p) => p.import), ...configImports];
  return file([
    ...renderImports(imports),
    ...(imports.length ? [""] : []),
    "// https://nuxt.com/docs/api/configuration/nuxt-config",
    "export default defineNuxtConfig({",
    '  compatibilityDate: "2025-07-15",',
    "  devtools: { enabled: true },",
    ...(modules.length ? [`  modules: ${JSON.stringify(modules)},`] : []),
    `  css: ["~/assets/css/main.${styleExt(model)}"],`,
    ...(plugins.length
      ? [`  vite: { plugins: [${plugins.map((p) => p.call).join(", ")}] },`]
      : []),
    ...Object.entries(config).map(
      ([key, value]) => `  ${key}: ${jsLiteral(value)},`,
    ),
    "});",
  ]);
}

/**
 * `@nuxt/test-utils`' Vitest project: tests under `test/nuxt` run inside a booted Nuxt app
 * (happy-dom), so auto-imports, plugins and modules such as Pinia work as in the app.
 */
function vitestConfig(testing: TestingSpec, ctx: Ctx): string {
  const block = testBlock(testing, "nuxt");
  return file([
    'import { defineVitestProject } from "@nuxt/test-utils/config";',
    'import { defineConfig } from "vitest/config";',
    "",
    "export default defineConfig({",
    "  test: {",
    "    projects: [",
    "      await defineVitestProject({",
    "        test: {",
    '          name: "nuxt",',
    `          include: ["test/nuxt/*.{test,spec}.${ctx.ext.script}"],`,
    ...block.slice(1, -1).map((line) => `        ${line}`),
    "        },",
    "      }),",
    "    ],",
    "  },",
    "});",
  ]);
}
