import { file, fill, indent, json, renderImports } from "../../engine/code";
import { createModel } from "../../engine/model";
import type {
  CounterSpec,
  Ctx,
  FrameworkAdapter,
  ProjectModel,
  RouteSpec,
} from "../../types";
import indexHtml from "./templates/index-html";
import plainCss from "./templates/plain-css";

type ClassKey =
  | "main"
  | "title"
  | "nav"
  | "link"
  | "page"
  | "text"
  | "card"
  | "count"
  | "row"
  | "btn";

const tailwindClasses: Record<ClassKey, string> = {
  main: "flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-50 p-8 text-slate-900",
  title: "text-3xl font-bold tracking-tight",
  nav: "flex gap-4 text-sm font-medium",
  link: "text-slate-600 hover:text-slate-900",
  page: "flex flex-col items-center gap-6",
  text: "max-w-md text-center text-slate-600",
  card: "rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200",
  count: "text-5xl font-bold tabular-nums",
  row: "mt-6 flex justify-center gap-3",
  btn: "rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-700",
};

const plainClasses: Record<ClassKey, string> = {
  main: "app",
  title: "title",
  nav: "nav",
  link: "link",
  page: "page",
  text: "text",
  card: "card",
  count: "count",
  row: "row",
  btn: "btn",
};

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
    model.files.set(
      "index.html",
      fill(indexHtml, { name: ctx.selection.name, ext: ctx.ext.component }),
    );
    model.readme.stack.push(
      "React 19",
      "Vite",
      ...(ctx.isTs ? ["TypeScript"] : []),
    );
    return model;
  },

  render(model, ctx) {
    const cls =
      model.styles.mode === "tailwind" ? tailwindClasses : plainClasses;
    const x = ctx.ext.component;

    model.files.set(`vite.config.${ctx.ext.script}`, viteConfig(model));
    model.files.set(`src/main.${x}`, mainEntry(model, ctx));
    model.files.set("src/index.css", globalCss(model));
    model.files.set(
      `src/components/Counter.${x}`,
      counter(model.demo.counter ?? localCounter, cls),
    );

    if (model.routing && model.routes.length) {
      for (const route of model.routes) {
        model.files.set(
          `src/pages/${route.component}.${x}`,
          page(route, model, ctx, cls),
        );
      }
      model.files.set(`src/App.${x}`, routedApp(model, cls));
    } else {
      model.files.set(`src/App.${x}`, singleApp(ctx, cls));
    }
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

function viteConfig(model: ProjectModel): string {
  const plugins = model.bundler.plugins;
  return file([
    ...renderImports([
      { from: "vite", named: ["defineConfig"] },
      ...plugins.map((p) => p.import),
    ]),
    "",
    "export default defineConfig({",
    `  plugins: [${plugins.map((p) => p.call).join(", ")}],`,
    "});",
  ]);
}

function mainEntry(model: ProjectModel, ctx: Ctx): string {
  const providers = [...model.entry.providers].sort(
    (a, b) => a.order - b.order,
  );
  let tree = ["<App />"];
  for (const provider of [...providers].reverse()) {
    tree = [provider.open, ...indent(tree), provider.close];
  }
  tree = ["<StrictMode>", ...indent(tree), "</StrictMode>"];

  return file([
    ...renderImports([
      ...model.entry.imports,
      ...providers.flatMap((p) => p.imports),
    ]),
    "",
    ...model.entry.setup,
    ...(model.entry.setup.length ? [""] : []),
    `createRoot(document.getElementById("root")${ctx.isTs ? "!" : ""}).render(`,
    ...indent(tree),
    ");",
  ]);
}

function globalCss(model: ProjectModel): string {
  const blocks = [
    model.styles.globalImports.join("\n"),
    model.styles.mode === "plain" ? plainCss.trimEnd() : "",
    model.styles.globalCss.join("\n\n"),
  ].filter(Boolean);
  return blocks.join("\n\n") + "\n";
}

function counter(spec: CounterSpec, cls: Record<ClassKey, string>): string {
  return file([
    ...renderImports(spec.imports),
    "",
    "export default function Counter() {",
    ...indent(spec.setup),
    "",
    "  return (",
    `    <div className="${cls.card}">`,
    `      <p className="${cls.count}">{${spec.value}}</p>`,
    `      <div className="${cls.row}">`,
    `        <button className="${cls.btn}" onClick={${spec.decrement}}>`,
    "          -1",
    "        </button>",
    `        <button className="${cls.btn}" onClick={${spec.increment}}>`,
    "          +1",
    "        </button>",
    "      </div>",
    "    </div>",
    "  );",
    "}",
  ]);
}

function singleApp(ctx: Ctx, cls: Record<ClassKey, string>): string {
  return file([
    'import Counter from "./components/Counter";',
    "",
    "export default function App() {",
    "  return (",
    `    <main className="${cls.main}">`,
    `      <h1 className="${cls.title}">${ctx.selection.name}</h1>`,
    "      <Counter />",
    "    </main>",
    "  );",
    "}",
  ]);
}

function routedApp(model: ProjectModel, cls: Record<ClassKey, string>): string {
  const routing = model.routing;
  if (!routing) throw new Error("routedApp requires model.routing");
  const links = model.routes.flatMap((route) => [
    `<${routing.link} className="${cls.link}" ${routing.linkProp}="${route.path}">`,
    `  ${route.label}`,
    `</${routing.link}>`,
  ]);

  return file([
    ...renderImports([
      ...routing.imports,
      ...model.routes.map((r) => ({
        from: `./pages/${r.component}`,
        default: r.component,
      })),
    ]),
    "",
    "export default function App() {",
    "  return (",
    `    <main className="${cls.main}">`,
    `      <nav className="${cls.nav}">`,
    ...indent(links, 4),
    "      </nav>",
    ...indent(routing.outlet, 3),
    "    </main>",
    "  );",
    "}",
  ]);
}

function page(
  route: RouteSpec,
  model: ProjectModel,
  ctx: Ctx,
  cls: Record<ClassKey, string>,
): string {
  if (route.page === "home") {
    return file([
      'import Counter from "../components/Counter";',
      "",
      `export default function ${route.component}() {`,
      "  return (",
      `    <section className="${cls.page}">`,
      `      <h1 className="${cls.title}">${ctx.selection.name}</h1>`,
      "      <Counter />",
      "    </section>",
      "  );",
      "}",
    ]);
  }
  return file([
    `export default function ${route.component}() {`,
    "  return (",
    `    <section className="${cls.page}">`,
    `      <h1 className="${cls.title}">${route.label}</h1>`,
    `      <p className="${cls.text}">Built with ${model.readme.stack.join(", ")}.</p>`,
    "    </section>",
    "  );",
    "}",
  ]);
}
