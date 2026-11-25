import { file, json } from "../../engine/code";
import type { Module } from "../../types";
import { components, themeCss } from "./templates/shadcn-vue";

/**
 * shadcn-vue: what `shadcn-vue init` + `add button card` write (2.9.0, style "reka-nova"),
 * vendored. Components live in `components/ui` and use the `@/` alias, which Vue's scaffold and
 * Nuxt already have; Nuxt registers them through `shadcn-nuxt`.
 */
export const shadcnVue: Module = {
  id: "shadcn-vue",
  name: "shadcn-vue",
  category: "ui",
  description: {
    az: "Layihəyə kopyalanan Tailwind komponentləri (Reka UI əsaslı).",
    en: "Tailwind components copied into your project (built on Reka UI).",
  },
  frameworks: ["vue", "nuxt"],
  requires: ["tailwind"],
  apply(model, ctx) {
    const nuxt = ctx.selection.framework === "nuxt";
    const root = nuxt ? "app" : "src";
    const x = ctx.ext.script;
    for (const dep of [
      "reka-ui",
      "class-variance-authority",
      "cn",
      "shadcn-vue",
      "tw-animate-css",
    ]) {
      model.pkg.dependencies.add(dep);
    }
    if (nuxt) {
      model.pkg.devDependencies.add("shadcn-nuxt");
      model.bundler.modules.push("shadcn-nuxt");
      model.bundler.config["shadcn"] = {
        prefix: "",
        componentDir: "@/components/ui",
      };
    }

    model.styles.globalImports.push(
      '@import "tw-animate-css";',
      '@import "shadcn-vue/tailwind.css";',
    );
    model.styles.globalCss.push(themeCss.trimEnd());

    model.files.set(
      `${root}/lib/utils.${x}`,
      file(['export { cn } from "cn";']),
    );
    for (const [path, source] of Object.entries(components)) {
      model.files.set(
        `${root}/components/ui/${path.endsWith("/index") ? `${path}.${x}` : path}`,
        ctx.isTs ? source.ts : source.js,
      );
    }
    model.files.set(
      "components.json",
      json({
        $schema: "https://shadcn-vue.com/schema.json",
        style: "reka-nova",
        typescript: ctx.isTs,
        tailwind: {
          config: "",
          css: nuxt ? "app/assets/css/main.css" : "src/assets/main.css",
          baseColor: "neutral",
          cssVariables: true,
          prefix: "",
        },
        iconLibrary: "lucide",
        aliases: {
          components: "@/components",
          utils: "@/lib/utils",
          ui: "@/components/ui",
          lib: "@/lib",
          composables: "@/composables",
        },
      }),
    );

    model.demo.view = {
      imports: [
        { from: "@/components/ui/button", named: ["Button"] },
        {
          from: "@/components/ui/card",
          named: [
            "Card",
            "CardContent",
            "CardFooter",
            "CardHeader",
            "CardTitle",
          ],
        },
      ],
      markup: (c) => [
        '<Card class="w-72 text-center">',
        "  <CardHeader>",
        "    <CardTitle>Counter</CardTitle>",
        "  </CardHeader>",
        "  <CardContent>",
        `    <p class="text-5xl font-bold tabular-nums">{{ ${c.value} }}</p>`,
        "  </CardContent>",
        '  <CardFooter class="justify-center gap-3">',
        `    <Button variant="outline" @click="${c.decrement}">-1</Button>`,
        `    <Button @click="${c.increment}">+1</Button>`,
        "  </CardFooter>",
        "</Card>",
      ],
    };
    model.readme.stack.push("shadcn-vue");
    model.readme.sections.push({
      title: "UI components",
      body: `shadcn-vue components live in \`${root}/components/ui\`. Add more with \`npx shadcn-vue@latest add <component>\`.`,
    });
  },
};
