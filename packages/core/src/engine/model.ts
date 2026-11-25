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
    entry: {
      imports: [],
      providers: [],
      appUses: [],
      setup: [],
      head: [],
      htmlAttrs: [],
    },
    bundler: {
      plugins: [],
      modules: [],
      config: {},
      configImports: [],
      postcss: {},
      srcAlias: null,
      integrations: [],
    },
    styles: {
      globalImports: [],
      globalCss: [],
      mode: "plain",
      sass: false,
      preload: [],
    },
    routes: [],
    routing: null,
    demo: { counter: null, view: null, widgets: [], stackJson: null },
    seo: null,
    linter: null,
    formatter: null,
    monorepo: null,
    federation: null,
    server: null,
    repoFiles: new Map(),
    gitignore: [],
    verbatim: new Set(),
    testing: null,
    readme: { stack: [], sections: [] },
    warnings: [],
  };
}
