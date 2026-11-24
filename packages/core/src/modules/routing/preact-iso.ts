import type { Module } from "../../types";

export const preactIso: Module = {
  id: "preact-iso",
  name: "preact-iso",
  category: "routing",
  description: {
    az: "Preact komandasının yüngül routeri; adi <a> linkləri ilə işləyir.",
    en: "The Preact team's lightweight router; works with plain <a> links.",
  },
  frameworks: ["preact"],
  order: 20,
  apply(model) {
    model.pkg.dependencies.add("preact-iso");
    // Required peer of preact-iso; listed explicitly because yarn does not install peers.
    model.pkg.dependencies.add("preact-render-to-string");
    model.routes.push(
      { path: "/", label: "Home", component: "Home", page: "home" },
      { path: "/about", label: "About", component: "About", page: "about" },
    );
    model.entry.providers.push({
      id: "location",
      open: "<LocationProvider>",
      close: "</LocationProvider>",
      imports: [{ from: "preact-iso", named: ["LocationProvider"] }],
      order: 20,
    });
    model.routing = {
      imports: [{ from: "preact-iso", named: ["Route", "Router"] }],
      link: "a",
      linkProp: "href",
      outlet: [
        "<Router>",
        ...model.routes.map(
          (r) => `  <Route path="${r.path}" component={${r.component}} />`,
        ),
        "</Router>",
      ],
    };
    model.readme.stack.push("preact-iso");
  },
};
