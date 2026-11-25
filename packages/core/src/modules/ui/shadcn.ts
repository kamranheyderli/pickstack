import { file, json } from "../../engine/code";
import type { Module } from "../../types";
import { components, themeCss } from "./templates/shadcn-react";

/**
 * shadcn/ui: what `shadcn init` (radix-nova) + `add card` write, vendored. Components live in
 * `components/ui` behind the `@/` alias, which Next already has; React (Vite) gets it through
 * tsconfig/jsconfig `paths` (`model.bundler.srcAlias`).
 */
export const shadcn: Module = {
  id: "shadcn",
  name: "shadcn/ui",
  category: "ui",
  description: {
    az: "Layihəyə kopyalanan Tailwind komponentləri (Radix əsaslı).",
    en: "Tailwind components copied into your project (built on Radix).",
  },
  frameworks: ["react", "next"],
  requires: ["tailwind"],
  apply(model, ctx) {
    const next = ctx.selection.framework === "next";
    const root = next ? "" : "src/";
    const x = ctx.ext.component;
    for (const dep of [
      "class-variance-authority",
      "cn",
      "radix-ui",
      "shadcn",
      "tw-animate-css",
    ]) {
      model.pkg.dependencies.add(dep);
    }
    if (!next) model.bundler.srcAlias = "@";

    model.styles.globalImports.push(
      '@import "tw-animate-css";',
      '@import "shadcn/tailwind.css";',
    );
    model.styles.globalCss.push(themeCss.trimEnd());

    model.files.set(
      `${root}lib/utils.${ctx.ext.script}`,
      file(['export { cn } from "cn";']),
    );
    for (const [name, source] of Object.entries(components)) {
      model.files.set(
        `${root}components/ui/${name}.${x}`,
        ctx.isTs ? source.ts : source.js,
      );
    }
    model.files.set(
      "components.json",
      json({
        $schema: "https://ui.shadcn.com/schema.json",
        style: "radix-nova",
        rsc: next,
        tsx: ctx.isTs,
        tailwind: {
          config: "",
          css: next ? "app/globals.css" : "src/index.css",
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
          hooks: "@/hooks",
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
        '<Card className="w-64 text-center">',
        "  <CardHeader>",
        "    <CardTitle>Counter</CardTitle>",
        "  </CardHeader>",
        "  <CardContent>",
        `    <p className="text-5xl font-bold tabular-nums">{${c.value}}</p>`,
        "  </CardContent>",
        '  <CardFooter className="justify-center gap-3">',
        `    <Button variant="outline" onClick={${c.decrement}}>`,
        "      -1",
        "    </Button>",
        `    <Button onClick={${c.increment}}>+1</Button>`,
        "  </CardFooter>",
        "</Card>",
      ],
    };
    model.readme.stack.push("shadcn/ui");
    model.readme.sections.push({
      title: "UI components",
      body: `shadcn/ui components live in \`${root}components/ui\`. Add more with \`npx shadcn@latest add <component>\`.`,
    });
  },
};
