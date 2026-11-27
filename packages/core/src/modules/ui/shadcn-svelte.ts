import { json } from "../../engine/code";
import type { Module } from "../../types";
import {
  components,
  themeCss,
  utilsJs,
  utilsTs,
} from "./templates/shadcn-svelte";

const UI = "#lib/components/ui";

/**
 * shadcn-svelte: what `shadcn-svelte init` + `add button card` write, vendored. Components
 * live in the project (`src/lib/components/ui`) and are styled with Tailwind theme tokens.
 * Aliases use `#lib` (package.json `imports`) in both Svelte and SvelteKit, so the SPA needs
 * no Vite or tsconfig alias; `components.json` records it for later `add` commands.
 */
export const shadcnSvelte: Module = {
  id: "shadcn-svelte",
  name: "shadcn-svelte",
  category: "ui",
  description: {
    az: "Layihəyə kopyalanan, Bits UI əsaslı Tailwind komponentləri.",
    en: "Tailwind components copied into your project (built on Bits UI).",
    ru: "Компоненты на Tailwind, копируемые в ваш проект (на базе Bits UI).",
  },
  frameworks: ["svelte", "sveltekit"],
  requires: ["tailwind"],
  apply(model, ctx) {
    const kit = ctx.selection.framework === "sveltekit";
    const x = ctx.ext.script;
    for (const dep of [
      "shadcn-svelte",
      "tailwind-variants",
      "cn",
      "tw-animate-css",
      "@fontsource-variable/inter",
    ]) {
      model.pkg.devDependencies.add(dep);
    }
    if (!kit) model.pkg.fields["imports"] = { "#lib/*": "./src/lib/*" };

    model.styles.globalImports.push(
      '@import "tw-animate-css";',
      '@import "shadcn-svelte/tailwind.css";',
      '@import "@fontsource-variable/inter";',
    );
    model.styles.globalCss.push(themeCss.trimEnd());

    model.files.set(`src/lib/utils.${x}`, ctx.isTs ? utilsTs : utilsJs);
    for (const [path, source] of Object.entries(components)) {
      const content = ctx.isTs ? source.ts : source.js;
      model.files.set(
        `src/lib/${path.endsWith("/index") ? `${path}.${x}` : path}`,
        content,
      );
    }
    model.files.set(
      "components.json",
      json({
        $schema: "https://shadcn-svelte.com/schema.json",
        tailwind: {
          css: kit ? "src/routes/layout.css" : "src/app.css",
          baseColor: "neutral",
        },
        aliases: {
          components: "#lib/components",
          utils: "#lib/utils",
          ui: UI,
          hooks: "#lib/hooks",
          lib: "#lib",
        },
        typescript: ctx.isTs,
        registry: "https://shadcn-svelte.com/registry",
        style: "vega",
        iconLibrary: "lucide",
        menuColor: "default",
        menuAccent: "subtle",
      }),
    );

    model.demo.view = {
      imports: [
        { from: `${UI}/button/index.js`, named: ["Button"] },
        {
          from: `${UI}/card/index.js`,
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
        '<Card class="w-64 text-center">',
        "  <CardHeader>",
        "    <CardTitle>Counter</CardTitle>",
        "  </CardHeader>",
        "  <CardContent>",
        `    <p class="text-5xl font-bold tabular-nums">{${c.value}}</p>`,
        "  </CardContent>",
        '  <CardFooter class="justify-center gap-3">',
        `    <Button variant="outline" onclick={${c.decrement}}>-1</Button>`,
        `    <Button onclick={${c.increment}}>+1</Button>`,
        "  </CardFooter>",
        "</Card>",
      ],
    };
    model.readme.stack.push("shadcn-svelte");
    model.readme.sections.push({
      title: "UI components",
      body: "shadcn-svelte components live in `src/lib/components/ui`. Add more with `npx shadcn-svelte@latest add <component>` (aliases are set in `components.json`).",
    });
  },
};
