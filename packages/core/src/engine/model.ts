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
    entry: { imports: [], providers: [], appUses: [], setup: [] },
    bundler: { plugins: [], modules: [], config: {}, integrations: [] },
    styles: { globalImports: [], globalCss: [], mode: "plain" },
    routes: [],
    routing: null,
    demo: { counter: null },
    seo: null,
    linter: null,
    readme: { stack: [], sections: [] },
    warnings: [],
  };
}
