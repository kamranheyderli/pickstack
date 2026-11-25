import type { Module } from "../../types";

export const solidRouter: Module = {
  id: "solid-router",
  name: "Solid Router",
  category: "routing",
  description: {
    az: "SolidJS üçün rəsmi router; App kök layout rolunu oynayır.",
    en: "The official SolidJS router; App acts as the root layout.",
  },
  frameworks: ["solid"],
  order: 20,
  apply(model, ctx) {
    model.pkg.dependencies.add("@solidjs/router");
    model.routes.push(
      { path: "/", label: "Home", component: "Home", page: "home" },
      { path: "/about", label: "About", component: "About", page: "about" },
    );
    model.routing = {
      imports: [{ from: "@solidjs/router", named: ["A"] }],
      link: "A",
      linkProp: "href",
      outlet: ["{props.children}"],
      root: {
        imports: [
          { from: "@solidjs/router", named: ["Route", "Router"] },
          ...model.routes.map((r) => ({
            from: `./pages/${r.component}`,
            default: r.component,
          })),
        ],
        tree: [
          "<Router root={App}>",
          ...model.routes.map(
            (r) => `  <Route path="${r.path}" component={${r.component}} />`,
          ),
          "</Router>",
        ],
        layoutParam: ctx.isTs ? "props: RouteSectionProps" : "props",
        layoutImports: ctx.isTs
          ? [{ from: "@solidjs/router", types: ["RouteSectionProps"] }]
          : [],
      },
    };
    model.readme.stack.push("Solid Router");
  },
};
