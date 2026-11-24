import { file, indent, renderImports } from "../../engine/code";
import { createModel } from "../../engine/model";
import type {
  CounterSpec,
  Ctx,
  FrameworkAdapter,
  ProjectModel,
} from "../../types";
import { demoClasses, globalCss, styleExt } from "../shared/demo";
import { viteEnv } from "../shared/env";
import { spaIndexHtml } from "../shared/index-html";
import { wrapProviders, writeJsxDemo } from "../shared/jsx";
import { jsxCounterTest } from "../shared/testing";
import { plainViteConfig } from "../shared/vite";
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
    model.readme.stack.push(
      "Preact",
      "Vite",
      ...(ctx.isTs ? ["TypeScript"] : []),
    );
    return model;
  },

  render(model, ctx) {
    model.files.set(
      "index.html",
      spaIndexHtml(model, ctx, "app", `main.${ctx.ext.component}`),
    );
    model.files.set(
      `vite.config.${ctx.ext.script}`,
      plainViteConfig(model, ctx),
    );
    model.files.set(`src/main.${ctx.ext.component}`, entry(model, ctx));
    model.files.set(`src/index.${styleExt(model)}`, globalCss(model));
    writeJsxDemo(model, ctx, demoClasses(model), "class", localCounter);
    if (model.testing) {
      model.files.set(
        `src/components/Counter.test.${ctx.ext.component}`,
        jsxCounterTest(model, "preact"),
      );
    }
  },
};

function entry(model: ProjectModel, ctx: Ctx): string {
  const tree = wrapProviders(model, ["<App />"]);
  const target = `document.getElementById("app")${ctx.isTs ? "!" : ""}`;
  return file([
    ...renderImports([
      { from: "preact", named: ["render"] },
      { from: "./App", default: "App" },
      { from: `./index.${styleExt(model)}` },
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
