import { routeTreeFile } from "../../frameworks/shared/tanstack";
import type { Module } from "../../types";

/**
 * TanStack Router with file-based routing, its recommended style: route files in
 * `src/routes/`, the Vite plugin keeping `routeTree.gen` in sync, and the router registered
 * for type-safe links. The plugin goes before the framework plugin, as its docs require.
 */
export const tanstackRouter: Module = {
  id: "tanstack-router",
  name: "TanStack Router",
  category: "routing",
  description: {
    az: "Tip-təhlükəsiz, fayl əsaslı routing.",
    en: "Type-safe, file-based routing.",
  },
  frameworks: ["react", "solid"],
  order: 20,
  apply(model, ctx) {
    const solid = ctx.selection.framework === "solid";
    const pkg = solid ? "@tanstack/solid-router" : "@tanstack/react-router";
    model.pkg.dependencies.add(pkg);
    model.pkg.devDependencies.add("@tanstack/router-plugin");
    model.bundler.plugins.unshift({
      import: {
        from: "@tanstack/router-plugin/vite",
        named: ["tanstackRouter"],
      },
      call: `tanstackRouter({ target: "${solid ? "solid" : "react"}", autoCodeSplitting: true${ctx.isTs ? "" : ", disableTypes: true"} })`,
    });
    model.routes.push(
      { path: "/", label: "Home", component: "Home", page: "home" },
      { path: "/about", label: "About", component: "About", page: "about" },
    );
    // The route files replace App.
    model.entry.imports = model.entry.imports.filter((i) => i.from !== "./App");
    model.entry.setup.push(
      "const router = createRouter({ routeTree });",
      ...(ctx.isTs
        ? [
            "",
            `declare module "${pkg}" {`,
            "  interface Register {",
            "    router: typeof router;",
            "  }",
            "}",
          ]
        : []),
    );
    model.routing = {
      imports: [],
      link: "Link",
      linkProp: "to",
      outlet: [],
      root: {
        imports: [
          { from: pkg, named: ["createRouter", "RouterProvider"] },
          { from: "./routeTree.gen", named: ["routeTree"] },
        ],
        tree: ["<RouterProvider router={router} />"],
        layoutParam: "",
        layoutImports: [],
      },
      fileRoutes: pkg,
    };
    model.verbatim.add(routeTreeFile(ctx));
    model.readme.stack.push("TanStack Router");
    model.readme.sections.push({
      title: "Routing",
      body: "Add a page by creating a file in `src/routes/`; the TanStack Router Vite plugin regenerates `src/routeTree.gen` (commit it, don't edit it).",
    });
  },
};
