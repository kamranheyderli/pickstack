import { file } from "../../engine/code";
import type { Module } from "../../types";

export const vueRouter: Module = {
  id: "vue-router",
  name: "Vue Router",
  category: "routing",
  description: {
    az: "Vue üçün rəsmi router; səhifələr src/views-dadır.",
    en: "The official Vue router; pages live in src/views.",
    ru: "Официальный роутер Vue; страницы лежат в src/views.",
  },
  frameworks: ["vue"],
  order: 20,
  apply(model, ctx) {
    model.pkg.dependencies.add("vue-router");
    model.routes.push(
      { path: "/", label: "Home", component: "HomeView", page: "home" },
      { path: "/about", label: "About", component: "AboutView", page: "about" },
    );
    const [home, ...lazy] = model.routes;
    model.files.set(
      `src/router/index.${ctx.ext.script}`,
      file([
        'import { createRouter, createWebHistory } from "vue-router";',
        ...(home
          ? [`import ${home.component} from "../views/${home.component}.vue";`]
          : []),
        "",
        "const router = createRouter({",
        "  history: createWebHistory(import.meta.env.BASE_URL),",
        "  routes: [",
        ...(home ? routeEntry(home.path, home.page, home.component) : []),
        // Other pages are code-split and loaded on first visit.
        ...lazy.flatMap((r) =>
          routeEntry(
            r.path,
            r.page,
            `() => import("../views/${r.component}.vue")`,
          ),
        ),
        "  ],",
        "});",
        "",
        "export default router;",
      ]),
    );
    model.entry.imports.push({ from: "./router", default: "router" });
    model.entry.appUses.push("router");
    model.routing = {
      imports: [{ from: "vue-router", named: ["RouterLink", "RouterView"] }],
      link: "RouterLink",
      linkProp: "to",
      outlet: ["<RouterView />"],
    };
    model.readme.stack.push("Vue Router");
  },
};

function routeEntry(path: string, name: string, component: string): string[] {
  return [
    "    {",
    `      path: "${path}",`,
    `      name: "${name}",`,
    `      component: ${component},`,
    "    },",
  ];
}
