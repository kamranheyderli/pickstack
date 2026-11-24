import { file, fill, indent, json, renderImports } from "../../engine/code";
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

const localCounter: CounterSpec = {
  imports: [{ from: "react", named: ["useState"] }],
  setup: ["const [count, setCount] = useState(0);"],
  value: "count",
  increment: "() => setCount((n) => n + 1)",
  decrement: "() => setCount((n) => n - 1)",
};

export const reactAdapter: FrameworkAdapter = {
  id: "react",
  name: "React",
  kind: "spa",
  languages: ["js", "ts"],
  srcDir: "src",
  publicEnv: viteEnv,
  componentExt: (language) => (language === "ts" ? "tsx" : "jsx"),

  base(ctx) {
    const model = createModel();
    const { pkg } = model;

    pkg.dependencies.add("react").add("react-dom");
    pkg.devDependencies.add("vite").add("@vitejs/plugin-react");
    pkg.scripts["dev"] = "vite";
    pkg.scripts["build"] = ctx.isTs
      ? "tsc --noEmit && vite build"
      : "vite build";
    pkg.scripts["preview"] = "vite preview";

    if (ctx.isTs) {
      pkg.devDependencies
        .add("typescript")
        .add("@types/react")
        .add("@types/react-dom");
      pkg.scripts["typecheck"] = "tsc --noEmit";
      model.files.set("tsconfig.json", json(tsconfig()));
    }

    model.bundler.plugins.push({
      import: { from: "@vitejs/plugin-react", default: "react" },
      call: "react()",
    });
    model.entry.imports.push(
      { from: "react", named: ["StrictMode"] },
      { from: "react-dom/client", named: ["createRoot"] },
      { from: "./App", default: "App" },
      { from: "./index.css" },
    );
    model.readme.stack.push(
      "React 19",
      "Vite",
      ...(ctx.isTs ? ["TypeScript"] : []),
    );
    return model;
  },

  render(model, ctx) {
    model.files.set(
      "index.html",
      spaIndexHtml(model, ctx, "root", `main.${ctx.ext.component}`),
    );
    model.files.set(`vite.config.${ctx.ext.script}`, plainViteConfig(model));
    model.files.set(`src/main.${ctx.ext.component}`, mainEntry(model, ctx));
    model.files.set("src/index.css", globalCss(model));
    writeJsxDemo(model, ctx, demoClasses(model), "className", localCounter);
  },
};

function tsconfig() {
  return {
    compilerOptions: {
      target: "ES2022",
      lib: ["ES2022", "DOM", "DOM.Iterable"],
      module: "ESNext",
      moduleResolution: "bundler",
      jsx: "react-jsx",
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      isolatedModules: true,
      verbatimModuleSyntax: true,
      types: ["vite/client"],
    },
    include: ["src", "vite.config.ts"],
  };
}

function mainEntry(model: ProjectModel, ctx: Ctx): string {
  const tree = [
    "<StrictMode>",
    ...indent(wrapProviders(model, ["<App />"])),
    "</StrictMode>",
  ];

  return file([
    ...renderImports([
      ...model.entry.imports,
      ...model.entry.providers.flatMap((p) => p.imports),
    ]),
    "",
    ...model.entry.setup,
    ...(model.entry.setup.length ? [""] : []),
    `createRoot(document.getElementById("root")${ctx.isTs ? "!" : ""}).render(`,
    ...indent(tree),
    ");",
  ]);
}
