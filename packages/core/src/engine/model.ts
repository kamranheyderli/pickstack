import type { ProjectModel } from "../types";

export function createModel(): ProjectModel {
  return {
    files: new Map(),
    pkg: {
      dependencies: new Set(),
      devDependencies: new Set(),
      scripts: {},
      fields: {},
    },
    entry: { imports: [], providers: [], appUses: [], setup: [], head: [] },
    bundler: { plugins: [], modules: [], config: {}, integrations: [] },
    styles: {
      globalImports: [],
      globalCss: [],
      mode: "plain",
      sass: false,
      preload: [],
    },
    routes: [],
    routing: null,
    demo: { counter: null, view: null },
    seo: null,
    linter: null,
    formatter: null,
    monorepo: null,
    federation: null,
    testing: null,
    readme: { stack: [], sections: [] },
    warnings: [],
  };
}
