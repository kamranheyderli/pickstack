import { file, indent, renderImports } from "../../engine/code";
import type { CounterSpec, Ctx, ProjectModel, RouteSpec } from "../../types";
import { aboutText, type DemoClasses } from "./demo";

/** JSX demo components shared by React, Preact and Solid; they differ in the class attribute. */
export type ClassAttr = "className" | "class";

export function jsxCounter(
  spec: CounterSpec,
  cls: DemoClasses,
  attr: ClassAttr,
): string {
  return file([
    ...renderImports(spec.imports),
    ...(spec.imports.length ? [""] : []),
    "export default function Counter() {",
    ...indent(spec.setup),
    ...(spec.setup.length ? [""] : []),
    "  return (",
    `    <div ${attr}="${cls.card}">`,
    `      <p ${attr}="${cls.count}">{${spec.value}}</p>`,
    `      <div ${attr}="${cls.row}">`,
    `        <button ${attr}="${cls.btn}" onClick={${spec.decrement}}>`,
    "          -1",
    "        </button>",
    `        <button ${attr}="${cls.btn}" onClick={${spec.increment}}>`,
    "          +1",
    "        </button>",
    "      </div>",
    "    </div>",
    "  );",
    "}",
  ]);
}

export function jsxSingleApp(
  ctx: Ctx,
  cls: DemoClasses,
  attr: ClassAttr,
): string {
  return file([
    'import Counter from "./components/Counter";',
    "",
    "export default function App() {",
    "  return (",
    `    <main ${attr}="${cls.main}">`,
    `      <h1 ${attr}="${cls.title}">${ctx.selection.name}</h1>`,
    "      <Counter />",
    "    </main>",
    "  );",
    "}",
  ]);
}

/** App with nav links and the route outlet; a layout when the router owns the root. */
export function jsxRoutedApp(
  model: ProjectModel,
  cls: DemoClasses,
  attr: ClassAttr,
): string {
  const routing = model.routing;
  if (!routing) throw new Error("jsxRoutedApp requires model.routing");
  const links = model.routes.flatMap((route) => [
    `<${routing.link} ${attr}="${cls.link}" ${routing.linkProp}="${route.path}">`,
    `  ${route.label}`,
    `</${routing.link}>`,
  ]);
  const pageImports = routing.root
    ? []
    : model.routes.map((r) => ({
        from: `./pages/${r.component}`,
        default: r.component,
      }));

  return file([
    ...renderImports([
      ...routing.imports,
      ...(routing.root?.layoutImports ?? []),
      ...pageImports,
    ]),
    "",
    `export default function App(${routing.root?.layoutParam ?? ""}) {`,
    "  return (",
    `    <main ${attr}="${cls.main}">`,
    `      <nav ${attr}="${cls.nav}">`,
    ...indent(links, 4),
    "      </nav>",
    ...indent(routing.outlet, 3),
    "    </main>",
    "  );",
    "}",
  ]);
}

export function jsxPage(
  route: RouteSpec,
  model: ProjectModel,
  ctx: Ctx,
  cls: DemoClasses,
  attr: ClassAttr,
): string {
  if (route.page === "home") {
    return file([
      'import Counter from "../components/Counter";',
      "",
      `export default function ${route.component}() {`,
      "  return (",
      `    <section ${attr}="${cls.page}">`,
      `      <h1 ${attr}="${cls.title}">${ctx.selection.name}</h1>`,
      "      <Counter />",
      "    </section>",
      "  );",
      "}",
    ]);
  }
  return file([
    `export default function ${route.component}() {`,
    "  return (",
    `    <section ${attr}="${cls.page}">`,
    `      <h1 ${attr}="${cls.title}">${route.label}</h1>`,
    `      <p ${attr}="${cls.text}">${aboutText(model)}</p>`,
    "    </section>",
    "  );",
    "}",
  ]);
}

/** Writes Counter, App and (when routed) one page per route under `src/`. */
export function writeJsxDemo(
  model: ProjectModel,
  ctx: Ctx,
  cls: DemoClasses,
  attr: ClassAttr,
  fallbackCounter: CounterSpec,
): void {
  const x = ctx.ext.component;
  model.files.set(
    `src/components/Counter.${x}`,
    jsxCounter(model.demo.counter ?? fallbackCounter, cls, attr),
  );
  if (model.routing && model.routes.length) {
    for (const route of model.routes) {
      model.files.set(
        `src/pages/${route.component}.${x}`,
        jsxPage(route, model, ctx, cls, attr),
      );
    }
    model.files.set(`src/App.${x}`, jsxRoutedApp(model, cls, attr));
  } else {
    model.files.set(`src/App.${x}`, jsxSingleApp(ctx, cls, attr));
  }
}

/** `vite.config` with the model's plugins and nothing else. */
export function plainViteConfig(model: ProjectModel): string {
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

/** Wraps `inner` in the model's providers, outermost (lowest `order`) first. */
export function wrapProviders(model: ProjectModel, inner: string[]): string[] {
  const providers = [...model.entry.providers].sort(
    (a, b) => a.order - b.order,
  );
  let tree = inner;
  for (const provider of [...providers].reverse()) {
    tree = [provider.open, ...indent(tree), provider.close];
  }
  return tree;
}
