import { file, indent, json, renderImports } from "../../engine/code";
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
import {
  hostFederationPlugin,
  hostServerOptions,
  remoteDeclarations,
} from "../shared/federation";
import { jsxCounterTest } from "../shared/testing";
import { writePostcssConfig } from "../shared/postcss";
import { plainViteConfig } from "../shared/vite";

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
    }

    model.bundler.plugins.push({
      import: { from: "@vitejs/plugin-react", default: "react" },
      call: "react()",
    });
    model.entry.imports.push(
      { from: "react", named: ["StrictMode"] },
      { from: "react-dom/client", named: ["createRoot"] },
      { from: "./App", default: "App" },
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
    writePostcssConfig(model);
    // A `src` alias (shadcn/ui): Vite 8 reads tsconfig paths itself; jsconfig needs an alias.
    const alias = model.bundler.srcAlias;
    const paths = alias ? { [`${alias}/*`]: ["./src/*"] } : null;
    if (ctx.isTs) {
      model.files.set("tsconfig.json", json(tsconfig(paths)));
    } else if (paths) {
      model.files.set(
        "jsconfig.json",
        json({ compilerOptions: { paths }, include: ["src"] }),
      );
    }
    const aliasOptions = !alias
      ? []
      : ctx.isTs
        ? ["resolve: { tsconfigPaths: true },"]
        : [
            `resolve: { alias: { "${alias}": fileURLToPath(new URL("./src", import.meta.url)) } },`,
          ];
    const aliasImports =
      alias && !ctx.isTs
        ? [{ from: "node:url", named: ["fileURLToPath", "URL"] }]
        : [];
    const federation = model.federation;
    if (federation) {
      model.bundler.plugins.push(hostFederationPlugin(federation));
      if (ctx.isTs) model.files.set("src/remotes.d.ts", remoteDeclarations());
    }
    model.files.set(
      `vite.config.${ctx.ext.script}`,
      plainViteConfig(
        model,
        ctx,
        [...aliasOptions, ...(federation ? hostServerOptions(federation) : [])],
        aliasImports,
      ),
    );
    model.files.set(`src/main.${ctx.ext.component}`, mainEntry(model, ctx));
    model.files.set(`src/index.${styleExt(model)}`, globalCss(model));
    writeJsxDemo(model, ctx, demoClasses(model), "className", localCounter);
    if (model.testing) {
      model.files.set(
        `src/components/Counter.test.${ctx.ext.component}`,
        jsxCounterTest(model, "react"),
      );
    }
  },
};

function tsconfig(paths: Record<string, string[]> | null) {
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
      ...(paths ? { paths } : {}),
    },
    include: ["src", "vite.config.ts"],
  };
}

function mainEntry(model: ProjectModel, ctx: Ctx): string {
  const root = model.routing?.root;
  const tree = [
    "<StrictMode>",
    ...indent(wrapProviders(model, root ? root.tree : ["<App />"])),
    "</StrictMode>",
  ];

  return file([
    ...renderImports([
      ...model.entry.imports,
      ...(root?.imports ?? []),
      ...model.entry.providers.flatMap((p) => p.imports),
      { from: `./index.${styleExt(model)}` },
    ]),
    "",
    ...model.entry.setup,
    ...(model.entry.setup.length ? [""] : []),
    `createRoot(document.getElementById("root")${ctx.isTs ? "!" : ""}).render(`,
    ...indent(tree),
    ");",
  ]);
}
