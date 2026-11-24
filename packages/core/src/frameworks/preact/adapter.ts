import { file, fill, indent, renderImports } from "../../engine/code";
import { createModel } from "../../engine/model";
import type {
  CounterSpec,
  Ctx,
  FrameworkAdapter,
  ProjectModel,
} from "../../types";
import { demoClasses, globalCss } from "../shared/demo";
import { viteEnv } from "../shared/env";
import { plainViteConfig, wrapProviders, writeJsxDemo } from "../shared/jsx";
import indexHtml from "../shared/templates/index-html";
import { writeViteTsconfigs } from "../shared/vite-ts";

const localCounter: CounterSpec = {
  imports: [{ from: "preact/hooks", named: ["useState"] }],
  setup: ["const [count, setCount] = useState(0);"],
  value: "count",
  increment: "() => setCount((value) => value + 1)",
  decrement: "() => setCount((value) => value - 1)",
};

/** Preact 11 on Vite, following create-vite's `preact` / `preact-ts` templates. */
export const preactAdapter: FrameworkAdapter = {
  id: "preact",
  name: "Preact",
  kind: "spa",
  languages: ["js", "ts"],
  srcDir: "src",
  publicEnv: viteEnv,
  componentExt: (language) => (language === "ts" ? "tsx" : "jsx"),

  base(ctx) {
    const model = createModel();
    const { pkg } = model;
    pkg.dependencies.add("preact");
    pkg.devDependencies.add("vite").add("@preact/preset-vite");
    pkg.scripts["dev"] = "vite";
    pkg.scripts["build"] = ctx.isTs ? "tsc -b && vite build" : "vite build";
    pkg.scripts["preview"] = "vite preview";
    if (ctx.isTs) {
      pkg.devDependencies.add("typescript").add("@types/node");
      pkg.scripts["typecheck"] = "tsc -b";
      writeViteTsconfigs(model, {
        paths: {
          react: ["./node_modules/preact/compat/"],
          "react-dom": ["./node_modules/preact/compat/"],
        },
        jsx: "react-jsx",
        jsxImportSource: "preact",
      });
    }
    model.bundler.plugins.push({
      import: { from: "@preact/preset-vite", default: "preact" },
      call: "preact()",
    });
    model.files.set(
      "index.html",
      fill(indexHtml, {
        name: ctx.selection.name,
        mountId: "app",
        entry: `main.${ctx.ext.component}`,
      }),
    );
    model.readme.stack.push(
      "Preact",
      "Vite",
      ...(ctx.isTs ? ["TypeScript"] : []),
    );
    return model;
  },

  render(model, ctx) {
    model.files.set(`vite.config.${ctx.ext.script}`, plainViteConfig(model));
    model.files.set(`src/main.${ctx.ext.component}`, entry(model, ctx));
    model.files.set("src/index.css", globalCss(model));
    writeJsxDemo(model, ctx, demoClasses(model), "class", localCounter);
  },
};

function entry(model: ProjectModel, ctx: Ctx): string {
  const tree = wrapProviders(model, ["<App />"]);
  const target = `document.getElementById("app")${ctx.isTs ? "!" : ""}`;
  return file([
    ...renderImports([
      { from: "preact", named: ["render"] },
      { from: "./App", default: "App" },
      { from: "./index.css" },
      ...model.entry.imports,
      ...model.entry.providers.flatMap((p) => p.imports),
    ]),
    "",
    ...(tree.length === 1
      ? [`render(${tree[0]}, ${target});`]
      : [
          "render(",
          ...indent([...tree.slice(0, -1), `${tree.at(-1)},`]),
          `  ${target},`,
          ");",
        ]),
  ]);
}
