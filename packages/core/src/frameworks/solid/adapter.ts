import { file, indent, renderImports } from "../../engine/code";
import { createModel } from "../../engine/model";
import type {
  CounterSpec,
  Ctx,
  FrameworkAdapter,
  ProjectModel,
} from "../../types";
import { demoClasses, globalCss } from "../shared/demo";
import { viteEnv } from "../shared/env";
import { spaIndexHtml } from "../shared/index-html";
import { plainViteConfig, wrapProviders, writeJsxDemo } from "../shared/jsx";
import { writeViteTsconfigs } from "../shared/vite-ts";

const localCounter: CounterSpec = {
  imports: [{ from: "solid-js", named: ["createSignal"] }],
  setup: ["const [count, setCount] = createSignal(0);"],
  value: "count()",
  increment: "() => setCount((value) => value + 1)",
  decrement: "() => setCount((value) => value - 1)",
};

/** SolidJS 1.x on Vite, following create-vite's `solid` / `solid-ts` templates. */
export const solidAdapter: FrameworkAdapter = {
  id: "solid",
  name: "SolidJS",
  kind: "spa",
  languages: ["js", "ts"],
  srcDir: "src",
  publicEnv: viteEnv,
  componentExt: (language) => (language === "ts" ? "tsx" : "jsx"),

  base(ctx) {
    const model = createModel();
    const { pkg } = model;
    pkg.dependencies.add("solid-js");
    pkg.devDependencies.add("vite").add("vite-plugin-solid");
    pkg.scripts["dev"] = "vite";
    pkg.scripts["build"] = ctx.isTs ? "tsc -b && vite build" : "vite build";
    pkg.scripts["preview"] = "vite preview";
    if (ctx.isTs) {
      pkg.devDependencies.add("typescript").add("@types/node");
      pkg.scripts["typecheck"] = "tsc -b";
      writeViteTsconfigs(model, {
        jsx: "preserve",
        jsxImportSource: "solid-js",
      });
    }
    model.bundler.plugins.push({
      import: { from: "vite-plugin-solid", default: "solid" },
      call: "solid()",
    });
    model.readme.stack.push(
      "SolidJS",
      "Vite",
      ...(ctx.isTs ? ["TypeScript"] : []),
    );
    return model;
  },

  render(model, ctx) {
    model.files.set(
      "index.html",
      spaIndexHtml(model, ctx, "root", `index.${ctx.ext.component}`),
    );
    model.files.set(`vite.config.${ctx.ext.script}`, plainViteConfig(model));
    model.files.set(`src/index.${ctx.ext.component}`, entry(model, ctx));
    model.files.set("src/index.css", globalCss(model));
    writeJsxDemo(model, ctx, demoClasses(model), "class", localCounter);
  },
};

function entry(model: ProjectModel, ctx: Ctx): string {
  const root = model.routing?.root;
  const tree = wrapProviders(model, root ? root.tree : ["<App />"]);
  const body =
    tree.length === 1
      ? [`render(() => ${tree[0]}, root${ctx.isTs ? "!" : ""});`]
      : [
          "render(",
          "  () => (",
          ...indent(tree, 2),
          "  ),",
          `  root${ctx.isTs ? "!" : ""},`,
          ");",
        ];
  return file([
    "/* @refresh reload */",
    ...renderImports([
      { from: "solid-js/web", named: ["render"] },
      { from: "./App", default: "App" },
      { from: "./index.css" },
      ...(root?.imports ?? []),
      ...model.entry.imports,
      ...model.entry.providers.flatMap((p) => p.imports),
    ]),
    "",
    'const root = document.getElementById("root");',
    "",
    ...body,
  ]);
}
