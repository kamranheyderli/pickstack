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
    bundler: { plugins: [] },
    styles: { globalImports: [], globalCss: [], mode: "plain" },
    routes: [],
    routing: null,
    demo: { counter: null },
    readme: { stack: [], sections: [] },
    warnings: [],
  };
}
