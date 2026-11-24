import type { Module } from "../../types";

export const reactRouter: Module = {
  id: "react-router",
  name: "React Router",
  category: "routing",
  description: {
    az: "Deklarativ client-side routing.",
    en: "Declarative client-side routing.",
  },
  frameworks: ["react"],
  order: 20,
  apply(model) {
    model.pkg.dependencies.add("react-router");
    model.routes.push(
      { path: "/", label: "Home", component: "Home", page: "home" },
      { path: "/about", label: "About", component: "About", page: "about" },
    );
    model.entry.providers.push({
      id: "router",
      open: "<BrowserRouter>",
      close: "</BrowserRouter>",
      imports: [{ from: "react-router", named: ["BrowserRouter"] }],
      order: 20,
    });
    model.routing = {
      imports: [{ from: "react-router", named: ["Link", "Route", "Routes"] }],
      link: "Link",
      linkProp: "to",
      outlet: [
        "<Routes>",
        ...model.routes.map(
          (route) =>
            `  <Route path="${route.path}" element={<${route.component} />} />`,
        ),
        "</Routes>",
      ],
    };
    model.readme.stack.push("React Router");
  },
};
