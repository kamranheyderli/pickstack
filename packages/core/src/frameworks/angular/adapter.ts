import { file, json, renderImports } from "../../engine/code";
import { createModel } from "../../engine/model";
import { staticHeadTags } from "../shared/seo";
import type {
  CounterSpec,
  Ctx,
  FrameworkAdapter,
  ProjectModel,
} from "../../types";
import {
  aboutText,
  demoClasses,
  globalCss,
  type DemoClasses,
} from "../shared/demo";
import { angularCounterTest } from "../shared/testing";

/**
 * Local counter for Angular. Specs use Angular conventions: `setup` lines are class members,
 * `value` is a template expression, `increment`/`decrement` are `(click)` statements.
 */
const localCounter: CounterSpec = {
  imports: [{ from: "@angular/core", named: ["signal"] }],
  setup: [
    "protected readonly count = signal(0);",
    "",
    "protected increment(): void {",
    "  this.count.update((value) => value + 1);",
    "}",
    "",
    "protected decrement(): void {",
    "  this.count.update((value) => value - 1);",
    "}",
  ],
  value: "count()",
  increment: "increment()",
  decrement: "decrement()",
};

/**
 * Angular 22, following `ng new --defaults`: standalone components (`app.ts`, no `.component`
 * suffix), zoneless, `@angular/build:application`, routing always on. TypeScript only.
 */
export const angularAdapter: FrameworkAdapter = {
  id: "angular",
  name: "Angular",
  kind: "spa",
  languages: ["ts"],
  srcDir: "src",
  publicEnv: (name) => ({ key: name, read: `environment.${name}` }),
  ignore: [".angular"],
  // Matches the `*.html` → angular parser override Angular projects use with Prettier.
  formatParsers: { ".html": "angular" },
  componentExt: () => "ts",

  base() {
    const model = createModel();
    const { pkg } = model;
    for (const name of [
      "common",
      "compiler",
      "core",
      "forms",
      "platform-browser",
      "router",
    ]) {
      pkg.dependencies.add(`@angular/${name}`);
    }
    pkg.dependencies.add("rxjs").add("tslib");
    pkg.devDependencies
      .add("@angular/build")
      .add("@angular/cli")
      .add("@angular/compiler-cli")
      .add("typescript");
    pkg.scripts["ng"] = "ng";
    pkg.scripts["dev"] = "ng serve";
    pkg.scripts["build"] = "ng build";
    pkg.scripts["watch"] = "ng build --watch --configuration development";
    // ngc also type-checks templates, which plain `tsc` does not.
    pkg.scripts["typecheck"] = "ngc -p tsconfig.app.json --noEmit";

    model.files.set("public/robots.txt", file(["User-agent: *", "Disallow:"]));
    model.readme.stack.push("Angular 22", "TypeScript");
    return model;
  },

  render(model, ctx) {
    const cls = demoClasses(model);
    model.files.set("angular.json", json(angularJson(model, ctx)));
    writeTsconfigs(model);
    model.files.set("src/index.html", indexHtml(model, ctx));
    model.files.set("src/styles.css", globalCss(model));
    model.files.set(
      "src/main.ts",
      file([
        'import { bootstrapApplication } from "@angular/platform-browser";',
        'import { App } from "./app/app";',
        'import { appConfig } from "./app/app.config";',
        "",
        "bootstrapApplication(App, appConfig).catch((err) => console.error(err));",
      ]),
    );
    model.files.set(
      "src/app/app.config.ts",
      file([
        'import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from "@angular/core";',
        'import { provideRouter } from "@angular/router";',
        'import { routes } from "./app.routes";',
        "",
        "export const appConfig: ApplicationConfig = {",
        "  providers: [provideBrowserGlobalErrorListeners(), provideRouter(routes)],",
        "};",
      ]),
    );
    model.files.set(
      "src/app/app.routes.ts",
      file([
        'import type { Routes } from "@angular/router";',
        'import { Home } from "./pages/home/home";',
        "",
        "export const routes: Routes = [",
        model.seo
          ? `  { path: "", component: Home, title: "${ctx.selection.name}" },`
          : '  { path: "", component: Home },',
        "  {",
        '    path: "about",',
        ...(model.seo ? [`    title: "About | ${ctx.selection.name}",`] : []),
        '    loadComponent: () => import("./pages/about/about").then((m) => m.About),',
        "  },",
        "];",
      ]),
    );
    model.files.set(
      "src/app/app.ts",
      component(
        "app-root",
        "App",
        ["RouterLink", "RouterOutlet"],
        [{ from: "@angular/router", named: ["RouterLink", "RouterOutlet"] }],
      ),
    );
    model.files.set(
      "src/app/app.html",
      file([
        `<main class="${cls.main}">`,
        `  <nav class="${cls.nav}">`,
        `    <a class="${cls.link}" routerLink="/">Home</a>`,
        `    <a class="${cls.link}" routerLink="/about">About</a>`,
        "  </nav>",
        "  <router-outlet />",
        "</main>",
      ]),
    );
    writeCounter(model, model.demo.counter ?? localCounter, cls);
    if (model.testing) {
      model.files.set(
        "src/app/components/counter/counter.spec.ts",
        angularCounterTest(model),
      );
    }
    model.files.set(
      "src/app/pages/home/home.ts",
      component(
        "app-home",
        "Home",
        ["Counter"],
        [{ from: "../../components/counter/counter", named: ["Counter"] }],
      ),
    );
    model.files.set(
      "src/app/pages/home/home.html",
      file([
        `<section class="${cls.page}">`,
        `  <h1 class="${cls.title}">${ctx.selection.name}</h1>`,
        "  <app-counter />",
        "</section>",
      ]),
    );
    model.files.set(
      "src/app/pages/about/about.ts",
      component("app-about", "About", [], []),
    );
    model.files.set(
      "src/app/pages/about/about.html",
      file([
        `<section class="${cls.page}">`,
        `  <h1 class="${cls.title}">About</h1>`,
        `  <p class="${cls.text}">${aboutText(model)}</p>`,
        "</section>",
      ]),
    );
  },
};

/** A standalone component class with an external template next to it. */
function component(
  selector: string,
  name: string,
  uses: string[],
  imports: Parameters<typeof renderImports>[0],
  body: string[] = [],
): string {
  const templateFile = `./${name.toLowerCase()}.html`;
  return file([
    ...renderImports([
      { from: "@angular/core", named: ["Component"] },
      ...imports,
    ]),
    "",
    "@Component({",
    `  selector: "${selector}",`,
    ...(uses.length ? [`  imports: [${uses.join(", ")}],`] : []),
    `  templateUrl: "${templateFile}",`,
    "})",
    `export class ${name} {${body.length ? "" : "}"}`,
    ...(body.length ? [...body.map((l) => (l ? `  ${l}` : l)), "}"] : []),
  ]);
}

function writeCounter(
  model: ProjectModel,
  spec: CounterSpec,
  cls: DemoClasses,
): void {
  model.files.set(
    "src/app/components/counter/counter.ts",
    component("app-counter", "Counter", [], spec.imports, spec.setup),
  );
  model.files.set(
    "src/app/components/counter/counter.html",
    file([
      `<div class="${cls.card}">`,
      `  <p class="${cls.count}">{{ ${spec.value} }}</p>`,
      `  <div class="${cls.row}">`,
      `    <button type="button" class="${cls.btn}" (click)="${spec.decrement}">-1</button>`,
      `    <button type="button" class="${cls.btn}" (click)="${spec.increment}">+1</button>`,
      "  </div>",
      "</div>",
    ]),
  );
}

function indexHtml(model: ProjectModel, ctx: Ctx): string {
  return file([
    "<!doctype html>",
    '<html lang="en">',
    "  <head>",
    '    <meta charset="utf-8" />',
    `    <title>${ctx.selection.name}</title>`,
    '    <base href="/" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1" />',
    ...(model.seo
      ? staticHeadTags(ctx.selection.name, model.seo).map((l) => `    ${l}`)
      : []),
    "  </head>",
    "  <body>",
    "    <app-root></app-root>",
    "  </body>",
    "</html>",
  ]);
}

/** `ng new`'s tsconfigs; specs get `tsconfig.spec.json` when the `vitest` module is selected. */
function writeTsconfigs(model: ProjectModel): void {
  const testing = model.testing;
  const setupFiles = testing?.setupFiles ?? [];
  model.files.set("tsconfig.json", json(tsconfig(testing !== null)));
  model.files.set(
    "tsconfig.app.json",
    json({
      extends: "./tsconfig.json",
      compilerOptions: { types: [] },
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.spec.ts", ...setupFiles],
    }),
  );
  if (testing) {
    model.files.set(
      "tsconfig.spec.json",
      json({
        extends: "./tsconfig.json",
        compilerOptions: { types: ["vitest/globals"] },
        include: ["src/**/*.d.ts", "src/**/*.spec.ts", ...setupFiles],
      }),
    );
  }
}

function tsconfig(spec: boolean) {
  return {
    compileOnSave: false,
    compilerOptions: {
      strict: true,
      noImplicitOverride: true,
      noPropertyAccessFromIndexSignature: true,
      noImplicitReturns: true,
      noFallthroughCasesInSwitch: true,
      skipLibCheck: true,
      isolatedModules: true,
      experimentalDecorators: true,
      importHelpers: true,
      target: "ES2022",
      module: "preserve",
    },
    angularCompilerOptions: {
      enableI18nLegacyMessageIdFormat: false,
      strictInjectionParameters: true,
      strictInputAccessModifiers: true,
      strictTemplates: true,
    },
    files: [],
    references: [
      { path: "./tsconfig.app.json" },
      ...(spec ? [{ path: "./tsconfig.spec.json" }] : []),
    ],
  };
}

function angularJson(model: ProjectModel, ctx: Ctx) {
  const name = ctx.selection.name;
  const eslint = model.linter === "eslint";
  return {
    $schema: "./node_modules/@angular/cli/lib/config/schema.json",
    version: 1,
    cli: {
      packageManager: ctx.selection.packageManager,
      analytics: false,
      // Lets `ng generate` use angular-eslint's schematics, as `ng add angular-eslint` sets up.
      ...(eslint ? { schematicCollections: ["angular-eslint"] } : {}),
    },
    newProjectRoot: "projects",
    projects: {
      [name]: {
        projectType: "application",
        schematics: {},
        root: "",
        sourceRoot: "src",
        prefix: "app",
        architect: {
          build: {
            builder: "@angular/build:application",
            options: {
              browser: "src/main.ts",
              tsConfig: "tsconfig.app.json",
              assets: [{ glob: "**/*", input: "public" }],
              styles: ["src/styles.css"],
            },
            configurations: {
              production: {
                budgets: [
                  {
                    type: "initial",
                    maximumWarning: "500kB",
                    maximumError: "1MB",
                  },
                  {
                    type: "anyComponentStyle",
                    maximumWarning: "4kB",
                    maximumError: "8kB",
                  },
                ],
                outputHashing: "all",
              },
              development: {
                optimization: false,
                extractLicenses: false,
                sourceMap: true,
              },
            },
            defaultConfiguration: "production",
          },
          serve: {
            builder: "@angular/build:dev-server",
            configurations: {
              production: { buildTarget: `${name}:build:production` },
              development: { buildTarget: `${name}:build:development` },
            },
            defaultConfiguration: "development",
          },
          ...(model.testing
            ? {
                // Runs Vitest; `tsconfig.spec.json` is the builder's default tsConfig.
                test: {
                  builder: "@angular/build:unit-test",
                  ...(model.testing.setupFiles.length
                    ? { options: { setupFiles: model.testing.setupFiles } }
                    : {}),
                },
              }
            : {}),
          ...(eslint
            ? {
                lint: {
                  builder: "@angular-eslint/builder:lint",
                  options: {
                    lintFilePatterns: ["src/**/*.ts", "src/**/*.html"],
                  },
                },
              }
            : {}),
        },
      },
    },
  };
}
