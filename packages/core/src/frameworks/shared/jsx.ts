import { file, indent, renderImports } from "../../engine/code";
import type {
  CounterSpec,
  CounterView,
  Ctx,
  ImportSpec,
  ProjectModel,
  RouteSpec,
} from "../../types";
import { aboutText, type DemoClasses } from "./demo";

/** JSX demo components shared by React, Preact and Solid; they differ in the class attribute. */
export type ClassAttr = "className" | "class";

export function jsxCounter(
  spec: CounterSpec,
  cls: DemoClasses,
  attr: ClassAttr,
  view: CounterView | null = null,
): string {
  if (view) {
    const imports = [...view.imports, ...spec.imports];
    return file([
      ...renderImports(imports),
      ...(imports.length ? [""] : []),
      "export default function Counter() {",
      ...indent(spec.setup),
      ...(spec.setup.length ? [""] : []),
      "  return (",
      ...indent(view.markup(spec), 2),
      "  );",
      "}",
    ]);
  }
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
    `        <button type="button" ${attr}="${cls.btn}" onClick={${spec.decrement}}>`,
    "          -1",
    "        </button>",
    `        <button type="button" ${attr}="${cls.btn}" onClick={${spec.increment}}>`,
    "          +1",
    "        </button>",
    "      </div>",
    "    </div>",
    "  );",
    "}",
  ]);
}

/** The Module Federation remote counter (see `federation.ts`), loaded lazily from `remote`. */
export const remoteCounter = {
  imports: [{ from: "react", named: ["lazy", "Suspense"] }] as ImportSpec[],
  setup: ['const RemoteCounter = lazy(() => import("remote/Counter"));'],
  element: (attr: string, textClass: string) => [
    `<Suspense fallback={<p ${attr}="${textClass}">Loading the remote counter…</p>}>`,
    "  <RemoteCounter />",
    "</Suspense>",
  ],
};

/** Imports, module setup and JSX after `<Counter />` that render the remote counter, if any. */
function remoteParts(model: ProjectModel, cls: DemoClasses, attr: ClassAttr) {
  return model.federation
    ? {
        imports: remoteCounter.imports,
        setup: [...remoteCounter.setup, ""],
        element: remoteCounter.element(attr, cls.text),
      }
    : { imports: [], setup: [], element: [] };
}

export function jsxSingleApp(
  model: ProjectModel,
  ctx: Ctx,
  cls: DemoClasses,
  attr: ClassAttr,
): string {
  const remote = remoteParts(model, cls, attr);
  return file([
    ...renderImports([
      ...remote.imports,
      { from: "./components/Counter", default: "Counter" },
    ]),
    "",
    ...remote.setup,
    "export default function App() {",
    "  return (",
    `    <main ${attr}="${cls.main}">`,
    `      <h1 ${attr}="${cls.title}">${ctx.selection.name}</h1>`,
    "      <Counter />",
    ...indent(remote.element, 3),
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
    const remote = remoteParts(model, cls, attr);
    return file([
      ...renderImports([
        ...remote.imports,
        { from: "../components/Counter", default: "Counter" },
      ]),
      "",
      ...remote.setup,
      `export default function ${route.component}() {`,
      "  return (",
      `    <section ${attr}="${cls.page}">`,
      `      <h1 ${attr}="${cls.title}">${ctx.selection.name}</h1>`,
      "      <Counter />",
      ...indent(remote.element, 3),
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
    jsxCounter(
      model.demo.counter ?? fallbackCounter,
      cls,
      attr,
      model.demo.view,
    ),
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
    model.files.set(`src/App.${x}`, jsxSingleApp(model, ctx, cls, attr));
  }
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
